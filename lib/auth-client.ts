import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/api/auth`,
  fetchOptions: {
    onError(context) {
      // Handle authentication errors globally
      console.error('Auth error:', context.error);
      console.error('Full auth error context:', context);
    },
    onSuccess(context) {
      // Handle successful auth operations
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth success:', context.data);
      }
    }
  }
});



// Export types for TypeScript
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user; 