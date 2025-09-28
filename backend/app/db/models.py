# sqlalchemy ORM models (unique per group, expense and user)
from .base import Base
from sqlalchemy import (
    create_engine, Column, Integer, Text, String, Numeric, 
    TIMESTAMP, ForeignKey, JSON, UniqueConstraint, Enum, Boolean, Float, Table
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, joinedload


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, autoincrement=True, primary_key=True)
    name = Column(String, nullable=False)
    pw = Column(String, nullable=False)
    email = Column(String, nullable=False)

    group_associations = relationship("GroupMembers", back_populates="user")
    groups = relationship("Group", secondary="group_members", viewonly=True)

    expenses_paid = relationship("Expense", foreign_keys="Expense.paid_by_id", back_populates="paid_by")
    expenses_created = relationship("Expense", foreign_keys="Expense.created_by_id", back_populates="created_by")



class Group(Base):
    __tablename__ = "group"

    id = Column(Integer, autoincrement=True, primary_key=True)
    name = Column(String, nullable=False)
    pw = Column(String, nullable=False)
    emoji = Column(Text) #emoji code; the icon representing group

    member_associations = relationship("GroupMembers", back_populates="group")
    members = relationship("User", secondary="group_members", viewonly=True)
    expenses = relationship("Expense", back_populates="group")


class GroupMembers(Base):
    __tablename__ = "group_members"

    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)
    group_id = Column(Integer, ForeignKey("group.id"), primary_key=True)

    user = relationship("User", back_populates="group_associations")
    group = relationship("Group", back_populates="member_associations")


class Expense(Base):
    __tablename__ = "expense"

    id = Column(Integer, autoincrement=True, primary_key=True)
    amount = Column(Float, nullable=False)
    description = Column(String)
    photo_url = Column(String) #if i want to add image storage

    group_id = Column(Integer, ForeignKey("group.id"), nullable=False)
    paid_by_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    group = relationship("Group", back_populates="expenses")
    paid_by = relationship("User", foreign_keys=[paid_by_id], back_populates="expenses_paid")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="expenses_created")

    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

class ExpenseSplit(Base):
    __tablename__ = "expense_split"
    id = Column(Integer, autoincrement=True, primary_key=True)
    expense_id = Column(Integer, ForeignKey("expense.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)

    amount = Column(Float, nullable=False)

    expense = relationship("Expense", back_populates="splits")
    user = relationship("User")