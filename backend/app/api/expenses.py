# translates pure http --> expenses class

from fastapi import APIRouter, Depends # type: ignore
from sqlalchemy.orm import Session # type: ignore
from logging import Logger

from app.db.session import get_db
from app.db.schemas import ExpenseSplitIn, ExpenseCreate, ExpenseOut, ExpenseSplitOut
from app.db.models import Expense, ExpenseSplit
from app.core.logger import get_request_logger

router = APIRouter()

@router.post("/", response_model=ExpenseOut)
def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    logger: Logger = Depends(get_request_logger),
):
    logger.info("creating expense", extra={"group_id": expense.group_id, "paid_by": expense.paid_by_id})
    new_expense = Expense(**expense.dict())
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    logger.debug("expense created", extra={"expense_id": new_expense.id})
    return new_expense
