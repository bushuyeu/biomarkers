import os
import csv
import re
import gspread
from dotenv import load_dotenv
from oauth2client.service_account import ServiceAccountCredentials
from gspread.utils import rowcol_to_a1

load_dotenv()

SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
WORKSHEET_NAME = os.getenv("GOOGLE_WORKSHEET_NAME")
CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE")

def get_google_sheet():
    creds = ServiceAccountCredentials.from_json_keyfile_name(
        CREDENTIALS_FILE,
        scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    client = gspread.authorize(creds)
    sheet = client.open_by_key(SHEET_ID).worksheet(WORKSHEET_NAME)
    return sheet

def extract_test_date_from_csv(file_path):
    filename = os.path.basename(file_path)
    date_match = re.search(r"(\d{2})[-./](\d{2})[-./](\d{4})", filename)
    if date_match:
        return f"{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"

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
    return None

def count_biomarkers_in_file(file_path):
    with open(file_path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        count = sum(1 for row in reader if row and row[-1].strip())
    return count

def process_csv_and_update_sheet(file_path, test_date):
    sheet = get_google_sheet()
    data = sheet.get_all_values()
    header = data[0]
    body = data[1:]

    if test_date not in header:
        header.append(test_date)
        sheet.update('1:1', [header])

    test_col_index = header.index(test_date) + 1
    col_letter = chr(64 + test_col_index) if test_col_index <= 26 else f"R{test_col_index}"

    biomarker_map = {row[0].strip().lower(): i+2 for i, row in enumerate(body)}

    batch_data = {}
    new_biomarkers = []
    updated = 0
    skipped = 0
    row_index_offset = len(body) + 2

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
            if not biomarker_name or not value or value.lower() in {"значение", "-", ""}:
                continue
            biomarker_key = biomarker_name.lower()
            combined_value = f"{value} {unit}".strip()

            if biomarker_key not in biomarker_map:
                sheet.append_row([biomarker_name, row[1], row[2], row[3]] + [""] * (len(header) - 4))
                biomarker_map[biomarker_key] = row_index_offset
                data.append([biomarker_name, row[1], row[2], row[3]] + [""] * (len(header) - 4))
                new_biomarkers.append(biomarker_name)
                row_index_offset += 1

            row_idx = biomarker_map[biomarker_key]
            row_vals = data[row_idx-1] if row_idx-1 < len(data) else []
            existing_val = row_vals[test_col_index-1] if test_col_index-1 < len(row_vals) else ""

            if existing_val == combined_value:
                skipped += 1
                continue

            col = test_col_index
            if existing_val:
                while col-1 < len(row_vals) and row_vals[col-1]:
                    col += 1
            batch_data[(row_idx, col)] = combined_value
            updated += 1

    update_payload = [{
        'range': rowcol_to_a1(row, col),
        'values': [[value]]
    } for (row, col), value in batch_data.items()]

    if update_payload:
        sheet.batch_update(update_payload)

    return {
        "new": new_biomarkers,
        "updated": updated,
        "skipped": skipped,
        "written": updated + skipped,
        "col_letter": col_letter
    }
