
/* ───────────────────────────── Firebase imports ─────────────────────────── */
import {                                   // Import from Firebase Functions v2
  onDocumentCreated,                       //  ↳ Firestore onCreate trigger
} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger"; // Cloud‑native structured logging

/* ───────────────────────────── Admin SDK setup ──────────────────────────── */
import { initializeApp } from "firebase-admin/app";   // Initialise Admin SDK
import { getStorage } from "firebase-admin/storage";  // Access Cloud Storage

initializeApp();                           // Ensure Admin SDK is initialised exactly once

/* ──────────────── Shared heavy‑lifting logic (OCR + LLM) ────────────────── */
import {
  processDocumentFromStorage,              //  ↳ Does OCR, LLM parsing, Firestore writes
} from "./pipelines/processDocumentFromStorage"; // Local pipeline helper

/* ─────────────────────────── Firestore trigger v2 ───────────────────────── */
export const processDocumentJob = onDocumentCreated( // Export Cloud Function
  "processingQueue/{jobId}",              // Path pattern (wildcard for jobId)
  async (event) => {                      // Async handler
    const jobData = event.data?.data();   // Extract raw job document data
    if (!jobData) {                       // Guard against missing data
      logger.error("Job document empty – should never happen"); // Log error
      return;                             // Exit early (no throw to avoid retry loop)
    }

    // Destructure required fields from job document
    const { path, tenantId, userId, fileId } = jobData as {
      path: string;                       // Full GCS path of uploaded file
      tenantId: string;                   // Tenant namespace
      userId: string;                     // Uploader UID
      fileId: string;                     // Short file identifier
    };

    logger.info("📥 Job picked up", { tenantId, fileId }); // Log start

    // Double‑check that the object actually exists in GCS before processing
    const bucket = getStorage().bucket(); // Reference default bucket
    const file = bucket.file(path);       // Reference target file
    const [exists] = await file.exists(); // Check existence
    if (!exists) {                        // If object not found (should be rare)
      const msg = `File not found: ${path}`; // Compose error message
      logger.error(msg);                  // Log error
      await event.data!.ref.update({      // Update job doc with ERROR status
        status: "ERROR",
        error: msg,
        finishedAt: new Date(),
      });
      return;                             // Exit early – no further processing
    }

    /* ──────────────── Run OCR + LLM parsing inside try/catch ─────────────── */
    try {
      // Call shared helper; returns { biomarkers, testDate }
      const result = await processDocumentFromStorage(
        path,          // GCS path
        tenantId,      // Tenant namespace
        fileId,        // File identifier
        userId,        // Requesting UID
      );

      // Persist success status & any lightweight summary (optional)
      await event.data!.ref.update({
        status: "DONE",                   // Mark as completed
        summary: {                        // Minimal summary for front‑end
          biomarkers: result.biomarkers.length,
          testDate: result.testDate,
        },
        finishedAt: new Date(),           // Timestamp end
      });

      logger.info("✅ Document processed", { fileId }); // Log success
    } catch (err) {
      // Handle any runtime errors from OCR / LLM helper
      logger.error("🚨 Document processing failed", err as Error); // Log error

      // Update job doc so UI can surface the failure
      await event.data!.ref.update({
        status: "ERROR",
        error: (err as Error).message,
        finishedAt: new Date(),
      });

      throw err;                           // Re‑throw so Cloud Functions marks failure
    }
  },
);
