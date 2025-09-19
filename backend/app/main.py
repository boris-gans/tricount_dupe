from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# fix linting

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

@app.get("/")
def read_root():
    return {"message": "running"}

# PostgreSQL connection
# use sqlalchemy for schema def and easy interactions
# basic math and CRUD operations will live on seperate classes
# want to leave main.py open for authentication + jwt stuff if I choose to expand