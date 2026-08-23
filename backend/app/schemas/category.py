from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(min_length=1, max_length=20)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
