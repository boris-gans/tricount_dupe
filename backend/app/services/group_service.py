# logic for creating groups; eg. only unique users per group, max amount, etc.
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, exists
from fastapi import Depends, HTTPException, status

from app.db.models import Group, Expense, ExpenseSplit, User, GroupMembers
from app.db.schemas import GroupOut, GroupShortOut, UserSummaryOut
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

def check_join_group(group_name: str, group_pw: str, db: Session) -> int:
    try:
        group = (
            db.query(Group)
            .filter(Group.name == group_name)
            .filter(Group.pw == group_pw)
            .first()
        )

        if group:
            return group.id

    except Exception as e:
        logger.error(f"Error checking join group: {e}")
        raise


def add_user_group(group_id: int, user: User, db: Session) -> GroupOut:
    try:
        group = (
            db.query(Group)
            .filter(Group.id == group_id)
            .first()
        )
        new_member = GroupMembers(user=user, group=group)
        group.member_associations.append(new_member)

        db.add(new_member)
        db.commit()
        db.refresh(new_member)
        return get_full_group_details(group_id=group_id, db=db)
    except Exception as e:
        logger.error(f"Error adding user to group: {e}")
        raise


def get_short_group_details(user_id: int, db: Session) -> list[GroupShortOut]:
    try:
        logger.debug("group list request received")
        group_list = (
            db.query(Group)
            .join(Group.members)
            .filter(User.id == user_id)
            .all()
        )
        logger.debug("group short list loaded", extra={"User_id": user_id})
        return group_list
    except Exception as e:
        logger.error(f"Error getting short group list: {e}")
        raise

def calculate_balance(user: User, group_id: int, db: Session):
    try:
        print()

        #total paid by user_id in this group
        total_paid = (
            db.query(func.coalesce(func.sum(Expense.amount), 0.0))
            .filter(Expense.group_id == group_id, Expense.paid_by_id == user.id)
            .scalar()
        )

        #total owed by the user in this group (splits)
        total_owed = (
            db.query(func.coalesce(func.sum(ExpenseSplit.amount), 0.0))
            .join(Expense)
            .filter(Expense.group_id == group_id, ExpenseSplit.user_id == user.id)
            .scalar()
        )

        balance = float(total_paid) - float(total_owed)
        return balance

    except Exception as e:
        logger.error(f"Error calculating balances: {e}")
        raise



