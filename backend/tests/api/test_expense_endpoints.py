from app.core.security import create_access_token, hash_password
from app.db.models import Group, GroupMembers, User, Expense
from app.db.schemas import ExpenseCreate, ExpenseSplitIn, UserIn, ExpenseUpdate
from app.services.expense_service import create_expense_service
from app.core.exceptions import ExpenseCreationError, ExpenseEditError, ExpenseNotFoundError


def _create_user(db_session, name: str, email: str) -> User:
    user = User(name=name, email=email, pw=hash_password("password"))
    db_session.add(user)
    db_session.flush()
    return user


def _auth_headers_for_user(user: User) -> dict[str, str]:
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}


def _ensure_membership(db_session, group: Group, user: User) -> None:
    membership = GroupMembers(user_id=user.id, group_id=group.id)
    db_session.add(membership)
    db_session.flush()


# error here; test assumes the creator was also paid by
def _create_expense(db_session, group: Group, payer: User, splits: list[tuple[User, float]], amount: float, description: str = "Expense") -> Expense:
    payload = ExpenseCreate(
        paid_by_id=payer.id,
        amount=amount,
        description=description,
        splits=[ExpenseSplitIn(user=UserIn(id=user.id, name=user.name), amount=split_amount) for user, split_amount in splits],
    )
    return create_expense_service(new_expense=payload, user_id=payer.id, group_id=group.id, db=db_session)


def test_create_expense_success(client, db_session):
    user = _create_user(db_session, "Owner", "owner@example.com")
    payer = user
    roommate = _create_user(db_session, "Roommate", "roommate@example.com")

    group = Group(name="Apartment", pw="pw", emoji=None)
    db_session.add(group)
    db_session.flush()

    _ensure_membership(db_session, group, user)
    _ensure_membership(db_session, group, roommate)

    headers = _auth_headers_for_user(user)
    payload = {
        "paid_by_id": payer.id,
        "amount": 80.0,
        "description": "Groceries",
        "splits": [
            {"user": {"id": payer.id, "name": payer.name}, "amount": 40.0},
            {"user": {"id": roommate.id, "name": roommate.name}, "amount": 40.0},
        ],
    }

    response = client.post(f"/expenses/{group.id}/create-expense", headers=headers, json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["amount"] == 80.0
    assert len(body["splits"]) == 2

    stored = db_session.query(Expense).filter(Expense.group_id == group.id).first()
    assert stored is not None


def test_create_expense_failure(client, auth_header, monkeypatch):
    headers, user = auth_header

    monkeypatch.setattr("app.api.expenses.create_expense_service", lambda **_: (_ for _ in ()).throw(ExpenseCreationError))

    response = client.post(
        "/expenses/1/create-expense",
        headers=headers,
        json={"paid_by_id": user.id, "amount": 10.0, "description": "", "splits": []},
    )

    assert response.status_code == 403 #should be 403 because the user isnt part of group (get_current_group dependency)
    assert response.json()["detail"] == "User does not have access to this group"


def test_edit_expense_success(client, db_session):
    user = _create_user(db_session, "Editor", "editor@example.com")
    roommate = _create_user(db_session, "Flatmate", "flatmate@example.com")

    group = Group(name="Flat", pw="pw", emoji=None)
    db_session.add(group)
    db_session.flush()

    _ensure_membership(db_session, group, user)
    _ensure_membership(db_session, group, roommate)

    expense = _create_expense(db_session, group, roommate, splits=[(user, 20.0), (roommate, 20.0)], amount=40.0, description="Utilities")

    headers = _auth_headers_for_user(user)
    update_payload = {
        "id": expense.id,
        "expense": {
            "paid_by_id": roommate.id,
            "amount": 50.0,
            "description": "Updated Utilities",
            "splits": [
                {"user": {"id": user.id, "name": user.name}, "amount": 25.0},
                {"user": {"id": roommate.id, "name": roommate.name}, "amount": 25.0},
            ],
        },
    }

    response = client.post(f"/expenses/{group.id}/edit-expense", headers=headers, json=update_payload)

    assert response.status_code == 200
    body = response.json()
    assert body["amount"] == 50.0
    assert body["description"] == "Updated Utilities"
    assert body["paid_by"]["id"] == roommate.id


def test_edit_expense_not_found(client, auth_header, monkeypatch):
    headers, _ = auth_header

    monkeypatch.setattr("app.api.expenses.edit_expense_service", lambda **_: (_ for _ in ()).throw(ExpenseNotFoundError))

    response = client.post(
        "/expenses/1/edit-expense",
        headers=headers,
        json={"id": 1, "expense": {"paid_by_id": 1, "amount": 10.0, "description": "", "splits": []}},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Expense not found"


def test_edit_expense_failure(client, auth_header, monkeypatch):
    headers, _ = auth_header

    monkeypatch.setattr("app.api.expenses.edit_expense_service", lambda **_: (_ for _ in ()).throw(ExpenseEditError))

    response = client.post(
        "/expenses/1/edit-expense",
        headers=headers,
        json={"id": 1, "expense": {"paid_by_id": 1, "amount": 10.0, "description": "", "splits": []}},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Error creating expense"


def test_delete_expense_success(client, db_session):
    user = _create_user(db_session, "Owner", "owner-del@example.com")
    roommate = _create_user(db_session, "Room", "room-del@example.com")
    group = Group(name="Delete", pw="pw", emoji=None)
    db_session.add(group)
    db_session.flush()

    _ensure_membership(db_session, group, user)
    _ensure_membership(db_session, group, roommate)

    expense = _create_expense(db_session, group, user, splits=[(user, 15.0), (roommate, 15.0)], amount=30.0, description="Snacks")

    headers = _auth_headers_for_user(user)
    payload = {"id": expense.id}

    response = client.post(f"/expenses/{group.id}/delete-expense", headers=headers, json=payload)

    assert response.status_code == 200
    assert response.json()["msg"] == "Expense deleted"

    remaining = db_session.query(Expense).filter(Expense.id == expense.id).first()
    assert remaining is None


def test_delete_expense_not_found(client, auth_header):
    headers, _ = auth_header

    response = client.post(
        "/expenses/1/delete-expense",
        headers=headers,
        json={"id": 999},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Expense not found"
