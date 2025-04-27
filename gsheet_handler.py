import os #Import the operating system module, used here for path manipulation and environment variables
import csv  # Import the csv module to handle CSV file reading
import logging  # Import logging module for logging errors and information
import time  # Import time module to add delays between API calls
from typing import List, Dict, Optional, Union  # Import type annotations for better code clarity
import gspread  # Import gspread to interact with Google Sheets API
from oauth2client.service_account import ServiceAccountCredentials  # Import for OAuth2 credentials handling
from gspread.utils import rowcol_to_a1  # Import utility to convert row/col indices to A1 notation

# Logging setup
logger = logging.getLogger(__name__)  # Create a logger object for this module

# Constants (normally loaded from env)
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")  # Google Sheet ID to access
WORKSHEET_NAME = os.getenv("GOOGLE_WORKSHEET_NAME")  # Worksheet name inside the Google Sheet
CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE")  # Path to the service account credentials JSON file

MAX_BATCH_SIZE = 50  # Maximum number of batch updates per API call
RATE_LIMIT_DELAY = 1  # Delay in seconds to respect API rate limits

def normalize_key(name: str) -> str:
    #TODO add regex to normalize biomarker names further - remove special characters
    return name.strip().lower()  # Normalize biomarker names for consistent matching

def get_google_sheet() -> gspread.Worksheet:
    """Authorize and get the Google Sheet worksheet."""  
    creds = ServiceAccountCredentials.from_json_keyfile_name(  # Load credentials from JSON file
        CREDENTIALS_FILE,  # Path to credentials file
        scopes=["https://www.googleapis.com/auth/spreadsheets"]  # Scope for Google Sheets API access
    )
    client = gspread.authorize(creds)  # Authorize client with credentials
    sheet = client.open_by_key(SHEET_ID).worksheet(WORKSHEET_NAME)  # Open the specific worksheet by ID and name
    return sheet  # Return the worksheet object

def extract_test_date_from_filename(filename: str) -> Optional[str]:
    import re  # Import regex module locally
    match = re.search(r"(\d{2})[.-](\d{2})[-.](\d{4})", filename)  # Search for date pattern DD-MM-YYYY or DD.MM.YYYY in filename
    if match:  # If a match is found
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"  # Return date formatted as DD-MM-YYYY
    return None  # Return None if no date pattern found

def count_biomarkers_in_csv(file_path: str) -> int:
    with open(file_path, encoding="utf-8") as f:  # Open CSV file with UTF-8 encoding
        reader = csv.reader(f)  # Create a CSV reader object
        next(reader)  # Skip the header row
        return sum(1 for _ in reader)  # Count all remaining rows

def process_csv_and_update_sheet(file_path: str, test_date: str) -> Dict[str, Union[int, List[str]]]:
    try:
        sheet = get_google_sheet()  # Get the Google Sheet worksheet object
        header_row = sheet.row_values(1)  # Read the first row (header) from the sheet

        # Ensure test_date columns exist
        date_columns = [f"{test_date} Значение", f"{test_date} Единицы", f"{test_date} Референсное значение", f"{test_date} Комментарий"]  # This creates a list of new column headers that should be present for a given test_date.
        for col in date_columns:  # Iterate over each expected column and check if each of those columns already exists in the first row of the sheet
            if col not in header_row:  # If the column is not present in header
                header_row.append(col)  # If not, it appends the missing column name to header_row
        if header_row != sheet.row_values(1):  # It compares the possibly modified header_row to what’s currently in the sheet
            sheet.update("1:1", [header_row])  # If new columns were added, it overwrites the first row only. It uses sheet.update("1:1", [header_row]) which means: replace the first row with the new list of headers.
            time.sleep(RATE_LIMIT_DELAY)  # Sleep to respect API rate limits

        value_col_idx = header_row.index(f"{test_date} Значение") + 1  # Get 1-based index of 'Value' column for the test date
        unit_col_idx = header_row.index(f"{test_date} Единицы") + 1  # Get 1-based index of 'Units' column
        ref_col_idx = header_row.index(f"{test_date} Референсное значение") + 1  # Get 1-based index of 'Reference Value' column
        comment_col_idx = header_row.index(f"{test_date} Комментарий") + 1  # Get 1-based index of 'Comment' column

        existing_data = sheet.get_all_values()  # Retrieve all data from the sheet as a 2D list (list of rows, where each row is a list of cell values).
        '''
        [
            ["Название Биомаркера", "01-01-2024 Значение", ...],
            ["Глюкоза", "5.4", ...],
            ["Креатинин", "85", ...]
        ]
        '''

        biomarker_to_row = {
            normalize_key(row[0]): idx + 1 # Use normalized key for reliable matching
            for idx, row in enumerate(existing_data[1:]) # skip the first row, (header), and loop over the rest (actual biomarker data).
            if row and row[0].strip()  # Exclude completely empty rows and rows where the biomarker name (first column) is blank
            }  

        new_rows = []  # List to hold new rows to append
        new_biomarkers = []  # List to track newly added biomarkers
        skipped = written = 0  # Counters for skipped, and written records

        with open(file_path, encoding="utf-8") as f:  # Open the CSV file for reading
            reader = csv.reader(f)  # Create CSV reader
            next(reader)  # Skip header row
            for row in reader:  # Iterate over each row in CSV
                if not row or not row[0].strip():
                    skipped += 1  # Increment skipped counter for empty rows§
                    continue # Skip rows where biomarker name is missing 
                row = row[:6] + [""] * max(0, 6 - len(row))  # Pad row to 6 columns if some fields are missing
                ru_name = row[0].strip()  # Russian name of biomarker from first column
                value, unit, ref, comment = row[2:6]  # Extract value, unit, reference, and comment from columns 3-6
                key = normalize_key(ru_name) # Normalize the Russian name for consistent matching


                # Construct a new row: only Russian name in Column A, rest are empty except for new test date columns
                row = [ru_name] + [""] * (len(header_row) - 1)
                row[value_col_idx - 1] = value  # Set the value
                row[unit_col_idx - 1] = unit  # Set the unit
                row[ref_col_idx - 1] = ref  # Set the reference
                row[comment_col_idx - 1] = comment  # Set the comment
                new_rows.append(row)  # Add to rows to be appended
                new_biomarkers.append(ru_name)  # Track new biomarker
                written += 1  # Increment written counter

        if new_rows:  # If there are new rows to append
            sheet.append_rows(new_rows)  # Append all new rows to the sheet
            time.sleep(RATE_LIMIT_DELAY)  # Sleep to respect API rate limits

        return {  # Return summary dictionary of results
            "new": new_biomarkers,  # List of new biomarkers added
            "skipped": skipped,  # Number of skipped entries (unchanged)
            "written": written  # Total number of rows written or updated
        }

    except Exception as e:  # Catch any exceptions during processing
        logger.exception("Failed to process and update sheet")  # Log the exception with traceback
        return {"new": [], "skipped": 0, "written": 0}  # Return empty results on failure
