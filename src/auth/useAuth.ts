import * as Sentry from "@sentry/nextjs";
import { useContext } from "react";
import { AuthContext } from "./auth-provider";
import type { User } from "firebase/auth";

export type UseAuthResult = {
    user: User | null;
    role: string | null;
    tenantId: string | null;
    loading: boolean;
};

// Hook to access user and any extended properties like role, metadata, and loading state
export const useAuth = (): UseAuthResult => {
    const context = useContext(AuthContext); // Get the full auth context from the provider

    if (!context) {
        // Report a warning to Sentry if the hook is used outside the provider
        Sentry.captureMessage("useAuth must be used within an AuthProvider");
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return {
        user: context.user,                 // Firebase user object
        role: context.role,
        tenantId: context.tenantId,
        loading: context.loading            // Loading state for async auth resolution
    };
};
