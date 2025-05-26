"use client";

import { useEffect, useState } from "react";
import { firestore } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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
    const [files, setFiles] = useState<FileDoc[]>([]);

    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return;

            try {
                // Fetch user document to get tenantId
                const userDocRef = doc(firestore, "users", user.uid);
                const userSnap = await getDoc(userDocRef);
                const userData = userSnap.data();

                if (!userSnap.exists() || !userData?.tenantId) {
                    console.error("User record or tenantId not found.");
                    return;
                }

                const tenantId = userData.tenantId;
                const snapshot = await getDocs(collection(firestore, `tenants/${tenantId}/files`));

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
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <main className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Review Uploaded Files</h1>
            {files.length === 0 ? (
                <p>Loading files…</p>
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