# ENTRY POINT; init app, middleware + routers only

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# fix linting
from app.db.session import get_db


app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# @app.get("/")
# def read_root():
#     return {"message": "running"}

@app.get("/")
def init_db():
    if get_db():
        return {"message": "db up"}
    else:
        return {"message": "db down"}


# PostgreSQL connection
# use sqlalchemy for schema def and easy interactions
# basic math and CRUD operations will live on seperate classes
# want to leave main.py open for authentication + jwt stuff if I choose to expand