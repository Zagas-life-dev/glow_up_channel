"use client"

import Link from 'next/link'
import { ReactNode } from 'react'
import { getLinkType, openExternalUrl } from '@/lib/url-utils'

interface SmartLinkProps {
  href: string
  children: ReactNode
  className?: string
  onClick?: () => void
  externalButtonText?: string
  internalButtonText?: string
}

/**
 * SmartLink component that automatically handles internal vs external links
 * Based on Next.js and React best practices for URL handling
 */
export default function SmartLink({
  href,
  children,
  className = '',
  onClick,
  externalButtonText = 'View',
  internalButtonText = 'Read More'
}: SmartLinkProps) {
  const linkType = getLinkType(href)
  
  const handleClick = () => {
    if (onClick) {
      onClick()
    }
    
    if (linkType === 'external') {
      openExternalUrl(href)
    }
  }
  
  // For internal links, use Next.js Link
  if (linkType === 'internal') {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }
  
  // For external links, use button with onClick
  if (linkType === 'external') {
    return (
      <button onClick={handleClick} className={className}>
        {children}
      </button>
    )
  }
  
  // For invalid links, render children without functionality
  console.warn('SmartLink: Invalid URL provided:', href)
  return <span className={className}>{children}</span>
}

/**
 * Hook for getting link behavior information
 */
export function useLinkBehavior(href: string) {
  const linkType = getLinkType(href)
  
  return {
    linkType,
    isInternal: linkType === 'internal',
    isExternal: linkType === 'external',
    isValid: linkType !== 'invalid',
    shouldOpenInNewTab: linkType === 'external'
  }
}
