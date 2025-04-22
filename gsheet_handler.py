import os # Import the operating system module, used here for path manipulation and environment variables
import csv
import re
import gspread
import logging
import time
from dotenv import load_dotenv
from oauth2client.service_account import ServiceAccountCredentials
from gspread.utils import rowcol_to_a1
from typing import List, Tuple

load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
WORKSHEET_NAME = os.getenv("GOOGLE_WORKSHEET_NAME")
CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE")

# API throttling parameters
MAX_BATCH_SIZE = 50  # Maximum number of cells to update in a single batch
RATE_LIMIT_DELAY = 1  # Seconds to wait between API calls

def validate_csv_format(file_path: str) -> List[Tuple[int, List[str]]]:
    """Check that each row in the file has exactly 6 fields. Return list of (row_num, row) for invalid ones."""
    invalid_rows = []
    try:
        with open(file_path, newline='', encoding='utf-8') as f:
            reader = csv.reader(f)
            for idx, row in enumerate(reader, start=1):
                if len(row) != 6:
                    invalid_rows.append((idx, row))
    except Exception as e:
        logger.exception("Failed to validate CSV format: %s", e)
    return invalid_rows


def get_google_sheet() -> gspread.Worksheet:
    """Authorize and get the Google Sheet worksheet."""
    try:
        creds = ServiceAccountCredentials.from_json_keyfile_name(
            CREDENTIALS_FILE,
            scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        client = gspread.authorize(creds)
        sheet = client.open_by_key(SHEET_ID).worksheet(WORKSHEET_NAME)
        return sheet
    except Exception as e:
        logger.exception("Failed to get Google Sheet: %s", e)
        raise

def extract_test_date_from_csv(file_path: str) -> str:
    """Extract test date from the CSV filename or its headers."""
    filename = os.path.basename(file_path)
    date_match = re.search(r"(\d{2})[-./](\d{2})[-./](\d{4})", filename)
    if date_match:
        return f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"

    try:
        with open(file_path, newline='', encoding='utf-8') as f:
            reader = csv.reader(f)
            for _ in range(5):
                try:
                    headers = next(reader)
                except StopIteration:
                    break
                for i, cell in enumerate(headers):
                    if re.match(r"дата[\s_-]?анализа", cell.strip().lower()):
                        date_raw = headers[i + 1].strip() if i + 1 < len(headers) else ""
                        match = re.match(r"(\d{2})[-./](\d{2})[-./](\d{4})", date_raw)
                        if match:
                            return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    except Exception as e:
        logger.exception("Failed to extract test date from CSV: %s", e)
    return None

def count_biomarkers_in_file(file_path: str) -> int:
    """Count the number of biomarkers in the given CSV file."""
    count = 0
    try:
        with open(file_path, newline='', encoding='utf-8') as f:
            reader = csv.reader(f)
            # Skip the first row if it contains "Дата анализа"
            first_row = next(reader, None)
            if first_row and first_row[0].strip().lower() == "дата анализа":
                next(reader, None)  # Skip header row
            count = sum(1 for row in reader if len(row) == 6) #revisit
    except Exception as e:
        logger.exception("Failed to count biomarkers in file: %s", e)
    return count

def process_csv_and_update_sheet(file_path: str, test_date: str) -> dict:
    """Process the CSV file and update the Google Sheet with the data."""
    if not test_date:
        logger.warning("No test date provided, cannot update sheet without date columns")
        return {"new": [], "updated": 0, "skipped": 0, "written": 0}
    
    # Read all biomarker data from CSV first to minimize API calls
    csv_biomarkers = []
    try:
        with open(file_path, newline='', encoding='utf-8') as f:
            reader = csv.reader(f)
            first_row = next(reader, None)
            
            # Skip the date row if present
            if first_row and first_row[0].strip().lower() == "дата анализа":
                next(reader, None)  # Skip header row after date
            
            for row in reader:
                if len(row) < 6:
                    continue
                
                biomarker_name = row[0].strip() or row[1].strip()
                value = row[2].strip()
                unit = row[3].strip()
                reference_value = row[4].strip()
                comment = row[5].strip()
                
                if not biomarker_name or not value or value.lower() in {"значение", "-", ""}:
                    continue
                
                csv_biomarkers.append({
                    "name": biomarker_name,
                    "name_en": row[1].strip(),
                    "value": value,
                    "unit": unit,
                    "reference": reference_value,
                    "comment": comment
                })
    except Exception as e:
        logger.exception(f"Failed to read CSV file: {e}")
        return {"new": [], "updated": 0, "skipped": 0, "written": 0}
    
    if not csv_biomarkers:
        logger.warning("No valid biomarkers found in CSV")
        return {"new": [], "updated": 0, "skipped": 0, "written": 0}
    
    # Get the sheet once
    try:
        sheet = get_google_sheet()
        
        # Check if date columns already exist
        header_row = sheet.row_values(1)
        if f"{test_date} Значение" not in header_row:
            # Add date columns
            date_columns = [
                f"{test_date} Значение", 
                f"{test_date} Единицы", 
                f"{test_date} Референсное значение", 
                f"{test_date} Комментарий"
            ]
            new_header = header_row + date_columns
            sheet.update('1:1', [new_header])
            time.sleep(RATE_LIMIT_DELAY)  # Respect rate limits
            header_row = new_header  # Update in memory to avoid another API call
        
        # Get column indices
        value_col_idx = header_row.index(f"{test_date} Значение") + 1  # 1-indexed for gspread
        unit_col_idx = header_row.index(f"{test_date} Единицы") + 1
        ref_col_idx = header_row.index(f"{test_date} Референсное значение") + 1
        comment_col_idx = header_row.index(f"{test_date} Комментарий") + 1

        # Get all existing biomarkers at once
        all_data = sheet.get_all_values()
        
        # Create biomarker to row mapping (lowercased for case-insensitive matching)
        biomarker_to_row = {row[0].strip().lower(): idx + 1 for idx, row in enumerate(all_data) if idx > 0 and row[0].strip()}
        
        # Track new biomarkers to append
        new_biomarkers = []
        updated_count = 0
        skipped_count = 0
        
        # Prepare batch updates
        batch_updates = []
        new_rows = []
        
        # Process each biomarker
        for biomarker in csv_biomarkers:
            biomarker_key = biomarker["name"].lower()
            
            if biomarker_key in biomarker_to_row:
                # Biomarker exists, check if value already exists
                row_idx = biomarker_to_row[biomarker_key]
                ## to do - explain what it does 
                row_data = all_data[row_idx - 1] if row_idx - 1 < len(all_data) else [] 
                
                # Check if value already exists for this specific biomarker for the same date we are currently processing
                if (value_col_idx - 1 < len(row_data) and 
                    row_data[value_col_idx - 1] == biomarker["value"]):
                    skipped_count += 1
                    continue
                
                # Add to batch update to overwrite for an existing value or to post a new one 
                # to-do remove overwrites - talk to the user
                #explain the datastructure - each dict contains a range of the google sheet cell ranges and the values are the values that will be replaced in the according cells
                batch_updates.extend([
                    {'range': f"{rowcol_to_a1(row_idx, value_col_idx)}", 'values': [[biomarker["value"]]]},
                    {'range': f"{rowcol_to_a1(row_idx, unit_col_idx)}", 'values': [[biomarker["unit"]]]},
                    {'range': f"{rowcol_to_a1(row_idx, ref_col_idx)}", 'values': [[biomarker["reference"]]]},
                    {'range': f"{rowcol_to_a1(row_idx, comment_col_idx)}", 'values': [[biomarker["comment"]]]}
                ])
                updated_count += 1
            else:
                # New biomarker, prepare for append
                new_biomarkers.append(biomarker["name"])
                
                # Create a row with blanks that will fit the current sheet width
                new_row = [biomarker["name"], biomarker["name_en"]] + [""] * (len(header_row) - 2)
                
                # Add date values at the correct positions
                new_row[value_col_idx - 1] = biomarker["value"]
                new_row[unit_col_idx - 1] = biomarker["unit"]
                new_row[ref_col_idx - 1] = biomarker["reference"]
                new_row[comment_col_idx - 1] = biomarker["comment"]
                
                new_rows.append(new_row)
                updated_count += 1
                
                # Update the mapping for potential future references
                next_row_idx = len(all_data) + len(new_rows)
                biomarker_to_row[biomarker_key] = next_row_idx
        
        # Add new biomarkers in bulk (more efficient)
        if new_rows:
            logger.info(f"Adding {len(new_rows)} new biomarkers")
            sheet.append_rows(new_rows)
            time.sleep(RATE_LIMIT_DELAY)  # Respect rate limits
        
        # Process batch updates in smaller chunks to avoid hitting rate limits
        if batch_updates:
            for i in range(0, len(batch_updates), MAX_BATCH_SIZE):
                chunk = batch_updates[i:i + MAX_BATCH_SIZE]
                logger.info(f"Processing batch update chunk {i//MAX_BATCH_SIZE + 1} of {(len(batch_updates) + MAX_BATCH_SIZE - 1) // MAX_BATCH_SIZE}")
                sheet.batch_update(chunk)
                if i + MAX_BATCH_SIZE < len(batch_updates):
                    time.sleep(RATE_LIMIT_DELAY)  # Wait between batches
        
        return {
            "new": new_biomarkers,
            "updated": updated_count,
            "skipped": skipped_count,
            "written": updated_count
        }
    
    except Exception as e:
        logger.exception(f"Error in process_csv_and_update_sheet: {e}")
        return {"new": [], "updated": 0, "skipped": 0, "written": 0}