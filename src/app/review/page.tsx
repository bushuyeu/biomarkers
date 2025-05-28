"use client";

import { useEffect, useState } from "react";
import { firestore } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/auth/auth-provider";
import { useRouter } from "next/navigation"; // Add router for potential redirects

type Biomarker = {
    name: string;
    value: number;
};

type ParsedLLMOutput = {
    biomarkers: Biomarker[];
    testMetadata: {
        date: string;
        source?: string;
    };
};

type FileDoc = {
    id: string;
    ocrText: string;
    llmOutput: string; // stored as stringified JSON
    reviewStatus: "pending" | "reviewed";
};

export default function ReviewPage() {
    const { user, role, tenantId } = useAuth(); // 🔐 Extract auth context
    const [files, setFiles] = useState<FileDoc[]>([]);
    const [loading, setLoading] = useState(true); // ⏳ Track loading state manually

    const router = useRouter();

    useEffect(() => {
        if (!user || !tenantId || !role) return; // 🛑 Wait for valid auth context

        // ✅ Restrict access only to allowed roles
        const allowedRoles = ["admin", "reviewer", "end-user"];
        if (!allowedRoles.includes(role)) {
            console.warn("Unauthorized role attempting to access reviewer page:", role);
            setLoading(false);
            return;
        }

        const fetchFiles = async () => {
            try {
                const snapshot = await getDocs(
                    collection(firestore, `tenants/${tenantId}/files`) // ✅ Use tenantId directly
                );

                const docs = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data() as Omit<FileDoc, "id">;
                    return {
                        id: docSnap.id,
                        ...data,
                    };
                });

                setFiles(docs);
            } catch (error) {
                console.error("Error loading files:", error);
            } finally {
                setLoading(false); // ✅ Stop loading state
            }
        };

        fetchFiles();
    }, [user, tenantId, role]);

    if (loading) {
        return (
            <main className="p-6">
                <p>Loading files…</p>
            </main>
        );
    }

    // 🧱 Show error if role is not allowed
    const allowedRoles = ["admin", "reviewer", "end-user"];
    if (!allowedRoles.includes(role ?? "")) {
        return (
            <main className="p-6">
                <p className="text-red-500 font-semibold">You do not have access to view these files.</p>
            </main>
        );
    }

    return (
        <main className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Review Uploaded Files</h1>
            {files.length === 0 ? (
                <p>No files found.</p>
            ) : (
                files.map((file) => {
                    let parsed: ParsedLLMOutput | null = null;
                    try {
                        parsed = JSON.parse(file.llmOutput);
                    } catch {
                        parsed = null;
                    }

                    return (
                        <div key={file.id} className="border rounded p-4 space-y-2 bg-white shadow">
                            <h2 className="text-lg font-semibold">File ID: {file.id}</h2>
                            <p className="text-sm text-gray-500">Status: {file.reviewStatus}</p>

                            {parsed && (
                                <div className="space-y-1">
                                    <p className="font-medium">Test Date: {parsed.testMetadata.date}</p>
                                    <ul className="list-disc list-inside">
                                        {parsed.biomarkers.map((bm, index) => (
                                            <li key={index}>
                                                {bm.name}: {bm.value}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </main>
    );
}