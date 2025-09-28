# translates pure http --> expenses class

from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore
from logging import Logger

from app.db.session import get_db
from app.db.schemas import ExpenseSplitIn, ExpenseCreate, ExpenseOut, ExpenseSplitOut
from app.db.models import Expense, ExpenseSplit, User, Group
from app.core.logger import get_request_logger
from app.services.expense_service import create_expense
from app.core.security import get_current_user, get_current_group

router = APIRouter()

@router.post("/groups/{group_id}/create-expense", response_model=ExpenseOut)
def create_expense(
    group_id: int, #safer to include it in url
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_group: Group = Depends(get_current_group), #to make sure that this user is a member of the curent group
    logger: Logger = Depends(get_request_logger),
):
    try:
        logger.info("expense create payload received", extra={"group_id": expense.group_id, "paid_by": expense.paid_by_id, "created_by": expense.created_by_id})

        new_expense = create_expense(expense=expense, user_id=current_user.id, group_id=current_group.id, db=db)

        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)

        logger.debug("expense created", extra={"expense_id": new_expense.id})
        
        return new_expense
    
    except Exception as e:
        logger.error(f"Error creating expense: {e}")
        db.rollback()
        raise
