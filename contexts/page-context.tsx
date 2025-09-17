"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface PageContextType {
  hideNavbar: boolean
  setHideNavbar: (hide: boolean) => void
  hideFooter: boolean
  setHideFooter: (hide: boolean) => void
}

const PageContext = createContext<PageContextType | undefined>(undefined)

export function PageProvider({ children }: { children: ReactNode }) {
  const [hideNavbar, setHideNavbar] = useState(false)
  const [hideFooter, setHideFooter] = useState(false)

  return (
    <PageContext.Provider value={{
       hideNavbar, 
       setHideNavbar, 
       hideFooter,
       setHideFooter
        }}>
      {children}
    </PageContext.Provider>
  )
}

export function usePage() {
  const context = useContext(PageContext)
  if (context === undefined) {
    throw new Error('usePage must be used within a PageProvider')
  }
  return context
} 