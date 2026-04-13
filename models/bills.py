from dataclasses import dataclass

@dataclass
class Bill:
    title: str
    date_created: str
    congressional_session: str
    bill_id: str
    bill_url: str

    @classmethod
    def from_api(cls, raw: dict) -> "Bill":
        return cls(
            title = raw["title"],
            date_created = raw["dateIssued"],
            congressional_session = raw["congress"],
            bill_id = raw["packageId"],
            bill_url = raw["packageLink"]
        )
