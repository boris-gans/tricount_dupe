from sqlalchemy.orm import Session
from fastapi import Depends

from app.db.models import Group, Expense, ExpenseSplit, User
from app.db.schemas import ExpenseCreate, ExpenseOut, ExpenseIn, ExpenseUpdate
from app.core.exceptions import ExpenseCreationError, ExpenseEditError, ExpenseNotFoundError
from app.db.session import get_db
from app.core.logger import get_module_logger


logger = get_module_logger(__name__)


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

        db.add(expense)
        db.flush()
        db.refresh(expense)
        logger.info("expense object created")

        return expense
    
    except Exception as e:
        logger.error(
            "expense object creation failed",
            extra={"group_id": group_id},
        )
        raise ExpenseCreationError from e

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
            raise ExpenseNotFoundError
        
        edited_expense = expense_update.expense
        expense.amount = edited_expense.amount
        expense.description = edited_expense.description
        expense.photo_url = edited_expense.photo_url


        if edited_expense.splits is not None:
            expense.splits.clear()

            for split in edited_expense.splits:
                expense.splits.append(
                    ExpenseSplit(user_id=split.user.id, amount=split.amount, expense=expense)
                )

        logger.info("expense updated", extra={"expense_id": expense_update.id})
        return expense

    except Exception as e:
        logger.exception(
            "expense edit failed",
            extra={"group_id": group_id, "expense_id": expense_update.id},
        )
        raise ExpenseEditError from e