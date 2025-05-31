// upload/page.tsx
'use client'; // Enables client-side rendering for this component in Next.js App Router

import { Badge } from "@/components/ui/badge"; // Import Badge component for displaying status labels
  import {
    Dropzone, // Import Dropzone component to handle file drag-and-drop area
    DropZoneArea, // Import DropZoneArea component for defining the drop target area
    DropzoneFileList, // Import DropzoneFileList component to list uploaded files
    DropzoneFileListItem, // Import DropzoneFileListItem component to represent each file item
    DropzoneFileMessage, // Import DropzoneFileMessage component to show messages related to files
    DropzoneTrigger, // Import DropzoneTrigger component to trigger file selection dialog
    DropzoneMessage, // Import DropzoneMessage component to display general dropzone messages
    DropzoneRemoveFile, // Import DropzoneRemoveFile component to remove a file from the list
    DropzoneRetryFile, // Import DropzoneRetryFile component to retry uploading a failed file
    InfiniteProgress, // Import InfiniteProgress component to show upload progress animation
    useDropzone, // Import useDropzone hook to manage dropzone state and logic
  } from "@/components/ui/dropzone"; // Import all dropzone related components and hooks from UI library

  import { CloudUploadIcon, Trash2Icon, RotateCcwIcon, FileIcon } from "lucide-react"; // Add missing icons used in Dropzone components

// Import required Firebase Auth utilities
import { User } from 'firebase/auth'; // Import User type from Firebase Auth for typing user prop


import { AppSidebar } from "@/components/app-sidebar" // Import application sidebar component
import { SiteHeader } from "@/components/site-header" // Import site header component
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar" // Import sidebar layout components


import { useAuth } from "@/auth/useAuth"; // ✅ Add import to use the shared auth context for user authentication state

