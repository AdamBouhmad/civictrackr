import sqlite3
from models.bills import Bill

DB_PATH = "congress.db"

connection = sqlite3.connect(DB_PATH)
cursor = connection.cursor()
cursor.execute("""
               CREATE TABLE IF NOT EXISTS bills (
                   bill_id TEXT PRIMARY KEY NOT NULL, 
                   title TEXT, 
                   date_created TEXT, 
                   congressional_session TEXT, 
                   bill_url TEXT
               )""")
cursor.execute("""
               CREATE TABLE IF NOT EXISTS bill_details(
                   bill_id TEXT PRIMARY KEY NOT NULL REFERENCES bills(bill_id), 
                   summary TEXT,
                   text_url TEXT,
                   latest_action TEXT,
                   last_fetched_at TEXT,
                   raw_json TEXT
               )
               """)

connection.close()


def insert_bill(bill: Bill) -> None:
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    values = (
        bill.bill_id,
        bill.title,
        bill.date_created,
        bill.congressional_session,
        bill.bill_url,
    )
    cursor.execute(
        """
                   INSERT OR IGNORE INTO bills(
                       bill_id, 
                       title, 
                       date_created, 
                       congressional_session, 
                       bill_url) 
                       VALUES(?, ?, ?, ?, ?)
                       """,
        values,
    )
    connection.commit()
    connection.close()
    
def insert_bill_summary(bill: str, summary: str) -> None:
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute(
    """
                    INSERT OR IGNORE INTO bill_details(
                        bill_id,
                        summary
                    )
                    VALUES(?, ?)
                    """,
        (bill, summary)
    )
    connection.commit()
    connection.close()


def list_bills(
    congressional_session: str = "119", limit: int = 20
) -> list[tuple]:
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute(
        """
                       SELECT bill_id, title, date_created, congressional_session, bill_url
                       FROM bills
                       WHERE congressional_session = ?
                       ORDER BY date_created DESC
                       LIMIT ?
                       """,
        (
            congressional_session,
            limit,
        ),
    )
    rows = cursor.fetchall()
    connection.close()
    return rows


def get_bill(bill_id: str):
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute(
        """
                   SELECT bill_id, title, date_created, congressional_session, bill_url
                   FROM bills
                   WHERE bill_id = ?
                   """,
        (bill_id,),
    )
    rows = cursor.fetchone()
    connection.close()
    return rows

def get_bill_details(bill_id: str):
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute(
    """
                SELECT bill_id, summary
                FROM bill_details
                WHERE bill_id = ?    
    """,
    (bill_id,),
    )
    rows = cursor.fetchone()
    connection.close()
    return rows 