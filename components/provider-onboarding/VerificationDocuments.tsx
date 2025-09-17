"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Button } from "@/components/ui/button"
import { Shield, Upload, FileText, CheckCircle } from 'lucide-react'

interface VerificationDocumentsProps {
  data: any
  updateData: (updates: any) => void
  isComplete: boolean
}

export default function VerificationDocuments({ data, updateData, isComplete }: VerificationDocumentsProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState<string | null>(null)

  const handleFileUpload = async (file: File, fieldName: string) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append(fieldName === 'verificationDocument' ? 'document' : 'logo', file)
      
      const endpoint = fieldName === 'verificationDocument' 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/provider-onboarding/upload/verification-document`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/provider-onboarding/upload/organization-logo`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Upload failed:', response.status, errorData)
        throw new Error(errorData.message || `Upload failed with status ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // Update the data with the Cloudinary URL
        const urlField = fieldName === 'verificationDocument' ? 'verificationDocumentUrl' : 'organizationLogoUrl'
        updateData({ [urlField]: result.documentUrl || result.logoUrl })
        console.log(`File uploaded successfully: ${result.documentUrl || result.logoUrl}`)
      } else {
        throw new Error(result.message || 'Upload failed')
      }
    } catch (error) {
      console.error('File upload error:', error)
      alert(`Upload failed: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, fieldName)
    }
  }

  const handleDrag = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(fieldName)
    } else if (e.type === "dragleave") {
      // Only set dragActive to null if we're leaving the drop zone completely
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY
      if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
        setDragActive(null)
      }
    }
  }

  const handleDrop = (e: React.DragEvent, fieldName: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(null)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0], fieldName)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <Shield className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Registration & Verification</h3>
        <p className="text-sm text-gray-600">Verify your organization's legitimacy</p>
      </div>

      <div className="space-y-6">
        {/* Verification Document Upload */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Upload Verification Document *
          </Label>
          <p className="text-xs text-gray-500 mb-3">
            Upload CAC certificate, NGO registration, or valid ID document
          </p>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
              dragActive === 'verificationDocument' 
                ? 'border-blue-400 bg-blue-50 scale-105 shadow-lg' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragEnter={(e) => handleDrag(e, 'verificationDocument')}
            onDragLeave={(e) => handleDrag(e, 'verificationDocument')}
            onDragOver={(e) => handleDrag(e, 'verificationDocument')}
            onDrop={(e) => handleDrop(e, 'verificationDocument')}
          >
            <input
              type="file"
              id="verificationDocument"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => handleFileChange(e, 'verificationDocument')}
              className="hidden"
            />
            <label
              htmlFor="verificationDocument"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              {isUploading ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-blue-600">Uploading...</p>
                </div>
              ) : (data.verificationDocument || data.verificationDocumentUrl) ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {(data.verificationDocumentUrl || data.verificationDocument)?.includes('cloudinary.com') 
                      ? 'Document uploaded successfully' 
                      : data.verificationDocument || data.verificationDocumentUrl}
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {dragActive === 'verificationDocument' ? 'Drop file here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500">PDF, JPG, PNG, DOC, DOCX (Max 10MB)</p>
                  </div>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Organization Logo Upload */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Organization Logo/Picture (for profile page)
          </Label>
          <p className="text-xs text-gray-500 mb-3">
            Upload your organization's logo or picture
          </p>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
              dragActive === 'organizationLogo' 
                ? 'border-blue-400 bg-blue-50 scale-105 shadow-lg' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            onDragEnter={(e) => handleDrag(e, 'organizationLogo')}
            onDragLeave={(e) => handleDrag(e, 'organizationLogo')}
            onDragOver={(e) => handleDrag(e, 'organizationLogo')}
            onDrop={(e) => handleDrop(e, 'organizationLogo')}
          >
            <input
              type="file"
              id="organizationLogo"
              accept=".jpg,.jpeg,.png,.svg"
              onChange={(e) => handleFileChange(e, 'organizationLogo')}
              className="hidden"
            />
            <label
              htmlFor="organizationLogo"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              {isUploading ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-blue-600">Uploading...</p>
                </div>
              ) : (data.organizationLogo || data.organizationLogoUrl) ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {(data.organizationLogoUrl || data.organizationLogo)?.includes('cloudinary.com') 
                      ? 'Logo uploaded successfully' 
                      : data.organizationLogo || data.organizationLogoUrl}
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {dragActive === 'organizationLogo' ? 'Drop file here' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500">JPG, PNG, SVG (Max 5MB)</p>
                  </div>
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Completion Status */}
      {isComplete && (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
          <span className="text-sm font-medium">Verification documents completed</span>
        </div>
      )}
    </div>
  )
}


