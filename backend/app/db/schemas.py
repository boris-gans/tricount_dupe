# pydantic models
    # validates incoming request bodies + controlls what field is sent back 
from pydantic import BaseModel # type: ignore
from typing import Optional, List

# new user signup
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
    email: str
    #limit this info as it gets re-used for public stuff

    class Config:
        orm_mode = True


    
class ExpenseSplitIn(BaseModel):
    user_id: int
    amount: float

# new expense
class ExpenseCreate(BaseModel):
    paid_by_id: int #a user id
    group_id: int

    amount: float
    description: Optional[str]
    photo_url: Optional[str]
    splits: List[ExpenseSplitIn]

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
    photo_url: Optional[str]

    paid_by: UserOut
    splits: List[ExpenseSplitOut]

    class Config:
        orm_mode = True



#creating a new group
class GroupCreate(BaseModel):
    user_id: int
    name: str
    group_pw: str
    emoji: Optional[str]

#joining an existing group (for now just name + pw, later we can do a link or smth)
class GroupJoinIn(BaseModel):
    user_id: int
    group_id: int
    group_pw: str

#info received when you click on an actual group
class GroupOut(BaseModel):
    id: int
    name: str
    emoji: Optional[str]
    members: List[UserOut]
    expenses: List[ExpenseOut]

    class Config:
        orm_mode = True

class GroupShortOut(BaseModel):
    id: int
    name: str
    emoji: Optional[str]


# need a user login; should return all groups and the shorthand info (just name, id, emoji)
class UserSummaryOut(BaseModel):
    id: int
    name: str
    groups: List[GroupShortOut]