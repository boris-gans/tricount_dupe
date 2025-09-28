# math logic for splitting an expense between users, within a group

from sqlalchemy.orm import Session, joinedload
from fastapi import Depends, HTTPException, status

from app.db.models import Group, Expense, ExpenseSplit, User
from app.db.schemas import ExpenseCreate, ExpenseOut, ExpenseIn, ExpenseUpdate
from app.db.session import get_db
from app.core.logger import get_module_logger


logger = get_module_logger(__name__)

def _load_expense_with_details(db: Session, expense_id: int) -> Expense:
    return (
        db.query(Expense)
        .options(
            joinedload(Expense.paid_by),
            joinedload(Expense.splits).joinedload(ExpenseSplit.user),
        )
        .filter(Expense.id == expense_id)
        .first()
    )


def create_expense_service(
        new_expense: ExpenseCreate, 
        user_id: int, 
        group_id: int, 
        db: Session = Depends(get_db)
) -> Expense:
    logger.debug(
        "creating expense",
        extra={"group_id": group_id, "created by": user_id, "paid_by_id": new_expense.paid_by_id},
    )

    try:

        expense = Expense(
            amount=new_expense.amount,
            description=new_expense.description,
            photo_url=new_expense.photo_url,
            paid_by_id=new_expense.paid_by_id,
            group_id=group_id, #already checked and found in security.py
            created_by_id=user_id,
        )

        # iterate over splits
        for split in new_expense.splits:
            expense.splits.append(
                ExpenseSplit(user_id=split.user.id, amount=split.amount, expense=expense)
            )

        logger.info("expense object created")
        return expense
    
    except HTTPException:
        # db.rollback()
        raise
    except Exception:
        # db.rollback()
        logger.exception(
            "expense object creation failed",
            extra={"group_id": group_id},
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create expense object",
        )


def get_expense_details(expense: ExpenseIn, db: Session = Depends(get_db)) -> ExpenseOut:
    logger.debug("loading expense details", extra={"expense_id": expense.id})

    try:
        expense_record = _load_expense_with_details(db, expense.id)

        if not expense_record:
            logger.warning(
                "expense not found",
                extra={"expense_id": expense.id},
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found",
            )

        return expense_record
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "expense lookup failed",
            extra={"expense_id": expense.id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load expense",
        )


def edit_expense_service(
    expense_update: ExpenseUpdate,
    user_id: int,
    group_id: int,
    db: Session,
) -> Expense:
    logger.debug(
        "editing expense",
        extra={"group_id": group_id, "edited_by": user_id, "expense_id": expense_update.id},
    )

    try:
        expense = (
            db.query(Expense)
            .filter(Expense.id == expense_update.id, Expense.group_id == group_id)
            .first()
        )

        if not expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        edited_expense = expense_update.expense
        expense.amount = edited_expense.amount
        expense.description = edited_expense.description
        expense.photo_url = edited_expense.photo_url

        # update only provided fields
        # if expense_update.amount is not None:
        #     expense.amount = expense_update.amount
        # if expense_update.description is not None:
        #     expense.description = expense_update.description
        # if expense_update.photo_url is not None:
        #     expense.photo_url = expense_update.photo_url
        # if expense_update.paid_by_id is not None:
        #     expense.paid_by_id = expense_update.paid_by_id

        if edited_expense.splits is not None:
            expense.splits.clear()

            for split in edited_expense.splits:
                expense.splits.append(
                    ExpenseSplit(user_id=split.user.id, amount=split.amount, expense=expense)
                )

        logger.info("expense updated", extra={"expense_id": expense_update.id})
        return expense

    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "expense edit failed",
            extra={"group_id": group_id, "expense_id": expense_update.id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to edit expense",
        )

