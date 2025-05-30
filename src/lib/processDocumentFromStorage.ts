// src/lib/processDocumentFromStorage.ts

import { adminBucket } from "./firebaseAdmin"; // Import Admin SDK bucket for file download
import axios from "axios"; // Import axios for HTTP requests
import { runOCR } from "./runOCR"; // Import OCR function to extract text from images
import { doc, setDoc } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
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
    Sentry.addBreadcrumb({
        message: "📥 processDocumentFromStorage triggered",
        category: "upload",
        level: "info",
        data: { path, tenantId, fileId },
    });

    Sentry.captureMessage("Started processing document", {
        level: "info",
        extra: { path, tenantId, fileId },
    });

    // 1. Get file reference and download contents using Admin SDK
    const file = adminBucket.file(path); // Get file reference using Admin SDK
    const [fileBuffer] = await file.download(); // Download file directly as a buffer

    // 3. Determine file type by MIME type from response headers to decide processing path
    // Note: Admin SDK file object does not provide MIME type directly, so fallback to file metadata
    const [metadata] = await file.getMetadata();
    const mimeType = metadata.contentType; // Get MIME type from metadata
    Sentry.captureMessage("Processing file with MIME type", { // Log processing info to Sentry
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

    Sentry.addBreadcrumb({
        message: " Writing parsed LLM output to Firestore",
        category: "firestore",
        level: "info",
        data: { tenantId, fileId, testType },
    });

    // 5. Store OCR text or raw content, review status, and parsed LLM output in Firestore
    await setDoc(
        doc(adminDb, `tenants/${tenantId}/files/${fileId}`), // Reference Firestore document for this file
        {
            ocrText: extractedText, // Raw OCR output or raw text content
            reviewStatus: "pending", // Default status for reviewers
            testType, // Test type from parsed metadata or fallback
            llmOutput: JSON.stringify(parsed), // Store full validated LLM output (as a string for later JSON.parse)
        },
        { merge: true } // Merge with existing document data
    );
    Sentry.captureMessage("Firestore write succeeded", {
        level: "info",
        extra: {
            tenantId,
            fileId,
            testType,
        },
    });

    // 6. Return the validated structure
    return {
        biomarkers: parsed.biomarkers, // Return extracted biomarkers
        testDate: _testDate, // Return test date
    };
}