// Import NextResponse to format API route responses
import { NextResponse } from "next/server";

// Import the function that processes documents from Firebase Storage
import { processDocumentFromStorage } from "@/lib/processDocumentFromStorage";

// Import Sentry for error reporting and logging
import * as Sentry from "@sentry/nextjs";

// Import Zod library to validate request payloads
import { z } from "zod";

// Define the expected shape of the incoming request using Zod schema
const UploadSchema = z.object({
  path: z.string().min(1),       // 'path' must be a non-empty string
  tenantId: z.string().min(1),   // 'tenantId' must be a non-empty string
  userId: z.string().min(1),     // 'userId' must be a non-empty string
});

/**
 * Handles POST requests to the /api/process-upload endpoint.
 * Validates input, extracts fileId, and processes the document in Firebase Storage.
 */
export async function POST(req: Request) {
  try {
    // Log when the endpoint is hit
    console.log("🔔 /api/process-upload POST triggered");

    let body: unknown;
    try {
      // Attempt to parse the request body as JSON
      body = await req.json();
    } catch (e) {
      // Log and report error if JSON parsing fails
      console.error("❌ Failed to parse JSON body:", e);
      Sentry.captureException(e);
      return NextResponse.json({ error: "Malformed JSON in request body." }, { status: 400 });
    }

    let path: string;
    let userId: string;
    let tenantId: string;

    try {
      // Validate and extract fields from the request body using the Zod schema
      ({ path, userId, tenantId } = UploadSchema.parse(body));
    } catch (err) {
      // Log and report schema validation errors
      console.error("❌ Invalid input schema:", err);
      Sentry.captureException(err);
      return NextResponse.json({ error: "Invalid request body structure." }, { status: 400 });
    }

    // Split the 'path' into parts to extract the fileId
    const parts = path.split('/'); // Split the path into its segments
    const fileId = parts[parts.length - 1]; // Use the last segment as fileId

    // Log the start of processing with context
    console.log("🧠 Starting document processing:", { path, tenantId, fileId });

    // Add a Sentry breadcrumb for tracking execution flow
    Sentry.addBreadcrumb({
        message: "Calling processDocumentFromStorage",
        level: "info",
        data: { path, tenantId, fileId }
    });

    // Call processing logic and pass userId to enforce ownership checks
    const result = await processDocumentFromStorage(path, tenantId, fileId, userId);

    // Respond to the client with the result of the processing
    return NextResponse.json({ success: true, result });
  } catch (error) {
    // Catch any unhandled errors, log and report them
    console.error("❌ Error in /api/process-upload:", error);
    Sentry.captureException(error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}