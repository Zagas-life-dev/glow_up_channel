'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { usePage } from '@/contexts/page-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Search, Eye, Download, Calendar, User, CreditCard, FileImage, AlertTriangle, Shield, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Receipt {
  _id: string
  promotionId: string
  paymentReference: string
  receiptUrl: string
  uploadedAt: string
  amount: number
  currency: string
  promotion: {
    _id: string
    title: string
    packageType: string
    status: string
    user: {
      firstName: string
      lastName: string
      email: string
    }
  }
}

export default function AdminReceiptsPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hide navbar and footer when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        setError('Access denied. Admin privileges required.')
        setLoading(false)
        return
      }
      fetchReceipts()
    } else if (!isLoading && !isAuthenticated) {
      setError('Please log in to access this page.')
      setLoading(false)
    }
  }, [isLoading, isAuthenticated, user])

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/receipts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch receipts')
      }

      const data = await response.json()
      setReceipts(data.receipts || [])
    } catch (error) {
      console.error('Error fetching receipts:', error)
      toast.error('Failed to fetch receipts')
    } finally {
      setLoading(false)
    }
  }

  const filteredReceipts = receipts.filter(receipt => {
    const title = receipt.promotion?.title || '';
    const firstName = receipt.promotion?.user?.firstName || '';
    const lastName = receipt.promotion?.user?.lastName || '';
    const email = receipt.promotion?.user?.email || '';
    const paymentRef = receipt.paymentReference || '';
    
    return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           `${firstName} ${lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
           email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           paymentRef.toLowerCase().includes(searchTerm.toLowerCase());
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'awaiting_verification': return 'bg-yellow-100 text-yellow-800'
      case 'payment_uploaded': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPackageColor = (packageType: string) => {
    switch (packageType) {
      case 'spotlight': return 'bg-purple-100 text-purple-800'
      case 'feature': return 'bg-blue-100 text-blue-800'
      case 'launch': return 'bg-orange-100 text-orange-800'
      case 'custom': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid Date'
    }
  }

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Generate responsive Cloudinary URL for receipt images
  const getResponsiveReceiptImage = (url: string) => {
    if (url.includes('cloudinary.com')) {
      // Extract public ID from Cloudinary URL and return optimized URL
      return url.replace('/upload/', '/upload/w_auto,h_auto,c_fill,q_auto,f_auto,dpr_auto/')
    }
    return url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_BACKEND_URL}${url}`
  }

  const downloadReceipt = (receipt: Receipt) => {
    const link = document.createElement('a')
    link.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}${receipt.receiptUrl}`
    link.download = `receipt_${receipt.paymentReference}.${receipt.receiptUrl.split('.').pop()}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Shield className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600">Loading admin receipts...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (user?.role !== 'admin' && user?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need admin or super admin privileges to access this page.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Receipts</h1>
            <p className="text-gray-600">View and manage payment receipts from providers</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button onClick={fetchReceipts} variant="outline">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {filteredReceipts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No receipts found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No receipts match your search criteria.' : 'No payment receipts have been uploaded yet.'}
              </p>
              {!searchTerm && (
                <p className="text-sm text-gray-500">
                  Receipts will appear here once providers upload payment confirmations.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredReceipts.map((receipt) => (
              <Card key={receipt._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                        {receipt.promotion?.title || 'Untitled Promotion'}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <User className="w-4 h-4" />
                          <span>{receipt.promotion?.user?.firstName || ''} {receipt.promotion?.user?.lastName || ''}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CreditCard className="w-4 h-4" />
                          <span>{receipt.paymentReference || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(receipt.uploadedAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold text-green-600">{formatCurrency(receipt.amount, receipt.currency)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPackageColor(receipt.promotion?.packageType || 'unknown')}>
                        {(receipt.promotion?.packageType || 'unknown').toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(receipt.promotion?.status || 'unknown')}>
                        {(receipt.promotion?.status || 'unknown').replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Receipt uploaded</p>
                        <p className="text-xs text-gray-500">
                          {receipt.receiptUrl.split('/').pop()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedReceipt(receipt)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Receipt Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Promotion Title</label>
                                <p className="text-sm text-gray-900">{receipt.promotion?.title || 'Untitled Promotion'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Payment Reference</label>
                                <p className="text-sm text-gray-900 font-mono">{receipt.paymentReference || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Payment Amount</label>
                                <p className="text-sm text-gray-900 font-semibold text-green-600">{formatCurrency(receipt.amount, receipt.currency)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Provider</label>
                                <p className="text-sm text-gray-900">{receipt.promotion?.user?.firstName || ''} {receipt.promotion?.user?.lastName || ''}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Email</label>
                                <p className="text-sm text-gray-900">{receipt.promotion?.user?.email || 'N/A'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Package Type</label>
                                <Badge className={getPackageColor(receipt.promotion?.packageType || 'unknown')}>
                                  {(receipt.promotion?.packageType || 'unknown').toUpperCase()}
                                </Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Status</label>
                                <Badge className={getStatusColor(receipt.promotion?.status || 'unknown')}>
                                  {(receipt.promotion?.status || 'unknown').replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-2 block">Receipt Image</label>
                              <div className="border rounded-lg p-4 bg-gray-50">
                                <img
                                  src={getResponsiveReceiptImage(receipt.receiptUrl)}
                                  alt="Payment Receipt"
                                  className="max-w-full h-auto rounded-lg shadow-sm"
                                  onError={(e) => {
                                    console.error('Failed to load receipt image:', receipt.receiptUrl)
                                    e.currentTarget.src = '/placeholder-receipt.png'
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="outline"
                                onClick={() => downloadReceipt(receipt)}
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReceipt(receipt)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
