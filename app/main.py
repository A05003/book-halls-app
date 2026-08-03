from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from .database import engine, Base, get_db
from . import models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Book-Halls Accounting System")

# Serve Frontend static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

# API Endpoints
@app.get("/api/dashboard")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_expenses = db.query(models.Expense).all()
    total_bookings = db.query(models.Booking).all()
    
    total_in = sum(b.amount for b in total_bookings)
    total_out = sum(e.amount for e in total_expenses)
    
    return {
        "income": total_in,
        "expenses": total_out,
        "net_profit": total_in - total_out,
        "bookings_count": len(total_bookings)
    }