function MultiFiles({ user }: { user: User }) { // Define MultiFiles component that accepts a Firebase User object as prop
  const dropzone = useDropzone({ // Initialize dropzone hook with configuration for file handling
    onDropFile: async (file) => { // Define async function to handle file drop event
      try {
          if (!user) throw new Error("User must be logged in to upload files."); // Check if user is logged in, throw error if not

          // Construct the destination path on Firebase Storage
          const storagePath = `users/${user.uid}/uploads/${Date.now()}-${file.name}`; // Create unique storage path using user ID and timestamp

          // Step 1: Send the file to the backend using FormData
          const formData = new FormData(); // Create new FormData object to send file and metadata
          formData.append("file", file); // Append the file to FormData under key "file"
          formData.append("path", storagePath); // Pass the desired storage path to the backend
          formData.append("tenantId", "Awesome Biomarkers Operator"); // Pass tenant ID as metadata
          formData.append("userId", user.uid); // Pass user ID as metadata

          const uploadRes = await fetch("/api/upload-file", { // Make POST request to backend API to upload file
              method: "POST", // Use POST method for file upload
              body: formData, // Send FormData as request body, automatically sets multipart/form-data
          });

          if (!uploadRes.ok) { // Check if response status indicates failure
              throw new Error("Failed to upload file to server."); // Throw error if upload failed
          }

          // Step 2: Trigger backend document processing after upload
          await fetch("/api/process-upload", { // Make POST request to initiate processing of uploaded file
              method: "POST", // Use POST method for processing trigger
              headers: { "Content-Type": "application/json" }, // Set content type to JSON
              body: JSON.stringify({ // Send JSON payload with file path and user info
                  path: storagePath, // Include storage path of uploaded file
                  tenantId: "Awesome Biomarkers Operator", // Include tenant ID
                  userId: user.uid, // Include user ID
              }),
          });

          return { status: "success", result: undefined }; // Return success status if all steps complete
      } catch (error) {
          console.error("Upload failed", error); // Log any errors that occur during upload or processing
          return { status: "error", error: "Failed to upload file" }; // Return error status for UI feedback
      }
    },
    validation: {
      maxFiles: 10, // Limit the maximum number of files that can be uploaded to 10
    },
  });

  return ( // Render the dropzone UI and file list
    <div className="not-prose flex flex-col gap-4"> {/* Container div with vertical flex layout and spacing */}
      <Dropzone {...dropzone}> {/* Render Dropzone component with dropzone hook props spread */}
        <div> {/* Wrapper div for dropzone content */}
          <div className="flex justify-between"> {/* Flex container to space out dropzone message */}
            <DropzoneMessage /> {/* Display general dropzone status or instructions */}
          </div>
          <DropZoneArea> {/* Define the active drop target area */}
            <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm"> {/* Trigger area for file selection dialog */}
              <CloudUploadIcon className="size-8" /> {/* Display upload cloud icon */}
              <div> {/* Container for upload instructions */}
                <p className="font-semibold">Upload files</p> {/* Bold heading prompting user to upload */}
                <p className="text-sm text-muted-foreground"> {/* Subtext with muted color */}
                  Click here or drag and drop to upload. Please select up to 10 files. {/* Instructions for user */}
                </p>
              </div>
            </DropzoneTrigger>
          </DropZoneArea>
        </div>

        <DropzoneFileList className="flex flex-col gap-3"> {/* Display list of files with vertical spacing */}
          {dropzone.fileStatuses.map((file) => ( // Map over each file status to render file list item
            <DropzoneFileListItem
              className="flex flex-col gap-3" // Flex column layout with spacing for each file item
              key={file.id} // Unique key for React list rendering
              file={file} // Pass file status object as prop
            >
              <div className="flex justify-between"> {/* Flex container to space file info and controls */}
                <div className="flex min-w-0 items-center gap-2 font-bold"> {/* File name and icon container */}
                  <FileIcon className="size-5 text-muted-foreground" /> {/* File icon with muted styling */}
                  <p className="truncate">{file.fileName}</p> {/* Display truncated file name */}
                </div>
                <div className="flex items-center gap-1"> {/* Container for action buttons */}
                  {file.status === "error" && ( // Conditionally render retry button if file upload failed
                    <DropzoneRetryFile
                      variant="ghost" // Styling variant for button
                      className="hover:border" // Add border on hover
                      type="button" // Specify button type
                      size="icon" // Icon sized button
                    >
                      <RotateCcwIcon className="size-4" /> {/* Retry icon */}
                    </DropzoneRetryFile>
                  )}

                  <DropzoneRemoveFile
                    variant="ghost" // Styling variant for remove button
                    className="hover:border" // Add border on hover
                    type="button" // Button type
                    size="icon" // Icon sized button
                  >
                    <Trash2Icon className="size-4" /> {/* Trash icon for removing file */}
                  </DropzoneRemoveFile>
                </div>
              </div>
              <InfiniteProgress status={file.status} progress={file.progress ?? 0} /> {/* Show upload progress bar or spinner */}
              {file.status === "success" && ( // Conditionally show badge if upload succeeded
                <Badge variant="outline">Submitted for review ✅</Badge> // Display success badge with outline style
              )}
              <div className="flex justify-between text-sm text-muted-foreground"> {/* Footer info with file size and message */}
                <p> {/* Display file size in MB or KB */}
                  {file.file.size > 1024 * 1024
                    ? `${(file.file.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(file.file.size / 1024).toFixed(1)} KB`}
                </p>
                <DropzoneFileMessage /> {/* Show any messages related to this file */}
              </div>
            </DropzoneFileListItem>
          ))}
        </DropzoneFileList>
      </Dropzone>
    </div>
  );
}

export default function Page() { // Define main page component for upload route
  const { user, loading } = useAuth(); // ✅ Use shared auth state to get current user and loading status

  if (loading || !user) {
    return <div className="p-8 text-center">Loading...</div>; // Display loading or redirect fallback if not authenticated
  }

  return ( // Render main upload page layout with sidebar and header
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)", // CSS variable to set sidebar width dynamically
          "--header-height": "calc(var(--spacing) * 12)", // CSS variable to set header height dynamically
        } as React.CSSProperties // Type assertion for inline styles
      }
    >
      <AppSidebar variant="inset"/> {/* Render application sidebar with inset variant */}
      <SidebarInset> {/* SidebarInset component to wrap main content area */}
        <SiteHeader /> {/* Render site header */}
        <div className="flex flex-1 flex-col"> {/* Flex container to fill available space vertically */}
          <div className="@container/main flex flex-1 flex-col gap-2"> {/* Responsive container with vertical spacing */}
            <div className="px-4 lg:px-6"> {/* Padding container with larger padding on large screens */}
              {user && <MultiFiles user={user} />} {/* Render MultiFiles component only if user is authenticated */}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
