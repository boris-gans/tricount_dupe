# pydantic models
    # validates incoming request bodies + controlls what field is sent back 
from pydantic import BaseModel

class UserIn(BaseModel):
    # id: int
    name: str
    pw: str
    email: str

class UserOut(BaseModel):
    id: int
    name: str
    # no need for password?
    email: str

    class Config:
        orm_mode = True
    
class GroupIn(BaseModel):
    user_id: int
    name: str
    emoji: str

class GroupOut(BaseModel):
    id: int
    user_id: int
    name: str
    emoji: str
    # also: list of other group members (name, balance and id's)
    # also: list of all expenses by that group ()

class ExpenseIn(BaseModel):
    user_id: int
    amount: float
    description: str
    photo_url: str
    # need to include user_id and group_id


