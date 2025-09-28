# translate pure HTTP --> user class

from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore
from logging import Logger

from app.db.session import get_db
from app.db.schemas import UserOut, UserCreate, UserSummaryOut, UserIn
from app.db.models import User
from app.core.logger import get_request_logger

router = APIRouter()

@router.post("/", response_model=UserOut)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    logger: Logger = Depends(get_request_logger),
):
    logger.info("creating user", extra={"email": user.email})
    new_user = User(**user.dict())
    db.add(new_user)
    db.commit()
    db.refresh(new_user) #to get id
    logger.debug("user created", extra={"user_id": new_user.id})
    return new_user

# query db
# @router.post("/overview", response_model=UserSummaryOut)
# def get_user_summary(user: UserIn, db: Session = Depends(get_db)):
#     overview = 
