'use client'; // Enables client-side rendering for this component in Next.js App Router

import { useEffect, useState } from 'react'; // Import React hooks for lifecycle and state
import { useRouter } from 'next/navigation'; // Import Next.js router for client-side navigation
import { auth } from '@/lib/firebase'; // Import initialized Firebase app
  import {
    Dropzone,
    DropZoneArea,
    DropzoneFileList,
    DropzoneFileListItem,
    DropzoneMessage,
    DropzoneRemoveFile,
    DropzoneTrigger,
    useDropzone,
  } from "@/components/ui/dropzone";

  import { CloudUploadIcon, Trash2Icon } from "lucide-react";

// Import required Firebase Auth utilities
import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';


import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

function MultiImages() {
    const dropzone = useDropzone({
      onDropFile: async (file: File) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return {
          status: "success",
          result: URL.createObjectURL(file),
        };
      },
      validation: {
        accept: {
          "image/*": [".png", ".jpg", ".jpeg"],
        },
        maxSize: 10 * 1024 * 1024,
        maxFiles: 10,
      },
    });
 
    return (
      <div className="not-prose flex flex-col gap-4">
        <Dropzone {...dropzone}>
          <div>
            <div className="flex justify-between">
              <DropzoneMessage />
            </div>
            <DropZoneArea>
              <DropzoneTrigger className="flex flex-col items-center gap-4 bg-transparent p-10 text-center text-sm">
                <CloudUploadIcon className="size-8" />
                <div>
                  <p className="font-semibold">Upload Test Results</p>
                  <p className="text-sm text-muted-foreground">
                    Click here or drag and drop to upload
                  </p>
                </div>
              </DropzoneTrigger>
            </DropZoneArea>
          </div>
 
          <DropzoneFileList className="grid gap-3 p-0 md:grid-cols-2 lg:grid-cols-3">
            {dropzone.fileStatuses.map((file) => (
              <DropzoneFileListItem
                className="overflow-hidden rounded-md bg-secondary p-0 shadow-sm"
                key={file.id}
                file={file}
              >
                {file.status === "pending" && (
                  <div className="aspect-video animate-pulse bg-black/20" />
                )}
                {file.status === "success" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.result}
                    alt={`uploaded-${file.fileName}`}
                    className="aspect-video object-cover"
                  />
                )}
                <div className="flex items-center justify-between p-2 pl-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <DropzoneRemoveFile
                    variant="ghost"
                    className="shrink-0 hover:outline"
                  >
                    <Trash2Icon className="size-4" />
                  </DropzoneRemoveFile>
                </div>
              </DropzoneFileListItem>
            ))}
          </DropzoneFileList>
        </Dropzone>
      </div>
    );
  }

export default function Page() {
  const [user, setUser] = useState<User | null>(null); // State to track signed-in user
  const router = useRouter(); // Get router instance for navigation
  
  // Check auth state on component mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/'); // Redirect to landing page if no user is logged in
      } else {
        setUser(currentUser); // Otherwise set the user state
      }
    });
    return () => unsubscribe(); // Clean up subscription on unmount
  }, [router]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user}/>
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="px-4 lg:px-6">
              <MultiImages />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
