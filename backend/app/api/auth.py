from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.db.session import get_db
from app.db.schemas import UserOut, UserCreate, UserSummaryOut, UserIn, UserLogin
from app.db.models import User

router = APIRouter()

# signup
@router.post("/signup", response_model=UserOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    new_user = User(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# login
@router.post("/login", response_model=UserOut)
def login(user: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.pw != user.pw:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user