from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, categories, expenses

app = FastAPI(title="Expense Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(expenses.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
