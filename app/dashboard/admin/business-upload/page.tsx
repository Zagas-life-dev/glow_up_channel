"use client"

import React, { useState, useEffect } from 'react'
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  FolderOpen, 
  FileText, 
  Image, 
  Download, 
  Eye, 
  Search,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'

interface ProviderData {
  _id: string
  userId: string
  organizationName: string
  providerType: string
  otherProviderType?: string
  contactPersonName: string
  contactPersonRole: string
  providerAddress: string
  aboutOrganization: string
  officialEmail: string
  phoneNumber: string
  stateOfOperation: string
  yearEstablished: string
  website?: string
  socialMediaHandles?: string
  isRegistered: boolean
  registrationNumber?: string
  nationalId?: string
  passportId?: string
  otherId?: string
  otherIdType?: string
  verificationDocument?: string
  verificationDocumentUrl?: string
  organizationLogo?: string
  organizationLogoUrl?: string
  agreedToTerms: boolean
  completionPercentage: number
  isCompleted: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
  user: {
    _id: string
    firstName: string
    lastName: string
    email: string
    role: string
  }
}

export default function BusinessUploadPage() {
  const { user, isAuthenticated } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [providers, setProviders] = useState<ProviderData[]>([])
  const [filteredProviders, setFilteredProviders] = useState<ProviderData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Hide navbar and footer when this page is active
  useEffect(() => {
    setHideNavbar(false)
    setHideFooter(false)
  }, [setHideNavbar, setHideFooter])

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/auth/login'
    } else if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      window.location.href = '/dashboard'
    }
  }, [isAuthenticated, user])

  // Fetch provider onboarding data
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          throw new Error('No authentication token found')
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/provider-onboarding/admin/all`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error Response:', errorText)
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('API Response:', data)
        
        if (data.success) {
          setProviders(data.providers || [])
          setFilteredProviders(data.providers || [])
        } else {
          throw new Error(data.message || 'Failed to fetch providers')
        }
      } catch (error) {
        console.error('Error fetching providers:', error)
        toast.error(`Failed to fetch provider data: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && (user?.role === 'admin' || user?.role === 'super_admin')) {
      fetchProviders()
    }
  }, [isAuthenticated, user])

  // Filter providers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProviders(providers)
    } else {
      const filtered = providers.filter(provider =>
        provider.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.contactPersonName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.officialEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.stateOfOperation.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProviders(filtered)
    }
  }, [searchTerm, providers])

  const toggleFolder = (providerId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(providerId)) {
      newExpanded.delete(providerId)
    } else {
      newExpanded.add(providerId)
    }
    setExpandedFolders(newExpanded)
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const getStatusBadge = (provider: ProviderData) => {
    if (provider.isCompleted) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    } else if (provider.completionPercentage > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
    } else {
      return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>
    }
  }

  const openDocument = (url: string, filename: string) => {
    window.open(url, '_blank')
  }

  const downloadDocument = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-lg text-gray-600">Please log in to access this page</p>
        </div>
      </div>
    )
  }

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-lg text-gray-600">Access denied. Admin privileges required.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-lg text-gray-600">Loading provider data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Upload</h1>
              <p className="text-gray-600">Manage provider onboarding documents and details</p>
            </div>
          </div>

          {/* Search and Test */}
          <div className="flex items-center space-x-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/provider-onboarding/admin/test`);
                  const data = await response.json();
                  console.log('Test API response:', data);
                  toast.success('API connection working!');
                } catch (error) {
                  console.error('Test API error:', error);
                  toast.error('API connection failed');
                }
              }}
            >
              Test API
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Organizations</p>
                  <p className="text-2xl font-bold">{providers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold">{providers.filter(p => p.isCompleted).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold">{providers.filter(p => !p.isCompleted && p.completionPercentage > 0).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">With Documents</p>
                  <p className="text-2xl font-bold">{providers.filter(p => p.verificationDocumentUrl || p.organizationLogoUrl).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provider Folders */}
        <div className="space-y-4">
          {filteredProviders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {providers.length === 0 
                    ? 'No provider onboarding data found. Providers will appear here once they start the onboarding process.'
                    : 'No providers match your search criteria.'
                  }
                </p>
                {providers.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Encourage users to complete their provider registration to see their business details here.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredProviders.map((provider) => (
              <Card key={provider._id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFolder(provider._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FolderOpen className={`w-5 h-5 text-blue-600 transition-transform ${
                        expandedFolders.has(provider._id) ? 'rotate-90' : ''
                      }`} />
                      <div>
                        <CardTitle className="text-lg">{provider.organizationName}</CardTitle>
                        <p className="text-sm text-gray-600">
                          {provider.contactPersonName} • {provider.providerType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(provider)}
                      <Badge variant="outline">{provider.completionPercentage}%</Badge>
                    </div>
                  </div>
                </CardHeader>

                {expandedFolders.has(provider._id) && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Organization Details */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                          <Building2 className="w-4 h-4" />
                          <span>Organization Details</span>
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Contact Person:</span>
                            <span>{provider.contactPersonName} ({provider.contactPersonRole})</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Email:</span>
                            <span>{provider.officialEmail}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Phone:</span>
                            <span>{provider.phoneNumber}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">State:</span>
                            <span>{provider.stateOfOperation}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">Established:</span>
                            <span>{provider.yearEstablished}</span>
                          </div>
                          {provider.website && (
                            <div className="flex items-center space-x-2">
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                              <span className="font-medium">Website:</span>
                              <a 
                                href={provider.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {provider.website}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Registration Details */}
                        <div className="pt-4 border-t">
                          <h5 className="font-semibold text-gray-900 flex items-center space-x-2 mb-2">
                            <Shield className="w-4 h-4" />
                            <span>Registration Status</span>
                          </h5>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Registered:</span> {provider.isRegistered ? 'Yes' : 'No'}</p>
                            {provider.isRegistered && provider.registrationNumber && (
                              <p><span className="font-medium">Registration Number:</span> {provider.registrationNumber}</p>
                            )}
                            {!provider.isRegistered && (
                              <div>
                                <p><span className="font-medium">ID Provided:</span></p>
                                {provider.nationalId && <p className="ml-4">• National ID: {provider.nationalId}</p>}
                                {provider.passportId && <p className="ml-4">• Passport ID: {provider.passportId}</p>}
                                {provider.otherId && <p className="ml-4">• {provider.otherIdType}: {provider.otherId}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Documents */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>Uploaded Documents</span>
                        </h4>

                        {/* Verification Document */}
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-700">Verification Document</h5>
                          {provider.verificationDocumentUrl ? (
                            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                              <FileText className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-800 flex-1">Document uploaded</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDocument(provider.verificationDocumentUrl!, 'verification-document')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadDocument(provider.verificationDocumentUrl!, 'verification-document')}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <XCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">No document uploaded</span>
                            </div>
                          )}
                        </div>

                        {/* Organization Logo */}
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-700">Organization Logo</h5>
                          {provider.organizationLogoUrl ? (
                            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
                              <Image className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-800 flex-1">Logo uploaded</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDocument(provider.organizationLogoUrl!, 'organization-logo')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadDocument(provider.organizationLogoUrl!, 'organization-logo')}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <XCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">No logo uploaded</span>
                            </div>
                          )}
                        </div>

                        {/* About Organization */}
                        {provider.aboutOrganization && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-gray-700">About Organization</h5>
                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                              {provider.aboutOrganization}
                            </p>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
                          <p>Created: {formatDate(provider.createdAt)}</p>
                          <p>Updated: {formatDate(provider.updatedAt)}</p>
                          {provider.completedAt && (
                            <p>Completed: {formatDate(provider.completedAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
