// src/lib/processDocumentFromStorage.ts

import { getDownloadURL, ref } from "firebase/storage";
import axios from "axios";
import { runOCR } from "./runOCR";
import { storage } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import { ParsedLLMOutputSchema } from "./zodSchemas";
import type { ParsedLLMOutput } from "./zodSchemas";
import { callLLMParser } from "./callLLMParser"; // ✅ Import real LLM call logic

/**
 * Processes a document stored in Firebase Storage:
 * - Downloads the file
 * - Runs OCR to extract text
 * - Sends the text to LLM to extract biomarkers
 * - Validates and stores result in Firestore
 *
 * @param path - The full storage path of the uploaded file
 * @returns Structured biomarker output and test date
 */
export async function processDocumentFromStorage(
    path: string,
    tenantId: string,
    fileId: string
): Promise<Pick<ParsedLLMOutput, "biomarkers"> & { testDate: string }> {
    // 1. Get public download URL for the file stored in Firebase
    const fileRef = ref(storage, path); // Reference to the uploaded file in Firebase Storage
    const fileUrl = await getDownloadURL(fileRef); // Generate public download URL

    // 2. Download the file contents as an ArrayBuffer
    const fileResponse = await axios.get(fileUrl, { responseType: "arraybuffer" }); // Download file data
    const imageBuffer = Buffer.from(fileResponse.data); // Convert to buffer for OCR

    // 3. Run OCR on the image buffer to extract raw text
    const extractedText = await runOCR(imageBuffer); // Extract plain text using OCR

    // 4. Send extracted text to actual LLM parser and validate the response
    const rawLLMResponse = await callLLMParser(extractedText); // Actual LLM call with OpenRouter
    const parsed = ParsedLLMOutputSchema.parse(rawLLMResponse); // Validate response using Zod

    const testDate = parsed.testMetadata.date; // Extract test date from parsed LLM output

    // 5. Store OCR text, review status, and parsed LLM output in Firestore
    await setDoc(
        doc(firestore, `tenants/${tenantId}/files/${fileId}`),
        {
            ocrText: extractedText, // Raw OCR output
            reviewStatus: "pending", // Default status for reviewers
            llmOutput: JSON.stringify(parsed), // Store full validated LLM output (as a string for later JSON.parse)
        },
        { merge: true }
    );

    // 6. Return the validated structure
    return {
        biomarkers: parsed.biomarkers,
        testDate: parsed.testMetadata.date,
    };
}