# translates pure http --> group class

from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore
from logging import Logger

from app.db.session import get_db
from app.db.schemas import GroupCreate, GroupJoinIn, GroupOut, GroupShortOut
from app.db.models import Group, User, GroupMembers
from app.services.group_service import get_group_details, check_join_group
from app.core.security import get_current_user
from app.core.logger import get_request_logger


router = APIRouter()

@router.post("/create", response_model=GroupOut)
def create_group(
    group: GroupCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user), #from jwt
    logger: Logger = Depends(get_request_logger),
):
    try:
        logger.debug("group create payload received", extra={"group": group.dict(), "user_id": current_user.id})
        new_group = Group(pw=group.group_pw, name=group.name, emoji=group.emoji)

        # ensure the creator is attached through the association table
        new_member = GroupMembers(user=current_user, group=new_group)
        new_group.member_associations.append(new_member)

        db.add(new_group)
        db.commit()
        db.refresh(new_group)



        logger.info("group created", extra={"group_id": new_group.id})

        return get_group_details(new_group.id, db=db)
    except Exception as e:
        db.rollback()
        raise

@router.post("/join", response_model=GroupOut)
def join_group(
    group: GroupJoinIn,
    db: Session = Depends(get_db),
    logger: Logger = Depends(get_request_logger),
):
    logger.debug("join group attempt", extra={"group_id": group.group_id})
    return check_join_group(group_id=group.group_id, group_pw=group.group_pw)
