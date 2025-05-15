'use client'; // Enables client-side rendering for this component in Next.js App Router

import { useEffect, useState } from 'react'; // Import React hooks for lifecycle and state
import { useRouter } from 'next/navigation'; // Import Next.js router for client-side navigation
import { auth } from '@/lib/firebase'; // Import initialized Firebase app
  import {
    Dropzone,
    DropZoneArea,
    DropzoneFileList,
    DropzoneFileListItem,
    DropzoneFileMessage,
    DropzoneTrigger,
    DropzoneMessage,
    DropzoneRemoveFile,
    DropzoneRetryFile,
    InfiniteProgress,
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

import { RotateCcwIcon, FileIcon } from "lucide-react";

function MultiFiles() {
  const dropzone = useDropzone({
    onDropFile: async () => {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 500 + 1000),
      );

      if (Math.random() > 0.8) {
        return {
          status: "error",
          error: "Failed to upload file",
        };
      }
      return {
        status: "success",
        result: undefined,
      };
    },
    validation: {
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
                <p className="font-semibold">Upload files</p>
                <p className="text-sm text-muted-foreground">
                  Click here or drag and drop to upload. Please select up to 10 files. 
                </p>
              </div>
            </DropzoneTrigger>
          </DropZoneArea>
        </div>

        <DropzoneFileList className="flex flex-col gap-3">
          {dropzone.fileStatuses.map((file) => (
            <DropzoneFileListItem
              className="flex flex-col gap-3"
              key={file.id}
              file={file}
            >
              <div className="flex justify-between">
                <div className="flex min-w-0 items-center gap-2 font-bold">
                  <FileIcon className="size-5 text-muted-foreground" />
                  <p className="truncate">{file.fileName}</p>
                </div>
                <div className="flex items-center gap-1">
                  {file.status === "error" && (
                    <DropzoneRetryFile
                      variant="ghost"
                      className="hover:border"
                      type="button"
                      size="icon"
                    >
                      <RotateCcwIcon className="size-4" />
                    </DropzoneRetryFile>
                  )}

                  <DropzoneRemoveFile
                    variant="ghost"
                    className="hover:border"
                    type="button"
                    size="icon"
                  >
                    <Trash2Icon className="size-4" />
                  </DropzoneRemoveFile>
                </div>
              </div>
              <InfiniteProgress status={file.status} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <p>{(file.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                <DropzoneFileMessage />
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
              <MultiFiles />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
