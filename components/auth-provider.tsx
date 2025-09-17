"use client"

import React, { createContext, useContext } from "react"
import { authClient } from "@/lib/auth-client"

// Create a context to provide the authClient instance
const AuthContext = createContext(authClient)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={authClient}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use the auth client
export function useAuth() {
  const client = useContext(AuthContext)
  return {
    // Use the client's useSession hook
    ...client.useSession(),
    // Provide signOut method
    signOut: client.signOut,
    // Provide other auth methods
    signIn: client.signIn,
    signUp: client.signUp,
  }
} 