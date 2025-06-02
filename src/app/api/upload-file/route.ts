// This API route handles multipart file uploads to Firebase Storage,
// and writes matching metadata to Firestore so downstream processing can continue.
import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server"; // Import types for handling HTTP requests and responses
import { getAdminBucket } from "@/lib/firebaseAdmin"; // Utility to initialize Firebase Storage bucket

// Define a POST handler to receive file uploads
export async function POST(request: NextRequest) {
    try {
        // Parse multipart form data from the request
        const formData = await request.formData(); // Await and extract FormData from request
        const file = formData.get("file") as File | null; // Retrieve the file from the form
        const tenantId = formData.get("tenantId") as string; // Get tenant ID
        const userId = formData.get("userId") as string; // Get user ID
        const filename = formData.get("filename") as string; // Get original filename

        // Validate required form fields
        if (!file || !filename || !tenantId || !userId) {
            return NextResponse.json({ error: "Missing file or metadata" }, { status: 400 });
        }

        // Read file content into buffer for upload
        const arrayBuffer = await file.arrayBuffer(); // Convert file to ArrayBuffer
        const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer

        // Use the custom path provided by the frontend (e.g., including tenant/user hierarchy)
        const path = formData.get("path") as string;

        const bucket = getAdminBucket(); // Get Firebase storage bucket from Admin SDK

        // Log upload metadata to Sentry
        Sentry.captureMessage("🧾 Upload metadata received", {
            level: "info",
            extra: {
                file: file ? `${file.name} (${file.size} bytes)` : "null",
                filename,
                tenantId,
                userId,
                path,
            },
        });

        // Upload file to specified path in Firebase Storage
        await bucket.file(path).save(buffer, {
            contentType: file.type || "application/octet-stream", // Set content type or default
            metadata: {
                metadata: {
                    tenantId,
                    userId,
                },
            },
        });

        // 🧠 Extract fileId from filename (everything before the first dash)
        const fileId = filename.split("-")[0];

        // 📝 Write basic metadata document to Firestore so /api/process-upload can find it
        const { getAdminDb } = await import("@/lib/firebaseAdmin"); // Lazy import Firestore
        const db = getAdminDb(); // Get Firestore instance

        await db.doc(`tenants/${tenantId}/files/${fileId}`).set({
            fileId,
            storagePath: path,
            filename,
            uploaderUserId: userId,
            tenantId,
            createdAt: new Date().toISOString(),
            reviewStatus: "unprocessed",
        });

        // Return a success response
        return NextResponse.json({ success: true });
    } catch (error) {
        Sentry.captureException(error, {
            extra: {
                message: "❌ Failed to upload file",
            },
        });
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 }); // Respond with error message
    }
}