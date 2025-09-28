# translates pure http --> group class

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from logging import Logger
from typing import List

from app.db.session import get_db
from app.db.schemas import GroupCreate, GroupJoinIn, GroupOut, GroupShortOut, UserSummaryOut, GroupBalancesOut
from app.db.models import Group, User, GroupMembers
from app.services.group_service import get_full_group_details, check_join_group, get_short_group_details, calculate_balance, add_user_group
from app.core.security import get_current_user, get_current_group, GroupContext
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

        group_details = get_full_group_details(new_group.id, db=db)
        # calc balances
        for member in group_details.members:
            member.balance = calculate_balance(user=member, group_id=group_details.id, db=db)

        return group_details

    except Exception as e:
        db.rollback()
        raise

@router.post("/join", response_model=GroupOut)
def join_group(
    group: GroupJoinIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    logger: Logger = Depends(get_request_logger),
):
    try:
        logger.debug("join group attempt", extra={"group_name": group.group_name})
        group_id = check_join_group(group_name=group.group_name, group_pw=group.group_pw, db=db)
        if group_id:
            joined_group_details = add_user_group(group_id=group_id, user=current_user, db=db)

            for member in joined_group_details.members:
                member.balance = calculate_balance(user=member, group_id=joined_group_details.id, db=db)
            return joined_group_details
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Group not found",
            )

    except Exception as e:
        db.rollback()
        raise


@router.get("/view-short", response_model=List[GroupShortOut])
def view_all_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    logger: Logger = Depends(get_request_logger),
):
    try:
        logger.debug("view all groups attempt", extra={"User id": current_user.id, "User name ": current_user.name})
        return get_short_group_details(user_id=current_user.id, db=db)
    
    except Exception as e:
        # no db rollback cause only reading
        raise

@router.get("/{group_id}", response_model=GroupOut)
def view_group(
    ctx: GroupContext = Depends(get_current_group),
    db: Session = Depends(get_db),
    logger: Logger = Depends(get_request_logger),
):
    logger.debug("view group attempt", extra={"group_name": ctx.group.name, "user_name": ctx.user.name})
    
    joined_group_details = get_full_group_details(ctx.group.id, db=db)
    for member in joined_group_details.members:
        member.balance = calculate_balance(user=member, group_id=joined_group_details.id, db=db)
    return joined_group_details

@router.get("/{group_id}/balances", response_model=List[GroupBalancesOut])
def view_group_balances(
    ctx: GroupContext = Depends(get_current_group),
    db: Session = Depends(get_db),
    logger: Logger = Depends(get_request_logger),
):
    try:
        print()
        # TO DO: new endpoint for viewing group balances. decouple balances and expenses on frontend

    except Exception as e:
        logger.error(f"Error geting group balances: {e}")
