# translates pure http --> expenses class

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.schemas import ExpenseSplitIn, ExpenseCreate, ExpenseOut, ExpenseSplitOut
from app.db.models import Expense, ExpenseSplit

router = APIRouter()

@router.post("/", response_model=ExpenseOut)
def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    new_expense = Expense(**ExpenseCreate)
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return new_expense