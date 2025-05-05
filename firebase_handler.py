from typing import List, Dict
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK once
cred = credentials.Certificate("secrets/firebase-key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def upload_biomarkers_to_firestore(user_id: str, test_date: str, rows: List[Dict]) -> None:
    """
    Uploads biomarker test results under:
    users/{user_id}/biomarkers/{test_date}
    """
    doc_ref = db.collection("users").document(user_id).collection("biomarkers").document(test_date)
    doc_ref.set({
        "date": test_date,
        "verified": False,
        "biomarkers": rows
    })


# Add biomarker history updating function
def update_biomarker_history(user_id: str, test_date: str, rows: List[Dict]) -> None:
    """
    For each biomarker, append a new test entry to its history:
    users/{user_id}/biomarker_history/{biomarker_name}
    """
    for row in rows:
        name = row["Biomarker"]
        entry = {
            "date": test_date,
            "value": row["Value"],
            "units": row["Units"],
            "ref_range": row["Reference Range"],
            "notes": row["Notes"]
        }
        doc_ref = db.collection("users").document(user_id).collection("biomarker_history").document(name)
        doc_ref.set({
            "name": name,
            "history": firestore.ArrayUnion([entry])
        }, merge=True)