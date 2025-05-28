import * as Sentry from "@sentry/nextjs";
import { useContext } from "react";
import { AuthContext } from "./auth-provider";

// Hook to access user and any extended properties like role, metadata, and loading state
export const useAuth = () => {
    const context = useContext(AuthContext); // Get the full auth context from the provider

    if (!context) {
        // Report a warning to Sentry if the hook is used outside the provider
        Sentry.captureMessage("useAuth must be used within an AuthProvider");
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return {
        user: context.user,                 // Firebase user object
        userMetadata: context.userMetadata, // Additional Firestore user fields like role/tenantId
        loading: context.loading            // Loading state for async auth resolution
    };
};
