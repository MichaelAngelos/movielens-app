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
    conn.close()

    return {
        "status": "success",
        "ratings": [dict(rating) for rating in ratings]
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