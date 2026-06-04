import sqlite3
import pandas as pd

DB_NAME = "movielens.db"

conn = sqlite3.connect(DB_NAME)

movies = pd.read_csv("ml-latest-small/movies.csv")
ratings = pd.read_csv("ml-latest-small/ratings.csv")
tags = pd.read_csv("ml-latest-small/tags.csv")

movies.to_sql("movies", conn, if_exists="replace", index=False)
ratings.to_sql("ratings", conn, if_exists="replace", index=False)
tags.to_sql("tags", conn, if_exists="replace", index=False)

conn.close()

print("Database created successfully.")
