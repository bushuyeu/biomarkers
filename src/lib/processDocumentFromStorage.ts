

// src/lib/processDocumentFromStorage.ts

import { getDownloadURL, ref } from "firebase/storage";
import axios from "axios";
import { runOCR } from "./runOCR";
import { storage } from "./firebase";

/**
 * Processes a document stored in Firebase Storage:
 * - Downloads the file
 * - Runs OCR to extract text
 * - Passes text to a placeholder LLM to extract biomarkers
 *
 * @param path - The full storage path of the uploaded file
 * @returns Structured biomarker output and test date
 */
export async function processDocumentFromStorage(path: string): Promise<{
  biomarkers: Array<{ name: string; value: number }>;
  testDate: string;
}> {
  // 1. Get public download URL for the file stored in Firebase
  const fileRef = ref(storage, path);
  const fileUrl = await getDownloadURL(fileRef);

  // 2. Download the file as a buffer from the URL (suitable for OCR engine)
  const fileResponse = await axios.get(fileUrl, { responseType: "arraybuffer" });
  const imageBuffer = Buffer.from(fileResponse.data);

  // 3. Run OCR on the image buffer to extract raw text from the uploaded document
  // This function uses Tesseract.js to convert visual text from scanned lab results into plain text
  // It's a reusable, backend-only utility and returns the raw OCR'd string for downstream processing
  const _extractedText = await runOCR(imageBuffer);

  // 4. Placeholder: simulate LLM call with mock parsing
  const biomarkers = [
    { name: "Hemoglobin", value: 13.7 },
    { name: "Cholesterol", value: 190 }
  ];
  const testDate = "2025-05-01";

  // In future: call your actual LLM service here using the extractedText

  // 5. Return the structured result
  return { biomarkers, testDate };
}