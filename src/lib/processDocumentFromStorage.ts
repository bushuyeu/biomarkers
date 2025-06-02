// src/lib/processDocumentFromStorage.ts

// Import Sentry for logging breadcrumbs and exceptions during runtime
import * as Sentry from "@sentry/nextjs";

// Import lazy getter functions for Firestore and Storage access
import { getAdminDb, getAdminBucket } from "./firebaseAdmin";

// Import Zod schemas to validate Firestore and LLM responses
import { ParsedLLMOutputSchema, FileMetadataSchema } from "./zodSchemas";

// Import the expected structure of the LLM output for TypeScript type checking
import type { ParsedLLMOutput } from "./zodSchemas";

/**
 * Main function that processes an uploaded document.
 * 1. Downloads file from Firebase Storage
 * 2. Extracts text via OCR or direct text conversion
 * 3. Parses the text with an LLM
 * 4. Validates and stores results in Firestore
 */
export async function processDocumentFromStorage(
    path: string,      // Firebase Storage path to the uploaded file
    tenantId: string,  // Tenant identifier from Firestore
    fileId: string,    // Unique ID for the file in Firestore
    userId: string     // ID of the user requesting processing
): Promise<Pick<ParsedLLMOutput, "biomarkers"> & { testDate: string }> {
    try {
        // Lazily initialize Firestore and Storage only at runtime
        const adminDb = getAdminDb();
        // Lazily initialize Firebase Storage bucket instance
        const adminBucket = getAdminBucket();

        // Dynamically load OCR and LLM parser modules (to prevent build-time issues)
        const { runOCR } = await import("./runOCR");
        const { callLLMParser } = await import("./callLLMParser");

        // Add Sentry breadcrumb for traceability of this process start
        Sentry.addBreadcrumb({
            message: "📥 processDocumentFromStorage triggered",
            category: "upload",
            level: "info",
            data: { path, tenantId, fileId },
        });

        // Log that processing has begun for monitoring
        Sentry.captureMessage("Started processing document", {
            level: "info",
            extra: { path, tenantId, fileId },
        });

        // Load the Firestore document representing the uploaded file metadata
        const fileRef = adminDb.doc(`tenants/${tenantId}/users/${userId}/files/${fileId}`);
        const fileSnap = await fileRef.get();

        // Throw an error if the file record is missing in Firestore
        if (!fileSnap.exists) {
            throw new Error("File not found");
        }

        // Parse and validate the file metadata using Zod schema to ensure expected structure
        const fileData = FileMetadataSchema.parse(fileSnap.data());

        // Verify the requesting user is allowed to process this file (owner or reviewer)
        const allowedUsers = [fileData.uploaderUserId, ...(fileData.reviewerUserIds || [])];
        if (!allowedUsers.includes(userId)) {
            throw new Error("Unauthorized: user does not have access to this file.");
        }

        // Retrieve the file object from Firebase Storage using the path
        const file = adminBucket.file(path);

        // Download the binary content of the file into memory buffer
        const [fileBuffer] = await file.download();

        // Fetch content type (MIME type) from file metadata for processing decisions
        const [metadata] = await file.getMetadata();
        const mimeType = metadata.contentType;

        // Log the MIME type for observability and debugging
        Sentry.captureMessage("Processing file with MIME type", {
            level: "info",
            extra: { path, mimeType, tenantId, fileId },
        });

        // Determine if the file is an image based on its MIME type prefix
        const isImage = mimeType?.startsWith("image/");
        let extractedText: string;

        // Track OCR execution time for performance monitoring
        const ocrStart = Date.now();

        // Run OCR if the file is an image, otherwise convert buffer to UTF-8 text
        if (isImage) {
            extractedText = await runOCR(fileBuffer);
        } else {
            extractedText = fileBuffer.toString("utf-8");
        }

        // Calculate and log how long OCR took for metrics
        const ocrDuration = Date.now() - ocrStart;
        Sentry.captureMessage("OCR duration", {
            level: "info",
            extra: { ocrDurationMs: ocrDuration, isImage },
        });

        let parsed: ParsedLLMOutput;

        try {
            // Track LLM parsing duration for performance insights
            const llmStart = Date.now();

            // Call the LLM parser on the extracted text to extract biomarkers
            const rawLLMResponse = await callLLMParser(extractedText);

            // Validate the LLM response structure with Zod to ensure correctness
            parsed = ParsedLLMOutputSchema.parse(rawLLMResponse);

            // Log how long the LLM parsing took for monitoring
            const llmDuration = Date.now() - llmStart;
            Sentry.captureMessage("LLM parse duration", {
                level: "info",
                extra: { llmDurationMs: llmDuration },
            });
        } catch (error) {
            // If LLM parsing or validation fails, log the error with a preview of the text
            Sentry.captureException(error, {
                level: "error",
                extra: {
                    path,
                    tenantId,
                    fileId,
                    extractedTextSnippet: extractedText.slice(0, 200),
                },
            });
            // Re-throw to be caught by outer catch
            throw error;
        }

        // Extract metadata fields from the validated LLM output
        const _testDate = parsed.testMetadata.date;
        const testType = parsed.testMetadata.type ?? "unknown";

        // Log that we're about to write parsed output to Firestore for traceability
        Sentry.addBreadcrumb({
            message: "Writing parsed LLM output to Firestore",
            category: "firestore",
            level: "info",
            data: { tenantId, fileId, testType },
        });

        // Write the extracted text and parsed LLM output to Firestore document, merging fields
        await adminDb.doc(`tenants/${tenantId}/users/${userId}/files/${fileId}`).set(
            {
                ocrText: extractedText,               // Store OCR or raw text for review
                reviewStatus: "pending",              // Set initial review status
                testType,                             // Save test type (e.g., blood, urine)
                llmOutput: JSON.stringify(parsed),   // Store LLM output as JSON string for re-use
            },
            { merge: true } // Merge with existing Firestore document fields to avoid overwrites
        );

        // Confirm successful Firestore write with a log message
        Sentry.captureMessage("Firestore write succeeded", {
            level: "info",
            extra: { tenantId, fileId, testType },
        });

        // Return key parts of the parsed result to the caller for further use
        return {
            biomarkers: parsed.biomarkers, // List of extracted biomarkers
            testDate: _testDate,           // Standardized test date for reference
        };
    } catch (error) {
        // Catch and log any unexpected errors during processing
        Sentry.captureException(error, {
            extra: { message: "Error in processDocumentFromStorage", path, tenantId, fileId },
        });
        // Re-throw to propagate error upstream
        throw error;
    }
}