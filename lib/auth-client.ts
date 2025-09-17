import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production' 
    ? "https://glow-up-channel-backend-761979347865.europe-west1.run.app/api/auth" // Production backend URL
    : "http://localhost:3001/api/auth", // Development backend URL
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