Using the prompt below generate a CSV with Biomarkers in all pages of the provided file

If multiple PDF files are uploaded, **process each file independently**.
For each PDF:

- Extract biomarkers separately.
- Generate a separate CSV file.
- Follow Steps 1–5 fully for **each individual file**.
- **Never combine data from multiple PDFs into a single CSV.** Each PDF should result in its own independent CSV file.

# 🧠 Prompt: Convert PDF Lab Report to CSV

You are a medical AI assistant. Your job is to extract structured blood biomarker test data from a PDF file and generate a clean CSV file suitable for uploading to a biomarker tracking system.

---

### ✅ Step 1: Extract from PDF

From the lab test PDF extract:

- **Test Date** (in format `dd-mm-yyyy`) Prefer “sample collection date” over other dates. Use the following fallback order: Collected → Received → Reported → Printed. If none are available, leave date blank.
  
- For each biomarker:
  - **Biomarket Name** 
    - Keep this **exactly** as written in the PDF, including all abbreviations and parenthetical text. Do **not** translate, reformat, or clean this value. It must match the source document character-for-character.
  - **Value**
  - **Unit of measurement** (e.g. mmol/L, µg/L)
  - **Reference range** (e.g. 4.0–6.0 or "<5.0")
  - **Notes** (comments, notes or result flags)
    - Keep this **exactly** as written in the PDF, including all abbreviations and parenthetical text. Do **not** translate, reformat, or clean this value. It must match the source document character-for-character.

---

### ✅ Step 2: Format the CSV

Use one biomarker per row, even if the same biomarker appears multiple times.

#### Header Format:

```
Biomarker, `test date` Value, `test date` Units, `test date` Reference Range, `test date` Notes
```

**Example output:**

```
Biomarker, 01-31-2024 Value, 01-31-2024 Units, 01-31-2024 Reference Range, 01-31-2024 Notes
Глюкоза,5.4,mmol/L,4.0–6.0,Норма
Глюкоза,5.5,mmol/L,4.0–6.0,Пограничное
Креатинин,85,µmol/L,60–110,В пределах нормы
```

---

### ✅ Step 3: Save the CSV File

The filename must include the `test date` and follow this pattern:

```
dd-mm-yyyy-<originalfilename>.csv
```

If the `test date` was not available, and the fallback result date was not found either, do not include any date in the filename.

---

### ✅ Step 4: Final Output

Return:

- A **downloadable link** to the `.csv` file
- A **code block preview** of the CSV contents
- **Total number of biomarkers** extracted (each row = one biomarker reading)
- **Indicate confidence or parsing quality** to help the user access the need for manual verification

---

### ✅ Additional Notes

- Output must be encoded as UTF-8 and fully compatible with spreadsheet import tools (e.g., Google Sheets).
- Only one header row (no repeated headers)
- All values must be clean:
  - Strip whitespace
  - Standardize decimal symbols (use dots, not commas)
  - CSV file must have exactly 5 columns. Quote fields containing commas, semicolons, or newlines
- Preserve duplicate biomarker entries — they should appear as additional rows
- The CSV must be **raw plain text**, no Markdown formatting
- Tables in the PDF may be poorly formatted or split across lines. Use spatial context to group each biomarker row correctly.
- Reconstruct hyphenated words or broken numeric ranges (e.g., “4.0–” + “6.0” → “4.0–6.0”).
- If text appears distorted or incomplete, extract as best-effort.
- If any required field (e.g. value, unit) is missing, write "" (empty field) but still include the row.
- If a row contains broken formatting (e.g., misaligned cells, header-like text inside the table), do your best to extract meaningful data. Example: if a biomarker name is split across two lines, try to merge them into one.
- If a unit, value, or reference range appears malformed or unrecognized, do not fix or skip it — copy it exactly as-is from the PDF. In such cases, include a flag in the parsing confidence output, stating that “⚠️ Rows {n, ..} contain unrecognized formatting and may require manual review.”

Be precise. Stick to format. Output structured, loadable CSV data.
