# translates pure http --> group class

from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore

from app.db.session import get_db
from app.db.schemas import GroupCreate, GroupJoinIn, GroupOut, GroupShortOut
from app.db.models import Group, User
from app.services.group_service import get_group_details, check_join_group
from app.core.security import get_current_user


router = APIRouter()

@router.post("/create", response_model=GroupOut)
def create_group(
    group: GroupCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), #from jwt
):
    print("GROUP RECEIVED:", group)
    print("USER RECEIVED:", current_user.name) #possible that get_current_user is broken
    new_group = Group(pw=group.group_pw, name=group.name, emoji=group.emoji)
    new_group.members.append(current_user)

    db.add(new_group)
    db.commit()
    db.refresh(new_group)



    print("GROUP CREATED:", new_group.id)

    return get_group_details(new_group.id)

@router.post("/join", response_model=GroupOut)
def join_group(group: GroupJoinIn, db: Session = Depends(get_db)):
    return check_join_group(group_id=group.group_id, group_pw=group.group_pw)
