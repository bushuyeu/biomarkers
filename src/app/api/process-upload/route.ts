// Import NextResponse to create HTTP responses in Next.js API routes
import { NextResponse } from "next/server";           // 👈 Handles JSON responses

// Import Sentry for error monitoring in production
import * as Sentry from "@sentry/nextjs";             // 👈 Sends exceptions / breadcrumbs to Sentry

// Import Zod for request‑body schema validation
import { z } from "zod";                              // 👈 Runtime validation of incoming JSON

// Import a typed Firestore instance from your Firebase Admin helper
import { getFirestore } from "@/lib/firebaseAdmin";   // 👈 Ensures we reuse existing Admin SDK singleton

// Import the project‑wide logger (winston/pino wrapper)
import { logger } from "@/lib/logger";                // 👈 Uniform structured logging

/* ────────────────────────────────────────────────────────────────────────── *\
   Route configuration – keep these so the endpoint is always server‑side.
\* ────────────────────────────────────────────────────────────────────────── */
export const dynamic = "force-dynamic";               // 👈 Disable ISR / static optimisation
export const dynamicParams = true;                    // 👈 Allow dynamic route segments

/* ────────────────────────────────────────────────────────────────────────── *\
   Schema describing the JSON payload we expect from the front‑end.
\* ────────────────────────────────────────────────────────────────────────── */
const UploadSchema = z.object({
  path: z.string().min(1),                            // 👈 Full GCS path of uploaded file
  tenantId: z.string().min(1),                        // 👈 Tenant identifier (namespace)
  userId: z.string().min(1),                          // 👈 UID of the user who uploaded
});

/* ────────────────────────────────────────────────────────────────────────── *\
   POST /api/process-upload – enqueue a processing job and return 202 Accepted.
   All heavy OCR / LLM work is handled asynchronously by a Cloud Function
   that listens to the “processingQueue” collection.
\* ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  logger.info("🔔 /api/process-upload POST triggered");          // 👈 Entry log

  /* ---- 1. Guard content‑type ------------------------------------------------ */
  const contentType = req.headers.get("content-type") || "";     // 👈 Get Content‑Type header
  if (!contentType.includes("application/json")) {               // 👈 Reject non‑JSON bodies
    return NextResponse.json(                                    // 👈 Respond with 415 Unsupported Media Type
      { error: "Content-Type must be application/json." },
      { status: 415 },
    );
  }

  /* ---- 2. Read and validate body ------------------------------------------- */
  const rawBody = await req.text();                              // 👈 Read body as string
  if (!rawBody || rawBody.trim() === "" || rawBody === "undefined") { // 👈 Empty / undefined guard
    return NextResponse.json(                                    // 👈 Respond 400 Bad Request
      { error: "Request body empty." },
      { status: 400 },
    );
  }

  let parsed: z.infer<typeof UploadSchema>;                      // 👈 Type of validated payload
  try {
    parsed = UploadSchema.parse(JSON.parse(rawBody));            // 👈 Parse + validate with Zod
  } catch (err) {
    Sentry.captureException(err);                                // 👈 Report validation errors
    return NextResponse.json(                                    // 👈 Respond 400 if malformed
      { error: "Malformed payload." },
      { status: 400 },
    );
  }

  /* ---- 3. Derive additional fields ----------------------------------------- */
  const { path, tenantId, userId } = parsed;                     // 👈 Destructure validated values
  const fileId = path.split("/").pop() as string;                // 👈 Extract fileId from path

  /* ---- 4. Enqueue Firestore job -------------------------------------------- */
  try {
    const db = getFirestore();                                   // 👈 Reuse Admin SDK Firestore
    await db.collection("processingQueue")                       // 👈 Write to top‑level queue
      .add({                                                     // 👈 Add new job document
        path,                                                    // 👈 Storage object path
        tenantId,                                                // 👈 Tenant namespace
        userId,                                                  // 👈 Uploader UID
        fileId,                                                  // 👈 Short file identifier
        status: "PENDING",                                       // 👈 Initial job status
        createdAt: new Date(),                                   // 👈 Timestamp for ordering
      });
    logger.info("📬 Job enqueued in processingQueue", { fileId }); // 👈 Success log
  } catch (err) {
    logger.error("🚫 Failed to enqueue processing job", err);    // 👈 Error log
    Sentry.captureException(err);                                // 👈 Report to Sentry
    return NextResponse.json(                                    // 👈 Respond 500 Internal Server Error
      { error: "Failed to enqueue job." },
      { status: 500 },
    );
  }

  /* ---- 5. Respond immediately ---------------------------------------------- */
  return NextResponse.json(                                      // 👈 202 Accepted – job queued
    { ok: true },
    { status: 202 },
  );
}