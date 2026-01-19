"use client"

import { useState, useEffect, useCallback } from 'react'
import ConnectionRequests from './connection-requests'

interface ConnectionRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export default function ConnectionRequestsModal({ isOpen, onClose, onUpdate }: ConnectionRequestsModalProps) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }, [])

  const fetchConnectionRequests = useCallback(async () => {
    if (!isOpen) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/connections/requests/pending`, {
        headers: getAuthHeaders()
      })
      const data = await response.json()
      
      if (data.success) {
        setRequests(data.data.requests || [])
      }
    } catch (err) {
      console.error('Error fetching connection requests:', err)
    } finally {
      setLoading(false)
    }
  }, [isOpen, getAuthHeaders])

  useEffect(() => {
    if (isOpen) {
      fetchConnectionRequests()
    }
  }, [isOpen, fetchConnectionRequests])

  const handleUpdate = () => {
    fetchConnectionRequests()
    onUpdate() // Also call parent's update callback
  }

  return (
    <ConnectionRequests
      isOpen={isOpen}
      onClose={onClose}
      requests={requests}
      onUpdate={handleUpdate}
    />
  )
}






