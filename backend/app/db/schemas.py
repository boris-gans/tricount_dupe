# pydantic models, validates request and response bodies
from pydantic import BaseModel
from typing import Optional, List

# new user signup; no reuse
class UserCreate(BaseModel):
    name: str
    pw: str
    email: str

class UserLogin(BaseModel):
    email: str
    pw: str


# generic model for inputting a user (user_id)
class UserIn(BaseModel):
    id: int
    name: str

class UserOut(BaseModel):
    id: int
    name: str
    #limit this info as it gets re-used for public stuff
    class Config:
        orm_mode = True

class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

    
class ExpenseSplitIn(BaseModel):
    user: UserIn
    amount: float

# new expense
class ExpenseCreate(BaseModel):
    paid_by_id: int #can be any user id, so dont rely on jwt
    amount: float
    description: Optional[str]
    splits: List[ExpenseSplitIn]

class ExpenseUpdate(BaseModel):
    id: int
    expense: ExpenseCreate

class ExpenseDelete(BaseModel):
    id: int

# encapsulate splits in the expense_split table
class ExpenseSplitOut(BaseModel):
    user: UserOut
    amount: float

    class Config:
        orm_mode = True

# list all splits for one expense
class ExpenseOut(BaseModel):
    id: int
    amount: float
    description: Optional[str]

    paid_by: UserOut
    splits: List[ExpenseSplitOut]

    class Config:
        orm_mode = True

class ExpenseIn(BaseModel):
    id: int
    amount: Optional[float] = None
    description: Optional[str] = None
    paid_by_id: Optional[int] = None
    splits: Optional[List[ExpenseSplitIn]] = None


#creating a new group
class GroupCreate(BaseModel):
    # user_id: int  no longer needed cause jwt
    name: str
    group_pw: str
    emoji: Optional[str]

#joining an existing group (for now just name + pw, later we can do a link or smth)
class PasswordAuth(BaseModel):
    group_name: str
    group_pw: str

class GroupJoinIn(BaseModel):
    pw_auth: Optional[PasswordAuth] = None
    link_auth: Optional[str] = None

class UserBalanceOut(BaseModel):
    id: int
    name: str
    balance: float

#info received when you click on an actual group
class GroupOut(BaseModel):
    id: int
    name: str
    emoji: Optional[str]
    members: List[UserBalanceOut]
    expenses: List[ExpenseOut]

    class Config:
        orm_mode = True

class GroupShortOut(BaseModel):
    id: int
    name: str
    emoji: Optional[str]

class GroupInviteOut(BaseModel):
    token: str