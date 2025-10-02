from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session # type: ignore
from logging import Logger

from app.db.session import get_db
from app.db.schemas import UserOut, UserCreate, UserSummaryOut, UserIn, AuthOut, UserLogin
from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.config import settings
from app.core.logger import get_request_logger


router = APIRouter()

# signup
@router.post("/signup", response_model=AuthOut)
def signup(
    user: UserCreate,
    db: Session = Depends(get_db),
    logger: Logger = Depends(get_request_logger),
):
    hashed_pw = hash_password(user.pw)
    new_user = User(name=user.name, email=user.email, pw=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if not new_user:
        logger.warning("user signup failed", extra={"email": user.email})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user_id=new_user.id)

    logger.info("user signup", extra={"user_id": new_user.id})
    return {"access_token": token, "user": new_user} #AuthOut

# login
@router.post("/login", response_model=AuthOut)
def login(
    user: UserLogin,
    db: Session = Depends(get_db),
    logger: Logger = Depends(get_request_logger),
):
    logged_user = db.query(User).filter(User.email == user.email).first()

    if not logged_user or not verify_password(user.pw, logged_user.pw): #db password second (hashed)
        logger.warning("user login failed", extra={"email": user.email})
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user_id=logged_user.id)

    logger.info("user login", extra={"user_id": logged_user.id})
    return {"access_token": token, "user": logged_user} #AuthOut
