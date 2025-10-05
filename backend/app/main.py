from fastapi import FastAPI, Request

from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from app.core.logger import setup_logging
from app.api import groups, expenses, auth


app_logger = setup_logging()

app = FastAPI()
app.state.logger = app_logger

origins = [

    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])


# global exception handler; any IntegrityError (data/database) will only raise this response
@app.exception_handler(IntegrityError)
def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=400,
        content={"detail": "Database integrity error"}
    )