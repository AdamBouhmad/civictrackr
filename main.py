from congress_api import Collection, congressapi
from storage import insert_bill, list_bills, insert_bill_summary
from services import bill_details_ingest
from models.bills import Bill
import os

CREDS = os.environ["BILL_KEY"]


raw_bills = (congressapi(api_key=CREDS).get_collection(collection=Collection.BILLS))["packages"]
for bill in raw_bills:
    structured_bill = Bill.from_api(bill)
    #summary = bill_details_ingest.generate_bill_summary(structured_bill.bill_id)
    insert_bill(structured_bill)
    #insert_bill_summary(structured_bill.bill_id, summary)
