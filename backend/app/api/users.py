# translate pure HTTP --> user class

from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.db.session import get_db
from app.db.schemas import UserOut, UserCreate, UserSummaryOut, UserIn
from app.db.models import User

router = APIRouter()

@router.post("/", response_model=UserOut)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    new_user = User(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user) #to get id
    return new_user

# query db
# @router.post("/overview", response_model=UserSummaryOut)
# def get_user_summary(user: UserIn, db: Session = Depends(get_db)):
#     overview = 