# translates pure http --> group class

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.schemas import GroupCreate, GroupOut, GroupShortOut
from app.db.models import Group

router = APIRouter()

@router.post("/", response_model=GroupOut)
def create_group(group: GroupCreate, db: Session = Depends(get_db)):
    new_group = Group(**GroupCreate)
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return new_group