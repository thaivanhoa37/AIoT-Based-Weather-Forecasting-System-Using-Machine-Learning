"""
Page Routes - Render HTML templates
"""
from pathlib import Path
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

# Get templates directory
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

router = APIRouter()

@router.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Dashboard / Home page"""
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/charts", response_class=HTMLResponse)
async def charts(request: Request):
    """Charts and Analytics page"""
    return templates.TemplateResponse("charts.html", {"request": request})


@router.get("/forecast", response_class=HTMLResponse)
async def forecast(request: Request):
    """ML Forecast page"""
    return templates.TemplateResponse("forecast.html", {"request": request})


@router.get("/ml-training", response_class=HTMLResponse)
async def ml_training(request: Request):
    """ML Training page"""
    return templates.TemplateResponse("ml-training.html", {"request": request})


@router.get("/mysql", response_class=HTMLResponse)
async def mysql(request: Request):
    """MySQL Data Management page"""
    return templates.TemplateResponse("mysql.html", {"request": request})


@router.get("/settings", response_class=HTMLResponse)
async def settings(request: Request):
    """Settings page"""
    return templates.TemplateResponse("settings.html", {"request": request})
