import os
import csv
import re
import gspread
import logging
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
            next(reader)  # Skip header
            count = sum(1 for row in reader if row and row[-1].strip())
    except Exception as e:
        logger.exception("Failed to count biomarkers in file: %s", e)
    return count

def process_csv_and_update_sheet(file_path: str, test_date: str) -> dict:
    """Process the CSV file and update the Google Sheet with the data."""
    sheet = get_google_sheet()
    data = sheet.get_all_values()
    header = data[0]
    body = data[1:]

    # Check if test_date is already in header; if not, add it.
    if test_date not in header:
        header += [f"{test_date} Значение", f"{test_date} Единицы", f"{test_date} Референсное значение", f"{test_date} Комментарий"]
        sheet.update('1:1', [header])

    test_col_index = header.index(f"{test_date} Значение") + 1
    row_index_offset = len(body) + 2

    # Create a mapping of biomarker names to their row indices
    biomarker_map = {row[0].strip().lower(): i + 2 for i, row in enumerate(body)}

    batch_data = {}
    new_biomarkers = []
    updated = 0
    skipped = 0

    try:
        with open(file_path, newline='', encoding='utf-8') as f:
            reader = csv.reader(f)
            headers = next(reader)
            if headers[0].strip().lower() == "дата анализа":
                next(reader)
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
                biomarker_key = biomarker_name.lower()

                # Add new biomarker if not already in the sheet
                if biomarker_key not in biomarker_map:
                    sheet.append_row([biomarker_name, row[1], value, unit, reference_value, comment] + [""] * (len(header) - 6))
                    biomarker_map[biomarker_key] = row_index_offset
                    data.append([biomarker_name, row[1], value, unit, reference_value, comment] + [""] * (len(header) - 6))
                    new_biomarkers.append(biomarker_name)
                    row_index_offset += 1

                row_idx = biomarker_map[biomarker_key]
                existing_val = data[row_idx - 1][test_col_index - 1] if row_idx - 1 < len(data) else ""

                # Skip if the value already exists
                if existing_val == value:
                    skipped += 1
                    continue

                # Find the next available column for the value
                col = test_col_index
                while col - 1 < len(data[row_idx - 1]) and data[row_idx - 1][col - 1]:
                    col += 1
                batch_data[(row_idx, col)] = value
                updated += 1

        # Update the sheet with new values
        update_payload = [{
            'range': rowcol_to_a1(row, col),
            'values': [[value]]
        } for (row, col), value in batch_data.items()]

        if update_payload:
            sheet.batch_update(update_payload)

    except Exception as e:
        logger.exception("Failed to process CSV and update sheet: %s", e)

    return {
        "new": new_biomarkers,
        "updated": updated,
        "skipped": skipped,
        "written": updated + skipped
    }
