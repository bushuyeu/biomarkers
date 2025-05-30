// Import NextResponse to create HTTP responses in API routes
import { NextResponse } from "next/server";

// Configure this API route to always be dynamically rendered
export const dynamic = "force-dynamic";
// Allow dynamic parameters in this route
export const dynamicParams = true;

// Import Sentry for error logging and monitoring
import * as Sentry from "@sentry/nextjs";
// Import Zod to validate incoming request data
import { z } from "zod";

// Define the expected shape of the request body using Zod schema validation
const UploadSchema = z.object({
  path: z.string().min(1),      // Require a non-empty string for 'path'
  tenantId: z.string().min(1),  // Require a non-empty string for 'tenantId'
  userId: z.string().min(1),    // Require a non-empty string for 'userId'
});

// Define the POST handler for this API route
export async function POST(req: Request) {
  try {
    // Log that the route has been triggered
    console.log("🔔 /api/process-upload POST triggered");

    let body: unknown;   // Will store the parsed request body
    let rawBody = "";    // Will store the raw text body for debugging purposes

    // Extract the Content-Type header from the incoming request
    const contentType = req.headers.get("content-type") || "";
    // Ensure the Content-Type is 'application/json'
    if (!contentType.includes("application/json")) {
      console.error("❌ Invalid content-type:", contentType); // Log the error
      // Return a 415 Unsupported Media Type error
      return NextResponse.json({ error: "Content-Type must be application/json." }, { status: 415 });
    }

    try {
      // Read the raw request body as plain text
      rawBody = await req.text();
      // Throw an error if the body is empty or undefined
      if (!rawBody || rawBody.trim() === "" || rawBody === "undefined") {
        throw new Error("Request body is undefined or empty.");
      }
      // Parse the JSON string into a JavaScript object
      body = JSON.parse(rawBody);
    } catch (e) {
      // Log the parsing error and raw body content
      console.error("❌ Failed to parse JSON body. Raw content was:", rawBody, "\nError:", e);
      // Send the error to Sentry
      Sentry.captureException(e);
      // Return a 400 Bad Request error for malformed JSON
      return NextResponse.json({ error: "Malformed JSON in request body." }, { status: 400 });
    }

    try {
      // Validate and extract the required fields using the Zod schema
      const { path, userId, tenantId } = UploadSchema.parse(body);

      // Split the path string by '/' to get individual parts
      const parts = path.split("/");
      // Extract the last part of the path as the fileId
      const fileId = parts[parts.length - 1];

      // Log that the document processing is starting
      console.log("🧠 Starting document processing:", { path, tenantId, fileId });

      // Dynamically import the processing function to avoid build-time evaluation
      const { processDocumentFromStorage } = await import("@/lib/processDocumentFromStorage");

      // Add a breadcrumb in Sentry to trace the function call
      Sentry.addBreadcrumb({
        message: "Calling processDocumentFromStorage", // Message to appear in Sentry logs
        level: "info", // Log level
        data: { path, tenantId, fileId }, // Additional metadata
      });

      // Call the processing function with the provided inputs
      const result = await processDocumentFromStorage(path, tenantId, fileId, userId);

      // Return a successful JSON response with the result
      return NextResponse.json({ success: true, result });
    } catch (err) {
      // Log any validation or runtime processing errors
      console.error("❌ Invalid input or processing error:", err);
      // Capture the exception with Sentry
      Sentry.captureException(err);
      // Return a 400 Bad Request error for processing failures
      return NextResponse.json({ error: "Failed to process request." }, { status: 400 });
    }
  } catch (error) {
    // Catch any unhandled errors in the top-level try block
    console.error("❌ Error in /api/process-upload:", error);
    // Report the error to Sentry
    Sentry.captureException(error);
    // Return a generic 500 Internal Server Error response
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}