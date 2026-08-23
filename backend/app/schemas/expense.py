from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategoryOut


class ExpenseBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    amount: float = Field(gt=0)
    date: date
    category_id: int


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(ExpenseBase):
    pass


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    amount: float
    date: date
    created_at: datetime
    category: CategoryOut
