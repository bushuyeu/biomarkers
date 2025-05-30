// src/lib/processDocumentFromStorage.ts

import { getDownloadURL, ref } from "firebase/storage"; // Import Firebase Storage functions to get file URL and reference
import axios from "axios"; // Import axios for HTTP requests
import { runOCR } from "./runOCR"; // Import OCR function to extract text from images
import { storage } from "./firebase"; // Import initialized Firebase storage instance
import { doc, setDoc } from "firebase/firestore"; // Import Firestore functions to create document references and set documents
import { firestore } from "./firebase"; // Import initialized Firestore instance
import { ParsedLLMOutputSchema } from "./zodSchemas"; // Import Zod schema for validating parsed LLM output
import type { ParsedLLMOutput } from "./zodSchemas"; // Import TypeScript type for parsed LLM output
import { callLLMParser } from "./callLLMParser"; // ✅ Import real LLM call logic
import * as Sentry from "@sentry/nextjs"; // Import Sentry for error tracking and logging

/**
 * Processes a document stored in Firebase Storage:
 * - Downloads the file
 * - Runs OCR to extract text (for images)
 * - Sends the text or raw file content to LLM to extract biomarkers
 * - Validates and stores result in Firestore
 *
 * @param path - The full storage path of the uploaded file
 * @returns Structured biomarker output and test date
 */
export async function processDocumentFromStorage(
    path: string, // Storage path of the file
    tenantId: string, // Tenant ID for Firestore pathing
    fileId: string // File ID for Firestore document ID
): Promise<Pick<ParsedLLMOutput, "biomarkers"> & { testDate: string }> {
    // 1. Get public download URL for the file stored in Firebase
    const fileRef = ref(storage, path); // Reference to the uploaded file in Firebase Storage
    const fileUrl = await getDownloadURL(fileRef); // Generate public download URL

    // 2. Download the file contents as an ArrayBuffer
    const fileResponse = await axios.get(fileUrl, { responseType: "arraybuffer" }); // Download file data
    const fileBuffer = Buffer.from(fileResponse.data); // Convert to buffer for processing

    // 3. Determine file type by MIME type from response headers to decide processing path
    const mimeType = fileResponse.headers["content-type"]; // Get MIME type from response headers
    Sentry.captureMessage("🧾 Processing file with MIME type", { // Log processing info to Sentry
        level: "info", // Set log level to info
        extra: {
            path, // Include file path in log
            mimeType, // Include MIME type in log
            tenantId, // Include tenant ID in log
            fileId, // Include file ID in log
        },
    });
    const isImage = mimeType?.startsWith("image/"); // Check if file is an image based on MIME type

    let extractedText: string; // Variable to hold extracted text

    if (isImage) {
        // For image files, run OCR to extract plain text
        extractedText = await runOCR(fileBuffer); // Extract plain text using OCR
    } else {
        // For non-image files (e.g., PDFs), skip OCR and send raw file content as plain text to LLM
        // Convert buffer to string assuming UTF-8 encoding; adjust if necessary for other formats
        extractedText = fileBuffer.toString("utf-8"); // Convert file buffer to UTF-8 string
    }

    let parsed: ParsedLLMOutput;
    try {
        // 4. Send extracted text or raw content to actual LLM parser
        const rawLLMResponse = await callLLMParser(extractedText); // Actual LLM call with OpenRouter
        // Validate response using Zod schema
        parsed = ParsedLLMOutputSchema.parse(rawLLMResponse);
    } catch (error) {
        // Log any errors during LLM call or parsing to Sentry
        Sentry.captureException(error, {
            level: "error",
            extra: {
                path,
                tenantId,
                fileId,
                extractedTextSnippet: extractedText.slice(0, 200), // Include snippet for context
            },
        });
        // Rethrow error to propagate failure
        throw error;
    }

    const _testDate = parsed.testMetadata.date; // Extract test date from parsed LLM output
    const testType = parsed.testMetadata.type ?? "unknown"; // Use fallback "unknown" if undefined

    // 5. Store OCR text or raw content, review status, and parsed LLM output in Firestore
    await setDoc(
        doc(firestore, `tenants/${tenantId}/files/${fileId}`), // Reference Firestore document for this file
        {
            ocrText: extractedText, // Raw OCR output or raw text content
            reviewStatus: "pending", // Default status for reviewers
            testType, // Test type from parsed metadata or fallback
            llmOutput: JSON.stringify(parsed), // Store full validated LLM output (as a string for later JSON.parse)
        },
        { merge: true } // Merge with existing document data
    );

    // 6. Return the validated structure
    return {
        biomarkers: parsed.biomarkers, // Return extracted biomarkers
        testDate: _testDate, // Return test date
    };
}