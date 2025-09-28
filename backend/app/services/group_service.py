# logic for creating groups; eg. only unique users per group, max amount, etc.
from sqlalchemy.orm import Session, joinedload
from fastapi import Depends, HTTPException, status

from app.db.models import Group, Expense, ExpenseSplit, User
from app.db.schemas import GroupOut, GroupShortOut
from app.db.session import get_db
from app.core.logger import get_module_logger


logger = get_module_logger(__name__)


def get_full_group_details(group_id: int, db: Session) -> GroupOut:
    try:
        group_details = (
            db.query(Group)
            .options(
                joinedload(Group.members),
                joinedload(Group.expenses)
                # .joinedload(Expense.paid_by)
                .joinedload(Expense.splits)
                .joinedload(ExpenseSplit.user)    
            )
            .filter(Group.id == group_id)
            .first()
        )

        logger.debug("group details loaded", extra={"group_id": group_id})

        if not group_details:
            logger.warning("group lookup failed", extra={"group_id": group_id})
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found",
            )

        return group_details
    except Exception as e:
        logger.error(f"Error loading group details: {e}")
        raise

def check_join_group(group_id: int, group_pw: str, db: Session) -> GroupOut:
    try:
        group = (
            db.query(Group)
            .filter(Group.id == group_id)
            .filter(Group.pw == group_pw)
            .first()
        )

        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found",
            )
        return get_full_group_details(group_id=group.id, db=db)
    except Exception as e:
        logger.error(f"Error checking join group: {e}")
        raise

def get_short_group_details(user_id: int, db: Session) -> GroupShortOut:
    try:
        group_list = (
            db.query(Group)
            .options(
                joinedload(Group.members)
            )
            .filter(User.id == user_id)
            .all()
        )
        logger.debug("group short list loaded", extra={"User_id": user_id})
        return group_list
    except Exception as e:
        logger.error(f"Error getting short group list: {e}")
        raise




