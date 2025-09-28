# math logic for splitting an expense between users, within a group

from sqlalchemy.orm import Session, joinedload
from fastapi import Depends, HTTPException, status

from app.db.models import Group, Expense, ExpenseSplit, User
from app.db.schemas import ExpenseCreate, ExpenseOut, ExpenseIn
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


def edit_expense(expense: ExpenseIn, db: Session = Depends(get_db)) -> ExpenseOut:
    logger.debug("updating expense", extra={"expense_id": expense.id})

    try:
        existing_expense = _load_expense_with_details(db, expense.id)

        if not existing_expense:
            logger.warning(
                "expense not found for update",
                extra={"expense_id": expense.id},
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found",
            )

        if expense.amount is not None:
            existing_expense.amount = expense.amount

        if expense.description is not None:
            existing_expense.description = expense.description

        if expense.photo_url is not None:
            existing_expense.photo_url = expense.photo_url

        if expense.paid_by_id is not None:
            payer = db.query(User).filter(User.id == expense.paid_by_id).first()
            if not payer:
                logger.warning(
                    "payer not found for update",
                    extra={"user_id": expense.paid_by_id},
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found",
                )
            existing_expense.paid_by_id = expense.paid_by_id

        if expense.splits is not None:
            existing_expense.splits.clear()
            for split in expense.splits:
                split_user = db.query(User).filter(User.id == split.user.id).first()
                if not split_user:
                    logger.warning(
                        "split user not found for update",
                        extra={"user_id": split.user.id},
                    )
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"User {split.user.id} not found",
                    )

                existing_expense.splits.append(
                    ExpenseSplit(user_id=split.user.id, amount=split.amount)
                )

        db.commit()

        logger.info("expense updated", extra={"expense_id": existing_expense.id})

        return _load_expense_with_details(db, existing_expense.id)
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception(
            "expense update failed",
            extra={"expense_id": expense.id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update expense",
        )


def delete_expense(expense: ExpenseIn, db: Session = Depends(get_db)) -> bool:
    logger.debug("deleting expense", extra={"expense_id": expense.id})

    try:
        existing_expense = db.query(Expense).filter(Expense.id == expense.id).first()

        if not existing_expense:
            logger.warning(
                "expense not found for delete",
                extra={"expense_id": expense.id},
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found",
            )

        db.delete(existing_expense)
        db.commit()

        logger.info("expense deleted", extra={"expense_id": expense.id})

        return True
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception(
            "expense delete failed",
            extra={"expense_id": expense.id},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete expense",
        )
