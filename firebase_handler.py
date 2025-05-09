from typing import List, Dict  # Import List and Dict types for type hinting in function signatures
import firebase_admin  # Import firebase_admin module to initialize Firebase Admin SDK
from firebase_admin import credentials, firestore  # Import credentials and firestore modules from firebase_admin

# Initialize Firebase Admin SDK
cred = credentials.Certificate("secrets/firebase-key.json")  # Load Firebase service account credentials from JSON file path
firebase_admin.initialize_app(cred)  # Initialize the Firebase app with the loaded credentials
db = firestore.client()  # Create a Firestore client instance for database operations

def generate_test_id(user_id: str, test_type: str, test_date: str) -> str:
    """
    Generate a unique test_id in the format: {user_id}-{test_type}-{test_date}
    If a collision occurs, appends suffix: -1, -2, etc.
    """
    base_id = f"{user_id}-{test_type}-{test_date}"  # Construct base ID string by concatenating user_id, test_type, and test_date with hyphens
    test_id = base_id  # Initialize test_id variable with base_id value
    suffix = 1  # Initialize suffix counter starting at 1 for handling ID collisions

    # Reference to test collection under user for the specific test_type
    test_collection = db.collection("users").document(user_id).collection(f"{test_type}")  # Get Firestore collection reference for user's test_type

    # Increment suffix until an unused test_id is found in Firestore collection
    while test_collection.document(test_id).get().exists:  # While document with current test_id exists in Firestore
        test_id = f"{base_id}-{suffix}"  # Append suffix to base_id to create new test_id candidate
        suffix += 1  # Increment suffix for next iteration if needed

    return test_id  # Return the unique test_id string after ensuring no collision

# Generate an instance in Firestore for the provided test
def upload_biomarkers_to_firestore(user_id: str, test_type: str, test_date: str, rows: List[Dict]) -> None:
    """
    Uploads biomarker test results under:
    users/{user_id}/{test_type}/{test_id}
    """
    test_id = generate_test_id(user_id, test_type, test_date)  # Generate a unique test_id for this test
    doc_ref = db.collection("users").document(user_id).collection(test_type).document(test_id)  # Get Firestore document reference for this test
    doc_ref.set({  # Upload data to Firestore document
        "date": test_date,  # Store the date of the test
        "verified": False,  # Set verified flag to False by default
        "biomarkers": rows  # Store the list of biomarker result dictionaries under 'biomarkers' field
    })

# Add biomarkers from this test to the timeline
def update_biomarker_history(user_id: str, test_date: str, rows: List[Dict]) -> None:
    """
    For each biomarker, append a new test entry to its history:
    users/{user_id}/biomarker_history/{biomarker_name}
    """
    for row in rows:  # Iterate over each biomarker entry dictionary in the test results list
        name = row["Biomarker"]  # Extract the biomarker name string from the current row dictionary
        entry = {  # Create a new dictionary representing a single biomarker test entry for history
            "date": test_date,  # Include the date of this test entry
            "value": row["Value"],  # Include the measured value for this biomarker
            "units": row["Units"],  # Include the units of measurement for the value
            "ref_range": row["Reference Range"],  # Include the reference range for this biomarker
            "notes": row["Notes"]  # Include any additional notes related to this test entry
        }
        # Get Firestore document reference for this biomarker's history under user's biomarker_history collection
        doc_ref = db.collection("users").document(user_id).collection("biomarker_history").document(name)
        doc_ref.set({  # Update the biomarker history document with new entry
            "name": name,  # Ensure the biomarker's name is stored in the document
            "history": firestore.ArrayUnion([entry])  # Append the new entry to the 'history' array field using ArrayUnion
        }, merge=True)  # Use merge=True to merge with existing document data without overwriting other fields