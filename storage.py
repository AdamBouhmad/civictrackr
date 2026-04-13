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
connection.close()

def insert_bill(bill: Bill) -> None:
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    values = (
        bill.bill_id,
        bill.title,
        bill.date_created,
        bill.congressional_session,
        bill.bill_url
    )
    cursor.execute("""
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
    
def list_bills(congressional_session:str = '119', limit: int = 20) -> list[tuple]:
    connection = sqlite3.connect(DB_PATH)
    cursor = connection.cursor()
    cursor.execute("""
                       SELECT * FROM bills
                       WHERE congressional_session = ?
                       ORDER BY date_created DESC
                       LIMIT ?
                       """, 
                       (congressional_session, limit,),
        )
    rows = cursor.fetchall()
    connection.close()
    return rows
