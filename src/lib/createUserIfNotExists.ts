import { doc, getDoc, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase"; // Match actual file and export
import type { User } from "firebase/auth";

/**
 * Ensures a Firestore user document exists for the given Firebase user.
 * This is critical to assign roles and tenant data on first login.
 */
export const createUserIfNotExists = async (user: User) => {
    // Set your default tenant ID (used for B2C users)
    const tenantId = "Awesome Biomarkers Operator";

    // Reference to the Firestore user document
    const userRef = doc(firestore, "tenants", tenantId, "users", user.uid);

    // Fetch the document snapshot
    const userSnap = await getDoc(userRef);

    // If the user document does not exist, create it
    if (!userSnap.exists()) {
        await setDoc(userRef, {
            email: user.email ?? "",
            role: "end-user",              // Default role assigned on signup
            tenantId: tenantId,            // Link back to parent tenant
            createdAt: new Date().toISOString(), // Optional timestamp
        });

        console.log(`✅ Created Firestore user document for ${user.email}`);
    }
};