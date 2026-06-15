import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "movielens.db"

import math

def pearson(user_ratings, other_user_ratings):
    common_movies = set(user_ratings.keys()) & set(other_user_ratings.keys())

    if len(common_movies) < 2:
        return 0

    user_avg = sum(user_ratings[m] for m in common_movies) / len(common_movies)
    other_avg = sum(other_user_ratings[m] for m in common_movies) / len(common_movies)

    numerator = sum(
        (user_ratings[m] - user_avg) * (other_user_ratings[m] - other_avg)
        for m in common_movies
    )

    user_part = sum((user_ratings[m] - user_avg) ** 2 for m in common_movies)
    other_part = sum((other_user_ratings[m] - other_avg) ** 2 for m in common_movies)

    denominator = math.sqrt(user_part) * math.sqrt(other_part)

    if denominator == 0:
        return 0

    return numerator / denominator

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/movielens/api/movies")
def search_movies(search: str = ""):
    conn = get_db()
    movies = conn.execute(
        "SELECT * FROM movies WHERE LOWER(title) LIKE LOWER(?)",
        (f"%{search}%",)
    ).fetchall()
    conn.close()

    return {
        "status": "success",
        "movies": [dict(movie) for movie in movies]
    }

@app.get("/movielens/api/ratings/{movieId}")
def get_ratings(movieId: int):
    conn = get_db()
    ratings = conn.execute(
        "SELECT * FROM ratings WHERE movieId = ?",
        (movieId,)
    ).fetchall()

    avg_row = conn.execute(
        "SELECT AVG(rating) AS averageRating FROM ratings WHERE movieId = ?",
        (movieId,)
    ).fetchone()

    conn.close()

    return {
        "status": "success",
        "ratings": [dict(rating) for rating in ratings],
        "averageRating": avg_row["averageRating"]
    }

class MovieCreate(BaseModel):
    title: str
    genres: str

@app.post("/movielens/api/movies")
def add_movie(movie: MovieCreate):
    conn = get_db()

    result = conn.execute("SELECT MAX(movieId) FROM movies").fetchone()
    new_movie_id = result[0] + 1

    addtodb = conn.execute(
        "INSERT INTO movies (movieId, title, genres) VALUES (?, ?, ?)",
        (new_movie_id,movie.title, movie.genres)
    )
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "movieId": new_movie_id
    }

class UserRating(BaseModel):
    movieId: int
    rating: float

class RecommendationInput(BaseModel):
    ratings: list[UserRating]

@app.post("/movielens/api/recommendations")
def get_recommendations(recommendation: RecommendationInput):

    user_ratings = {r.movieId: r.rating for r in recommendation.ratings}
    movie_ids = list(user_ratings.keys())
    placeholders = ",".join(["?"] * len(movie_ids))

    conn = get_db()
    
    users = conn.execute(f"SELECT * FROM ratings WHERE movieId IN ({placeholders})", movie_ids).fetchall()

    other_users = {}

    for row in users:
        if row["userId"] not in other_users:
            other_users[row["userId"]] = {}

        other_users[row["userId"]][row["movieId"]] = row["rating"]

    similarities = []

    for user_id, other_user_ratings in other_users.items():
        sim = pearson(user_ratings, other_user_ratings)

        if sim > 0:
            similarities.append((user_id, sim))

    similarities.sort(key=lambda x: x[1], reverse=True)
    top_users = similarities[:20]

    ###print(json.dumps(similarities, indent=4))

    top_user_ids = [user_id for user_id, sim in top_users]

    if not top_user_ids:
        conn.close()
        return {
            "status": "success",
            "recommendations": []
        }

    user_placeholders = ",".join(["?"] * len(top_user_ids))
    movie_placeholders = ",".join(["?"] * len(movie_ids))

    candidate_rows = conn.execute(
        f"""
        SELECT r.userId, r.movieId, r.rating, m.title, m.genres
        FROM ratings r
        JOIN movies m ON r.movieId = m.movieId
        WHERE r.userId IN ({user_placeholders})
        AND r.movieId NOT IN ({movie_placeholders})
        """,
        top_user_ids + movie_ids
    ).fetchall()

    print(len(candidate_rows))
    
    candidate_movies = {}

    for row in candidate_rows:
        movie_id = row["movieId"]

        if movie_id not in candidate_movies:
            candidate_movies[movie_id] = {
                "title": row["title"],
                "genres": row["genres"],
                "ratings": {}
            }

        candidate_movies[movie_id]["ratings"][row["userId"]] = row["rating"]

    ###calculating predictions
    user_avg = sum(user_ratings.values()) / len(user_ratings)
    sim_by_user = dict(top_users)

    avg_rows = conn.execute(
        f"""
        SELECT userId, AVG(rating) AS avg_rating
        FROM ratings
        WHERE userId IN ({user_placeholders})
        GROUP BY userId
        """,
        top_user_ids
    ).fetchall()

    user_averages = {}

    for row in avg_rows:
        user_averages[row["userId"]] = row["avg_rating"]

    recommendations = []

    for movie_id, movie_data in candidate_movies.items():
        numerator = 0
        denominator = 0

        for user_id, rating in movie_data["ratings"].items():
            sim = sim_by_user[user_id]
            other_user_avg = user_averages[user_id]

            numerator += sim * (rating - other_user_avg)
            denominator += abs(sim)

        if denominator != 0:
            predicted_rating = user_avg + numerator / denominator
            ###rating can exceed 5 or be less than 0.5 because of the weights against the other user's average rating,so we clamp it
            predicted_rating = max(0.5, min(5.0, predicted_rating))

            recommendations.append({
                "movieId": movie_id,
                "title": movie_data["title"],
                "genres": movie_data["genres"],
                "predictedRating": round(predicted_rating, 2)
            })

    recommendations.sort(key=lambda x: x["predictedRating"], reverse=True)

    conn.close()

    return {
        "status": "success",
        "recommendations": recommendations[:10]
    }