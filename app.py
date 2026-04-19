from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from storage import get_bill as get_bill_by_id
from storage import list_bills, get_bill_details

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/bills")
def get_bills(congressional_session: str = "119", limit: int = 20):
    return list_bills(congressional_session, limit)


@app.get("/bills/{bill_id}/")
def get_one_bill(bill_id: str):
    bill = get_bill_by_id(bill_id)
    if bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill

@app.get("/bills/{bill_id}/details")
def get_bill_detail(bill_id: str):
    bill_details = get_bill_details(bill_id)
    if bill_details is None:
        raise HTTPException(status_code=404, detail="Information about this Bill could not be found.")
    return bill_details
