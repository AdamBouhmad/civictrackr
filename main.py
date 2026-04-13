from congress_api import Collection, congressapi
from models.bills import Bill
from storage import insert_bill, list_bills
import os

CREDS = os.environ["BILL_KEY"]

raw_bills = (congressapi(api_key=CREDS).get_collection(collection=Collection.BILLS))["packages"]
for bill in raw_bills:
    structured_bill = Bill.from_api(bill)
    insert_bill(structured_bill)
