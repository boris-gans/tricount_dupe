# translates pure http --> expenses class

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session # type: ignore
from logging import Logger

from app.db.session import get_db
from app.db.schemas import ExpenseSplitIn, ExpenseCreate, ExpenseOut, ExpenseSplitOut, ExpenseUpdate, GroupOut, ExpenseDelete
from app.db.models import Expense, ExpenseSplit, User, Group
from app.core.logger import get_request_logger
from app.services.expense_service import create_expense_service, edit_expense_service
from app.core.security import get_current_user, get_current_group, GroupContext

router = APIRouter()

@router.post("/{group_id}/create-expense", response_model=ExpenseOut)
def create_expense(
    group_id: int, #safer to include it in url
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    ctx: GroupContext = Depends(get_current_group), #to make sure that this user is a member of the curent group
    logger: Logger = Depends(get_request_logger),
):
    try:
        logger.info("expense create payload received", extra={"group_id": ctx.group.id, "paid_by": expense.paid_by_id, "created_by": ctx.user.id})

        new_expense = create_expense_service(new_expense=expense, user_id=ctx.user.id, group_id=ctx.group.id, db=db)

        db.add(new_expense)
        db.commit()
        db.refresh(new_expense)

        logger.debug("expense created", extra={"expense_id": new_expense.id})

        return new_expense
    
    except Exception as e:
        logger.error(f"Error creating expense: {e}")
        db.rollback()
        raise

@router.post("/{group_id}/edit-expense", response_model=ExpenseOut)
def edit_expense(
    group_id: int,
    expense: ExpenseUpdate,
    db: Session = Depends(get_db),
    ctx: GroupContext = Depends(get_current_group),
    logger: Logger = Depends(get_request_logger),
):
    try:
        logger.info("expense edit payload recieved", extra={"group_id": ctx.group.id, "user_id": ctx.user.id, "expense_id": expense.id})
        updated_expense = edit_expense_service(expense_update=expense, user_id=ctx.user.id, group_id=ctx.group.id, db=db)

        db.add(updated_expense)
        db.commit()
        db.refresh(updated_expense)

        logger.debug("expense updated", extra={"expense_id": updated_expense.id})

        return updated_expense

    except Exception as e:
        logger.error(f"Error editing expense: {e}")
        db.rollback()
        raise

@router.post("/{group_id}/delete-expense")
def delete_expense(
    group_id: int,
    expense: ExpenseDelete,
    db: Session = Depends(get_db),
    ctx: GroupContext = Depends(get_current_group),
    logger: Logger = Depends(get_request_logger),
):
    try:
        logger.info("expense delete payload recieved", extra={"group_id": ctx.group.id, "user_id": ctx.user.id, "expense_id": expense.id})
        
        expense_to_delete = (
            db.query(Expense)
            .filter(Expense.id == expense.id, Expense.group_id == group_id)
            .first()
        )

        if not expense_to_delete:
            raise HTTPException(status_code=404, detail="Expense not found")

        db.delete(expense_to_delete)
        db.commit

        return {"msg": "Expense deleted"}

    except Exception as e:
        logger.error(f"Error deleting expense: {e}")
        db.rollback()
        raise

