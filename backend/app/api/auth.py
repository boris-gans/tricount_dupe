from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.db.session import get_db
from app.db.schemas import UserOut, UserCreate, UserSummaryOut, UserIn, UserLogin
from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.config import settings


router = APIRouter()

# signup
@router.post("/signup", response_model=UserOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    new_user = User(name=user.name, email=user.email, pw=hash_password(user.pw))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# login
@router.post("/login", response_model=UserOut)
def login(user_input: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user.email).first()
    if not user or not verify_password(user_input.pw, user.pw):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return user