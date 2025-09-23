from fastapi import APIRouter, Depends, HTTPException # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.db.session import get_db
from app.db.schemas import UserOut, UserCreate, UserSummaryOut, UserIn, AuthOut, UserLogin
from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.config import settings


router = APIRouter()

# signup
@router.post("/signup", response_model=AuthOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    hashed_pw = hash_password(user.pw)
    print("PW VS HASH:", user.pw, hashed_pw)
    new_user = User(name=user.name, email=user.email, pw=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(user_id=new_user.id)

    return {"access_token": token, "user": new_user}

# login
@router.post("/login", response_model=AuthOut)
def login(user_input: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_input.email).first()

    if not user or not verify_password(user_input.pw, user.pw):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user_id=user.id)

    return {"access_token": token, "user": user} #AuthOut schema