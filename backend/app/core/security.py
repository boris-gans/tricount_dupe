# for later; jwt + pw hashing
from fastapi import HTTPException, Depends
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt

from app.core.config import settings
from app.db.session import get_db
from app.db.models import User


#inits
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer() 


# basic hashing
def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed_password: str):
    return pwd_context.verify(password, hashed_password)

# jwt
def create_access_token(user_id: str | int):
    expire_d = settings.jwt_expiration_minutes
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=expire_d)
    to_encode = {"exp": expire, "sub": str(user_id)} #always gonna use user_id for subject
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def decode_access_token(token: str):
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
# dependency for jwt
def get_current_user(
        creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
        db: Session = Depends(get_db)
) -> User:
    payload = decode_access_token(creds.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = db.query(User).get(int(user_id)) #return matching user
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User #since this is for internal use only, fine to return entire user object
                # just need to make sure i respond with UserOut