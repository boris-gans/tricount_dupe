import pytest

from app.db.models import Group, User
from app.db.schemas import ExpenseCreate, ExpenseSplitIn, UserIn, ExpenseUpdate
from app.services.expense_service import create_expense_service, edit_expense_service
from app.core.exceptions import ExpenseCreationError, ExpenseEditError


def _user_in(user: User) -> UserIn:
    return UserIn(id=user.id, name=user.name)


def _expense_payload(paid_by: User, splits: list[tuple[User, float]], amount: float, description: str = "" ) -> ExpenseCreate:
    return ExpenseCreate(
        paid_by_id=paid_by.id,
        amount=amount,
        description=description,
        splits=[ExpenseSplitIn(user=_user_in(user), amount=split_amount) for user, split_amount in splits],
    )


def test_create_expense_service_success(db_session):
    group = Group(name="Holiday", pw="group_pw", emoji=None)
    payer = User(name="Alice", email="alice@example.com", pw="hashed")
    partner = User(name="Bob", email="bob@example.com", pw="hashed")

    db_session.add_all([group, payer, partner])
    db_session.flush()

    payload = _expense_payload(paid_by=payer, splits=[(payer, 50.0), (partner, 50.0)], amount=100.0, description="Dinner")

    expense = create_expense_service(new_expense=payload, user_id=payer.id, group_id=group.id, db=db_session)

    assert expense.id is not None
    assert expense.amount == 100.0
    assert expense.description == "Dinner"
    assert expense.group_id == group.id
    assert len(expense.splits) == 2
    assert {split.user_id for split in expense.splits} == {payer.id, partner.id}


def test_create_expense_service_failure(db_session, monkeypatch):
    group = Group(name="Roadtrip", pw="pw", emoji=None)
    user = User(name="Cara", email="cara@example.com", pw="hashed")
    db_session.add_all([group, user])
    db_session.flush()

    payload = _expense_payload(paid_by=user, splits=[(user, 20.0)], amount=20.0)

    def boom():
        raise RuntimeError("flush failed")

    monkeypatch.setattr(db_session, "flush", boom)

    with pytest.raises(ExpenseCreationError):
        create_expense_service(new_expense=payload, user_id=user.id, group_id=group.id, db=db_session)


def test_edit_expense_service_success(db_session):
    group = Group(name="Concert", pw="pw", emoji=None)
    creator = User(name="Dave", email="dave@example.com", pw="hashed")
    attendee = User(name="Eve", email="eve@example.com", pw="hashed")

    db_session.add_all([group, creator, attendee])
    db_session.flush()

    original_payload = _expense_payload(paid_by=creator, splits=[(creator, 30.0), (attendee, 30.0)], amount=60.0, description="Taxi")
    expense = create_expense_service(new_expense=original_payload, user_id=creator.id, group_id=group.id, db=db_session)

    updated_payload = _expense_payload(paid_by=attendee, splits=[(creator, 20.0), (attendee, 20.0)], amount=40.0, description="Updated Taxi")
    update = ExpenseUpdate(id=expense.id, expense=updated_payload)

    updated_expense = edit_expense_service(expense_update=update, user_id=creator.id, group_id=group.id, db=db_session)

    assert updated_expense.amount == 40.0
    assert updated_expense.description == "Updated Taxi"
    assert updated_expense.paid_by_id == attendee.id
    assert len(updated_expense.splits) == 2
    assert {split.amount for split in updated_expense.splits} == {20.0}


def test_edit_expense_service_not_found(db_session):
    group = Group(name="Festival", pw="pw", emoji=None)
    user = User(name="Finn", email="finn@example.com", pw="hashed")
    db_session.add_all([group, user])
    db_session.flush()

    payload = _expense_payload(paid_by=user, splits=[(user, 10.0)], amount=10.0)
    update = ExpenseUpdate(id=9999, expense=payload)

    with pytest.raises(ExpenseEditError):
        edit_expense_service(expense_update=update, user_id=user.id, group_id=group.id, db=db_session)
