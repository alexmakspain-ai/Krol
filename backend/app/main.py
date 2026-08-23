import os

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import auth, categories, expenses

app = FastAPI(title="Expense Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(categories.router)
api_router.include_router(expenses.router)
app.include_router(api_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR), name="spa-assets")

    @app.exception_handler(404)
    async def spa_fallback(request: Request, exc):
        if request.method == "GET" and not request.url.path.startswith("/api"):
            return FileResponse(os.path.join(STATIC_DIR, "index.html"))
        return JSONResponse({"detail": "Not Found"}, status_code=404)
