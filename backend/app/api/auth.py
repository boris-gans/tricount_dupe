from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from logging import Logger

from app.db.session import get_db
from app.db.schemas import UserOut, UserCreate, UserSummaryOut, UserIn, AuthOut, UserLogin
from app.db.models import User
from app.core.exceptions import AuthJwtCreationError, AuthCredentialsError
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
    try:
        hashed_pw = hash_password(user.pw)
        new_user = User(name=user.name, email=user.email, pw=hashed_pw)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        if not new_user:
            logger.error("user signup failed", extra={"email": user.email})
            raise AuthCredentialsError

        token = create_access_token(user_id=new_user.id)
        if not token:
            raise AuthJwtCreationError

        logger.info("user signup", extra={"user_id": new_user.id})
        return {"access_token": token, "user": new_user} #AuthOut
    except AuthCredentialsError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password"
        )
    except AuthJwtCreationError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_BAD_REQUEST,
            detail="Error creating user token"
        )
    except Exception as e:
        db.rollback()
        logger.error(f"error in create group endpoint: {e}")
        raise HTTPException(status_code=500, detail="Unexpected server error")

# login
@router.post("/login", response_model=AuthOut)
def login(
    user: UserLogin,
    db: Session = Depends(get_db),
    logger: Logger = Depends(get_request_logger),
):
    try:
        logged_user = db.query(User).filter(User.email == user.email).first()

        if not logged_user or not verify_password(user.pw, logged_user.pw): #hashed password second
            logger.warning("user login failed", extra={"email": user.email})
            raise AuthCredentialsError
        token = create_access_token(user_id=logged_user.id)
        if not token:
            raise AuthJwtCreationError
        logger.info("user login", extra={"user_id": logged_user.id})

        return {"access_token": token, "user": logged_user} #AuthOut
    
    except AuthCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password"
        )
    except AuthJwtCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_BAD_REQUEST,
            detail="Error creating user token"
        )
    except Exception as e:
        logger.error(f"error in create group endpoint: {e}")
        raise HTTPException(status_code=500, detail="Unexpected server error")