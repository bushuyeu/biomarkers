import { NextRequest, NextResponse } from "next/server"; // Import types for handling HTTP requests and responses
import { getAdminBucket } from "@/lib/firebaseAdmin"; // Utility to initialize Firebase Storage bucket

// Define a POST handler to receive file uploads
export async function POST(request: NextRequest) {
    try {
        // Parse multipart form data from the request
        const formData = await request.formData(); // Await and extract FormData from request
        const file = formData.get("file") as File | null; // Retrieve the file from the form
        const path = formData.get("path") as string; // Get the desired upload path
        const tenantId = formData.get("tenantId") as string; // Get tenant ID
        const userId = formData.get("userId") as string; // Get user ID

        // Validate required form fields
        if (!file || !path || !tenantId || !userId) {
            return NextResponse.json({ error: "Missing file or metadata" }, { status: 400 });
        }

        // Read file content into buffer for upload
        const arrayBuffer = await file.arrayBuffer(); // Convert file to ArrayBuffer
        const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer

        const bucket = getAdminBucket(); // Get Firebase storage bucket from Admin SDK

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

        // Return a success response
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("❌ Failed to upload file:", error); // Log error on failure
        return NextResponse.json({ error: "Failed to upload file" }, { status: 500 }); // Respond with error message
    }
}