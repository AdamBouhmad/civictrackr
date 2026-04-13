from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from storage import list_bills

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
