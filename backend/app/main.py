# ENTRY POINT; init app, middleware + routers only

from fastapi import FastAPI, Request # type: ignore
from fastapi.responses import JSONResponse # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from sqlalchemy.exc import IntegrityError # type: ignore
# fix linting (issue w interpreter): # type: ignore
from app.db.session import get_db
from app.api import users, groups, expenses, auth


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

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])



# @app.get("/")
# def read_root():
#     return {"message": "running"}

@app.get("/db")
def init_db():
    session = get_db()

    if session is not None:
        return {"message": "db up"}
    else:
        return {"message": "db down"}

# global exception handler; any IntegrityError (data/database) will only raise this response
@app.exception_handler(IntegrityError)
def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=400,
        content={"detail": "Database integrity error"}
    )


# PostgreSQL connection
# use sqlalchemy for schema def and easy interactions
# basic math and CRUD operations will live on seperate classes
# want to leave main.py open for authentication + jwt stuff if I choose to expand