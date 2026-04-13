import requests
import requests.packages
from enum import Enum
import time

class Collection(str, Enum):
    BILLS = "BILLS"
    BILLSTATUS = "BILLSTATUS"

class congressapi:
    def __init__(self, api_key: str, base_url: str = 'https://api.govinfo.gov'):
        self.api_key = api_key
        self.base_url = base_url
        
    def get_collection(self, start_date: str = '2018-04-04T00:00:00Z', collection: Collection = Collection.BILLS, page_size: int = 10, offset: str = '*') -> list:
        url = f"{self.base_url}/collections/{collection.value}/{start_date}?pageSize={page_size}&api_key={self.api_key}&offsetMark={offset}"
        
        retries: int = 5
        backoff: int = 10
        for attempt in range(retries):
            try:
                response: dict = requests.get(url, timeout=5)
                response.raise_for_status()
                return response.json()
            except requests.Timeout:
                if attempt == retries -1:
                    raise
                time.sleep(backoff)
            except requests.RequestException:
                raise