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

    groups = relationship("Group", secondary="group_members", back_populates="members")


class Group(Base):
    __tablename__ = "group"

    id = Column(Integer, autoincrement=True, primary_key=True)
    name = Column(String, nullable=False)
    emoji = Column(Text) #emoji code; the icon representing group

    members = relationship("User", secondary="group_members", back_populates="groups")
    expenses = relationship("Expense", back_populates="group")


class GroupMembers(Base):
    __tablename__ = "group_members"
    user_id = Column(Integer, ForeignKey("user.id"), primary_key=True)
    group_id = Column(Integer, ForeignKey("group.id"), primary_key=True)


class Expense(Base):
    __tablename__ = "expense"

    id = Column(Integer, autoincrement=True, primary_key=True)
    amount = Column(Float, nullable=False)
    description = Column(String)
    photo_url = Column(String) #if i want to add image storage

    group = relationship("Group", back_populates="expenses")
    # NEED TO MAP THIS TO USER ID ALSO; either include here or new table (better I think)