"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { usePage } from "@/contexts/page-context"
import { useAuth } from "@/lib/auth-context"
import ApiClient from "@/lib/api-client"
import { 
  ArrowLeft,
  Plus,
  Target,
  Calendar,
  Briefcase,
  BookOpen,
  Star,
  TrendingUp,
  Settings,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  BarChart3,
  Zap,
  CreditCard,
  Upload,
  FileImage,
  Trash2,
  X
} from 'lucide-react'
import { toast } from "sonner"

// Types matching backend exactly
interface Promotion {
  _id: string
  contentId: string
  contentType: string
  packageType: string
  packageName: string
  investment: number
  duration: number
  status: string
  paymentStatus: string
  createdAt: string
  startDate?: string
  endDate?: string
  isActive?: boolean
  isExpired?: boolean
  remainingDays?: number
  content?: {
    _id: string
    title: string
    description: string
    image?: string
  }
}

interface Package {
  id: string
  name: string
  description: string
  price: number
  duration: number
  features: string[]
  isHero: boolean
  isFeatured: boolean
  priority: number
  customDuration?: {
    enabled: boolean
    pricePerDay: number
    minDays: number
    maxDays: number
  }
  isCustom?: boolean
}

interface UserContent {
  _id: string
  title: string
  description: string
  contentType: string
  image?: string
  status?: string
  createdAt: string
}

export default function PromotionsPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const { user, isAuthenticated } = useAuth()
  
  // State
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [userContent, setUserContent] = useState<UserContent[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create promotion state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedContent, setSelectedContent] = useState<UserContent | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<string>("")
  const [customDuration, setCustomDuration] = useState<number>(7)
  const [notes, setNotes] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  
  // Custom promotion state
  const [showCustomDialog, setShowCustomDialog] = useState(false)
  const [enterpriseDuration, setEnterpriseDuration] = useState(30)
  const [customNotes, setCustomNotes] = useState("")
  
  // Payment details state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  
  // Receipt upload state
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  
  // Hero image upload state
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null)
  const [heroImageUploading, setHeroImageUploading] = useState(false)

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Fetch data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, user])

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log('Fetching promotion data...')
      
      // Fetch packages (public endpoint)
      const packagesResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions/packages`)
      const packagesData = await packagesResponse.json()
      console.log('Packages response:', packagesData)
      
      if (packagesData.success) {
        const packagesArray = Object.values(packagesData.data.packages)
        
        // Add custom package option
        const customPackage: Package = {
          id: 'custom',
          name: 'Custom Enterprise Package',
          description: 'Tailored solutions for large-scale campaigns and unique requirements',
          price: 0, // No fixed pricing - contact for quote
          duration: 0, // Variable duration
          features: [
            'Everything in Launch Package PLUS:',
            'Custom campaign duration',
            'Dedicated account manager',
            'Custom branding and design',
            'Advanced analytics and reporting',
            'Priority support and consultation',
            'Multi-platform integration',
            'Custom content creation'
          ],
          isHero: false,
          isFeatured: false,
          priority: 4,
          isCustom: true
        }
        
        setPackages([...packagesArray, customPackage])
        console.log('Packages loaded:', [...packagesArray, customPackage])
      } else {
        console.error('Failed to fetch packages:', packagesData.message)
        setPackages([])
      }

      // Fetch user promotions (authenticated)
      const promotionsResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions/my-promotions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })
      const promotionsData = await promotionsResponse.json()
      console.log('Promotions response:', promotionsData)
      
      if (promotionsData.success) {
        setPromotions(promotionsData.data.promotions || [])
        console.log('Promotions loaded:', promotionsData.data.promotions)
      } else {
        console.error('Failed to fetch promotions:', promotionsData)
        
        if (promotionsResponse.status === 401) {
          toast.error('Please log in again to continue')
        } else if (promotionsResponse.status === 403) {
          toast.error('You do not have permission to access promotions')
        } else {
          toast.error('Failed to load promotions')
        }
        setPromotions([])
      }

      // Fetch user content (authenticated)
      const [opportunitiesRes, eventsRes, jobsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/opportunities/my/opportunities`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json()).catch(() => ({ success: false, data: { opportunities: [] } })),
        
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/events/my/events`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json()).catch(() => ({ success: false, data: { events: [] } })),
        
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/jobs/my/jobs`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json'
          }
        }).then(res => res.json()).catch(() => ({ success: false, data: { jobs: [] } }))
      ])

      console.log('Content responses:', { opportunitiesRes, eventsRes, jobsRes })

      // Combine all content
      const allContent: UserContent[] = []
      
      if (opportunitiesRes.success) {
        const opportunities = opportunitiesRes.data.opportunities || []
        allContent.push(...opportunities.map(item => ({ ...item, contentType: 'opportunity' })))
      }
      
      if (eventsRes.success) {
        const events = eventsRes.data.events || []
        allContent.push(...events.map(item => ({ ...item, contentType: 'event' })))
      }
      
      if (jobsRes.success) {
        const jobs = jobsRes.data.jobs || []
        allContent.push(...jobs.map(item => ({ ...item, contentType: 'job' })))
      }
      
      setUserContent(allContent)
      console.log('Total user content loaded:', allContent.length)

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load promotions data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePromotion = async () => {
    if (!selectedContent || !selectedPackage) {
      toast.error('Please select content and package')
      return
    }

    // Handle custom package
    if (selectedPackage === 'custom') {
      setShowCreateDialog(false)
      setShowCustomDialog(true)
      return
    }

    // Check if hero image is required for launch package
    if (selectedPackage === 'launch' && !heroImageFile) {
      toast.error('Hero image is required for Launch package promotions')
      return
    }

    setCreateLoading(true)
    try {
      // If it's a launch package and has hero image, upload it first
      let heroImageUrl = null
      if (selectedPackage === 'launch' && heroImageFile) {
        setHeroImageUploading(true)
        try {
          const formData = new FormData()
          formData.append('heroImage', heroImageFile)
          formData.append('contentId', selectedContent._id)
          formData.append('contentType', selectedContent.contentType)

          const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions/upload-hero-image`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: formData
          })

          const uploadData = await uploadResponse.json()
          if (!uploadData.success) {
            toast.error(uploadData.message || 'Failed to upload hero image')
            setHeroImageUploading(false)
            return
          }
          heroImageUrl = uploadData.data.heroImageUrl
          toast.success('Hero image uploaded successfully!')
        } catch (uploadError) {
          console.error('Hero image upload error:', uploadError)
          toast.error('Failed to upload hero image')
          setHeroImageUploading(false)
          return
        } finally {
          setHeroImageUploading(false)
        }
      }

      const requestBody = {
        contentId: selectedContent._id,
        contentType: selectedContent.contentType,
        packageType: selectedPackage,
        customDuration: selectedPackage === 'spotlight' && customDuration > 7 ? customDuration : undefined,
        notes,
        heroImageUrl
      }
      
      console.log('Creating promotion with request body:', requestBody)
      console.log('Selected content:', selectedContent)
      console.log('Selected content _id:', selectedContent._id)
      console.log('Selected content _id type:', typeof selectedContent._id)
      console.log('Backend URL:', process.env.NEXT_PUBLIC_BACKEND_URL)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      console.log('Create promotion response:', data)
      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      if (data.success) {
        toast.success('Promotion created successfully!')
        setShowCreateDialog(false)
        setSelectedContent(null)
        setSelectedPackage("")
        setCustomDuration(7)
        setNotes("")
        setHeroImageFile(null)
        setHeroImagePreview(null)
        fetchData()
      } else {
        console.error('Promotion creation failed:', data)
        console.error('Full error object:', JSON.stringify(data, null, 2))
        console.error('Error message:', data.message)
        console.error('Error details:', data.error)
        console.error('Debug info:', data.debug)
        
        toast.error(data.message || 'Failed to create promotion')
        
        // Show specific error messages for common issues
        if (data.message?.includes('onboarding')) {
          toast.error('Please complete your provider onboarding first')
        } else if (data.message?.includes('Authentication') || data.message?.includes('token')) {
          toast.error('Please log in again to continue')
        } else if (data.message?.includes('not found')) {
          toast.error('Content not found. Please refresh and try again.')
        }
      }
    } catch (error) {
      console.error('Error creating promotion:', error)
      toast.error('Failed to create promotion. Please check your connection and try again.')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCustomPromotionSubmit = async () => {
    if (!selectedContent) {
      toast.error('Please select content first')
      return
    }

    if (enterpriseDuration < 30) {
      toast.error('Enterprise package requires minimum 30 days')
      return
    }

    setCreateLoading(true)
    try {
      // Calculate price based on enterprise duration
      const enterprisePricePerDay = 1499 // Same as Spotlight custom pricing
      const totalPrice = enterprisePricePerDay * enterpriseDuration

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contentId: selectedContent._id,
          contentType: selectedContent.contentType,
          packageType: 'custom',
          customDuration: enterpriseDuration,
          notes: customNotes,
          totalPrice: totalPrice
        })
      })

      const data = await response.json()
      console.log('Custom promotion response:', data)

      if (data.success) {
        toast.success('Enterprise promotion created successfully!')
        setShowCustomDialog(false)
        setSelectedContent(null)
        setSelectedPackage("")
        setEnterpriseDuration(30)
        setCustomNotes("")
        fetchData()
      } else {
        toast.error(data.message || 'Failed to create enterprise promotion')
      }
    } catch (error) {
      console.error('Error creating enterprise promotion:', error)
      toast.error('Failed to create enterprise promotion')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleRequestPaymentDetails = async (promotion: Promotion) => {
    setSelectedPromotion(promotion)
    setPaymentLoading(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions/${promotion._id}/payment-details`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPaymentDetails(data.data)
        setShowPaymentDialog(true)
      } else {
        toast.error(data.message || 'Failed to get payment details')
      }
    } catch (error) {
      console.error('Error getting payment details:', error)
      toast.error('Failed to get payment details')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handlePaymentMade = async () => {
    if (!selectedPromotion) return
    
    setPaymentLoading(true)
    try {
      // If there's a receipt file, upload it first
      if (receiptFile) {
        const formData = new FormData()
        formData.append('receipt', receiptFile)
        formData.append('promotionId', selectedPromotion._id)

        const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions/${selectedPromotion._id}/upload-receipt`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: formData
        })

        const uploadData = await uploadResponse.json()

        if (!uploadData.success) {
          toast.error(uploadData.message || 'Failed to upload receipt')
          return
        }
      }

      // Then confirm payment
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/promotions/${selectedPromotion._id}/payment-made`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Payment confirmation sent! Awaiting admin verification.')
        setShowPaymentDialog(false)
        setSelectedPromotion(null)
        setPaymentDetails(null)
        setReceiptFile(null)
        setReceiptPreview(null)
        fetchData()
      } else {
        toast.error(data.message || 'Failed to confirm payment')
      }
    } catch (error) {
      console.error('Error confirming payment:', error)
      toast.error('Failed to confirm payment')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleCancelPayment = () => {
    setShowPaymentDialog(false)
    setSelectedPromotion(null)
    setPaymentDetails(null)
    setReceiptFile(null)
    setReceiptPreview(null)
  }

  // Receipt upload functions
  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    // Check file type (images only)
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setReceiptFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setReceiptPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeReceipt = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
  }

  // Hero image upload functions
  const handleHeroImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check file size (10MB limit for hero images)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Hero image size must be less than 10MB')
      return
    }

    // Check file type (images only)
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setHeroImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setHeroImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeHeroImage = () => {
    setHeroImageFile(null)
    setHeroImagePreview(null)
  }


  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPackageIcon = (packageType: string) => {
    switch (packageType) {
      case 'spotlight': return Target
      case 'feature': return Star
      case 'launch': return Zap
      case 'custom': return Settings
      default: return Target
    }
  }

  const getPackageColor = (packageType: string) => {
    switch (packageType) {
      case 'spotlight': return 'from-blue-500 to-blue-600'
      case 'feature': return 'from-green-500 to-green-600'
      case 'launch': return 'from-purple-500 to-purple-600'
      case 'custom': return 'from-orange-500 to-red-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case 'event': return Calendar
      case 'job': return Briefcase
      case 'resource': return BookOpen
      default: return Target
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const calculateCustomPrice = (pkg: Package, days: number) => {
    if (!pkg) return 0
    if (pkg.id === 'spotlight' && pkg.customDuration && days >= pkg.customDuration.minDays) {
      return days * pkg.customDuration.pricePerDay
    }
    return pkg.price
  }

  const getDisplayPrice = (pkg: Package) => {
    if (pkg.id === 'spotlight' && customDuration >= 3) {
      return calculateCustomPrice(pkg, customDuration)
    }
    return pkg.price
  }

  const getDisplayDuration = (pkg: Package) => {
    if (pkg.id === 'spotlight' && customDuration >= 3) {
      return customDuration
    }
    return pkg.duration
  }

  // Filter promotions
  const activePromotions = promotions.filter(p => p.status === 'active' && p.paymentStatus === 'paid')
  const pendingPromotions = promotions.filter(p => p.status === 'pending')
  const awaitingPaymentPromotions = promotions.filter(p => p.status === 'active' && p.paymentStatus === 'pending')
  const awaitingVerificationPromotions = promotions.filter(p => p.status === 'active' && p.paymentStatus === 'awaiting_verification')
  const completedPromotions = promotions.filter(p => p.status === 'completed' || p.status === 'expired')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading promotions...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access your promotions.</p>
          <Button asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/provider" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Promotions</h1>
              <p className="text-sm lg:text-base text-gray-600">Promote your content to reach more people</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Promotion
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Promotions</p>
                  <p className="text-2xl font-bold text-green-600">{activePromotions.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingPromotions.length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-blue-600">{completedPromotions.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Content</p>
                  <p className="text-2xl font-bold text-purple-600">{userContent.length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Packages Section */}
        <Card className="border-0 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Star className="h-5 w-5 text-orange-600" />
              Available Packages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {packages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No packages available</p>
                <p className="text-xs text-gray-400 mt-2">Debug: packages.length = {packages.length}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => {
                  const Icon = getPackageIcon(pkg.id)
                  const color = getPackageColor(pkg.id)
                  
                  return (
                    <Card key={pkg.id} className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden ${
                      pkg.id === 'feature' ? 'ring-2 ring-green-500' : 
                      pkg.id === 'custom' ? 'ring-2 ring-orange-500' : ''
                    }`}>
                      <div className={`h-2 bg-gradient-to-r ${color}`}></div>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <Badge className={`${
                            pkg.id === 'launch' ? 'bg-purple-100 text-purple-800' :
                            pkg.id === 'feature' ? 'bg-green-100 text-green-800' :
                            pkg.id === 'custom' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {pkg.id === 'launch' ? 'Most Popular' : 
                             pkg.id === 'feature' ? 'Popular' : 
                             pkg.id === 'custom' ? 'Enterprise' : 'Basic'}
                          </Badge>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                        <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                        
                        <div className="mb-4">
                          <div className="flex items-baseline gap-2">
                            {pkg.id === 'custom' ? (
                              <>
                                <span className="text-3xl font-bold text-gray-900">Contact</span>
                                <span className="text-gray-500">for pricing</span>
                              </>
                            ) : (
                              <>
                                <span className="text-3xl font-bold text-gray-900">{formatCurrency(pkg.price)}</span>
                                <span className="text-gray-500">for {pkg.duration} days</span>
                              </>
                            )}
                          </div>
                          {pkg.customDuration && pkg.id !== 'custom' && (
                            <p className="text-xs text-gray-500 mt-1">
                              Custom: {formatCurrency(pkg.customDuration.pricePerDay)}/day (min {pkg.customDuration.minDays} days)
                            </p>
                          )}
                          {pkg.id === 'custom' && (
                            <p className="text-xs text-orange-600 mt-1 font-medium">
                              Contact us at info.glowupchannel@gmail.com
                            </p>
                          )}
                        </div>
                        
                        <ul className="space-y-2 mb-6">
                          {pkg.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Promotions Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="active">Active ({activePromotions.length})</TabsTrigger>
            <TabsTrigger value="awaiting">Awaiting Payment ({awaitingPaymentPromotions.length})</TabsTrigger>
            <TabsTrigger value="verification">Awaiting Verification ({awaitingVerificationPromotions.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingPromotions.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedPromotions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activePromotions.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Promotions</h3>
                  <p className="text-gray-600 mb-4">Create your first promotion to get started</p>
                  <Button onClick={() => setShowCreateDialog(true)} className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Promotion
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activePromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <Badge className={getStatusColor(promotion.status)}>
                            {promotion.status}
                          </Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{promotion.packageName}</h3>
                        {promotion.content && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700">{promotion.content.title}</p>
                            <p className="text-xs text-gray-500">{promotion.contentType}</p>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Investment:</span>
                            <span className="font-semibold">{formatCurrency(promotion.investment)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-semibold">{promotion.duration} days</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Remaining:</span>
                            <span className="font-semibold text-green-600">{promotion.remainingDays} days</span>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="awaiting" className="space-y-4">
            {awaitingPaymentPromotions.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Awaiting Payment</h3>
                  <p className="text-gray-600">All your approved promotions have been paid for</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {awaitingPaymentPromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${color}`}></div>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Awaiting Payment
                          </Badge>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{promotion.content?.title || 'Unknown Content'}</h3>
                        <p className="text-gray-600 text-sm mb-4">{promotion.packageName}</p>
                        
                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Investment:</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(promotion.investment)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-semibold text-gray-900">{promotion.duration} days</span>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full bg-orange-500 hover:bg-orange-600"
                          onClick={() => handleRequestPaymentDetails(promotion)}
                          disabled={paymentLoading}
                        >
                          {paymentLoading ? 'Loading...' : 'Request Payment Details'}
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="verification" className="space-y-4">
            {awaitingVerificationPromotions.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Awaiting Verification</h3>
                  <p className="text-gray-600">All your payments have been processed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {awaitingVerificationPromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${color}`}></div>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <Badge className="bg-blue-100 text-blue-800">
                            Awaiting Verification
                          </Badge>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{promotion.content?.title || 'Unknown Content'}</h3>
                        <p className="text-gray-600 text-sm mb-4">{promotion.packageName}</p>
                        
                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Investment:</span>
                            <span className="font-semibold text-gray-900">{formatCurrency(promotion.investment)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-semibold text-gray-900">{promotion.duration} days</span>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-800 text-center">
                            Payment confirmed! Admin is verifying your payment. Your promotion will go live soon.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingPromotions.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Promotions</h3>
                  <p className="text-gray-600">All your promotions are either active or completed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingPromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <Badge className={getStatusColor(promotion.status)}>
                            {promotion.status}
                          </Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{promotion.packageName}</h3>
                        {promotion.content && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700">{promotion.content.title}</p>
                            <p className="text-xs text-gray-500">{promotion.contentType}</p>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Investment:</span>
                            <span className="font-semibold">{formatCurrency(promotion.investment)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-semibold">{promotion.duration} days</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Payment:</span>
                            <Badge className={getPaymentStatusColor(promotion.paymentStatus)}>
                              {promotion.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedPromotions.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-8 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Completed Promotions</h3>
                  <p className="text-gray-600">Your completed promotions will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedPromotions.map((promotion) => {
                  const Icon = getPackageIcon(promotion.packageType)
                  const color = getPackageColor(promotion.packageType)
                  
                  return (
                    <Card key={promotion._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                      <CardHeader className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <Badge className={getStatusColor(promotion.status)}>
                            {promotion.status}
                          </Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{promotion.packageName}</h3>
                        {promotion.content && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700">{promotion.content.title}</p>
                            <p className="text-xs text-gray-500">{promotion.contentType}</p>
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Investment:</span>
                            <span className="font-semibold">{formatCurrency(promotion.investment)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Duration:</span>
                            <span className="font-semibold">{promotion.duration} days</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Completed:</span>
                            <span className="font-semibold text-blue-600">
                              {new Date(promotion.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Promotion Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create New Promotion</DialogTitle>
            <DialogDescription>
              Select content and a package to create your promotion
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Content Selection */}
            <div className="space-y-2">
              <Label htmlFor="content">Select Content</Label>
              <Select onValueChange={(value) => setSelectedContent(JSON.parse(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose content to promote" />
                </SelectTrigger>
                <SelectContent>
                  {userContent.length === 0 ? (
                    <SelectItem value="no-content" disabled>
                      <div className="flex items-center space-x-3">
                        <Target className="w-4 h-4" />
                        <span>No content available ({userContent.length} items)</span>
                      </div>
                    </SelectItem>
                  ) : (
                    userContent.map((content) => {
                      const ContentIcon = getContentIcon(content.contentType || 'opportunity')
                      return (
                        <SelectItem key={content._id} value={JSON.stringify(content)}>
                          <div className="flex items-center space-x-3">
                            <ContentIcon className="w-4 h-4" />
                            <div>
                              <p className="font-medium">{content.title}</p>
                              <p className="text-xs text-gray-500">{content.contentType}</p>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Package Selection */}
            <div className="space-y-2">
              <Label htmlFor="package">Select Package</Label>
              <Select onValueChange={setSelectedPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose promotion package" />
                </SelectTrigger>
                <SelectContent>
                  {packages.length === 0 ? (
                    <SelectItem value="no-packages" disabled>
                      <div className="flex items-center space-x-3">
                        <Target className="w-4 h-4" />
                        <span>No packages available</span>
                      </div>
                    </SelectItem>
                  ) : (
                    packages.map((pkg) => {
                      const Icon = getPackageIcon(pkg.id)
                      const color = getPackageColor(pkg.id)
                      return (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${color} flex items-center justify-center`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{pkg.name}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(pkg.price)} for {pkg.duration} days</p>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Duration for Spotlight */}
            {selectedPackage === 'spotlight' && (
              <div className="space-y-2">
                <Label htmlFor="customDuration">Custom Duration (days)</Label>
                <Input
                  id="customDuration"
                  type="number"
                  min="3"
                  max="30"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  placeholder="7"
                />
                <p className="text-xs text-gray-500">
                  Custom duration: {formatCurrency(calculateCustomPrice(packages.find(p => p.id === 'spotlight')!, customDuration))} 
                  ({customDuration} days)
                </p>
              </div>
            )}

            {/* Hero Image Upload for Launch Package */}
            {selectedPackage === 'launch' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="heroImage" className="text-sm font-medium text-gray-700">
                    Hero Background Image <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500">
                    Upload a high-quality image that will be used as the background for your hero promotion. 
                    This image will be displayed prominently on the homepage.
                  </p>
                  
                  <div className="relative">
                    <Input
                      id="heroImage"
                      type="file"
                      accept="image/*"
                      onChange={handleHeroImageUpload}
                      className="mt-1"
                      disabled={createLoading || heroImageUploading}
                    />
                    {heroImageUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-md">
                        <div className="flex items-center space-x-2 text-orange-600">
                          <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-medium">Uploading...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Supported formats: JPG, PNG, GIF, WebP (Max 10MB)
                  </p>
                </div>

                {/* Hero Image Preview */}
                {heroImagePreview && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Hero Image Preview:</p>
                    <div className="relative inline-block">
                      <img
                        src={heroImagePreview}
                        alt="Hero image preview"
                        className={`max-w-md max-h-64 rounded-lg border border-gray-200 object-cover ${heroImageUploading ? 'opacity-50' : ''}`}
                      />
                      {heroImageUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                          <div className="flex items-center space-x-2 text-white">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium">Uploading to Cloudinary...</span>
                          </div>
                        </div>
                      )}
                      <button
                        onClick={removeHeroImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        disabled={heroImageUploading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      File: {heroImageFile?.name} ({(heroImageFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
                      {heroImageUploading && (
                        <span className="text-orange-600 font-medium ml-2">• Uploading...</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Hero Image Requirements */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Hero Image Requirements:</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• High resolution (minimum 1920x1080px recommended)</li>
                    <li>• Landscape orientation preferred</li>
                    <li>• Clear, professional, and relevant to your content</li>
                    <li>• Avoid text-heavy images as content will overlay</li>
                    <li>• Ensure good contrast for text readability</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for this promotion..."
                rows={3}
              />
            </div>

            {/* Summary */}
            {selectedContent && selectedPackage && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Promotion Summary</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-600">Content:</span> {selectedContent.title}</p>
                  <p><span className="text-gray-600">Package:</span> {packages.find(p => p.id === selectedPackage)?.name}</p>
                  {selectedPackage === 'custom' ? (
                    <div className="bg-orange-50 p-3 rounded-lg mt-2">
                      <div className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 text-orange-600" />
                        <div>
                          <p className="font-medium text-orange-900 text-sm">Contact Required</p>
                          <p className="text-xs text-orange-700">
                            Please contact us at info.glowupchannel@gmail.com for a custom quote and proposal.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p><span className="text-gray-600">Duration:</span> {getDisplayDuration(packages.find(p => p.id === selectedPackage)!) || 7} days</p>
                      <p><span className="text-gray-600">Investment:</span> {formatCurrency(getDisplayPrice(packages.find(p => p.id === selectedPackage)!) || 0)}</p>
                      {selectedPackage === 'launch' && (
                        <p className="text-gray-600">
                          <span className="text-gray-600">Hero Image:</span> 
                          <span className={heroImageFile ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {heroImageFile ? " ✓ Uploaded" : " ✗ Required"}
                          </span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
          
          {/* Actions - Fixed at bottom */}
          <div className="flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePromotion}
                disabled={!selectedContent || !selectedPackage || createLoading || heroImageUploading || (selectedPackage === 'launch' && !heroImageFile)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {createLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{heroImageUploading ? 'Uploading Image...' : 'Creating...'}</span>
                  </div>
                ) : (
                  'Create Promotion'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Enterprise Promotion Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-600" />
              Enterprise Promotion Request
            </DialogTitle>
            <DialogDescription>
              Request a custom enterprise promotion package tailored to your specific needs.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Selected Content Display */}
            {selectedContent && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Selected Content</h4>
                <div className="flex items-center space-x-3">
                  {(() => {
                    const ContentIcon = getContentIcon(selectedContent.contentType || 'opportunity')
                    return <ContentIcon className="w-5 h-5 text-gray-600" />
                  })()}
                  <div>
                    <p className="font-medium">{selectedContent.title}</p>
                    <p className="text-sm text-gray-500">{selectedContent.contentType}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Enterprise Features */}
            <div className="space-y-2">
              <Label>Enterprise Features Available</Label>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Everything in Launch Package PLUS
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Custom campaign duration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Dedicated account manager
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Custom branding and design
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Advanced analytics and reporting
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Priority support and consultation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Multi-platform integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Custom content creation
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-orange-50 p-6 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-3">Get Your Custom Quote</h4>
              <p className="text-sm text-orange-800 mb-4">
                Our growth team will create a tailored proposal based on your specific requirements and goals.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-orange-800">
                  <strong>Email:</strong> 
                  <a 
                    href="mailto:info.glowupchannel@gmail.com" 
                    className="text-orange-600 hover:text-orange-800 font-medium ml-1"
                  >
                    info.glowupchannel@gmail.com
                  </a>
                </p>
                <p className="text-sm text-orange-800">
                  <strong>Response Time:</strong> Within 24 hours
                </p>
                <p className="text-sm text-orange-800">
                  <strong>What to include:</strong> Campaign goals, target audience, duration preferences, and any special requirements
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="customNotes">Additional Information (Optional)</Label>
              <Textarea
                id="customNotes"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Describe your campaign goals, target audience, duration preferences, or any special requirements..."
                rows={4}
              />
            </div>

          </div>
          
          {/* Actions - Fixed at bottom */}
          <div className="flex-shrink-0 border-t pt-4 mt-4">
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowCustomDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  const subject = `Enterprise Promotion Request - ${selectedContent?.title || 'Content Promotion'}`;
                  const body = `Hi,\n\nI'm interested in an enterprise promotion package for the following content:\n\nTitle: ${selectedContent?.title || 'N/A'}\nType: ${selectedContent?.contentType || 'N/A'}\n\nAdditional Information:\n${customNotes || 'None'}\n\nPlease provide a custom quote and proposal.\n\nBest regards`;
                  const mailtoLink = `mailto:info.glowupchannel@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  window.open(mailtoLink, '_blank');
                  setShowCustomDialog(false);
                }}
                className="bg-orange-500 hover:bg-orange-600"
              >
                Open Email Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-600" />
              Payment Details
            </DialogTitle>
            <DialogDescription>
              Complete your payment to activate your promotion
            </DialogDescription>
          </DialogHeader>
          
          {paymentDetails && (
            <div className="space-y-6">
              {/* Promotion Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Promotion Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Package:</span>
                    <p className="font-medium">{paymentDetails.promotion.packageName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p className="font-medium">{paymentDetails.promotion.duration} days</p>
                  </div>
                </div>
              </div>

              {/* Expected Payment Amount */}
              <div className="bg-orange-50 p-6 rounded-lg">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-orange-900 mb-2">
                    ₦{paymentDetails.payment.amount.toLocaleString()}
                  </h3>
                  <p className="text-orange-700">Expected Payment Amount</p>
                </div>
              </div>

              {/* Bank Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Bank Transfer Details</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Bank Name:</span>
                      <p className="font-medium">{paymentDetails.bankDetails.bankName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Account Name:</span>
                      <p className="font-medium">{paymentDetails.bankDetails.accountName}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Account Number:</span>
                      <p className="font-medium text-lg">{paymentDetails.bankDetails.accountNumber}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Transfer Reference:</span>
                      <p className="font-medium text-lg text-blue-600 font-mono">{paymentDetails.payment.paymentReference}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Payment Instructions</h4>
                <ol className="space-y-2 text-sm text-gray-700">
                  {paymentDetails.instructions.map((instruction: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="bg-orange-100 text-orange-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Receipt Upload Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Upload Payment Receipt</h4>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-sm text-green-800 mb-4">
                    <strong>💡 Tip:</strong> Select your payment receipt below. It will be uploaded automatically when you click "Confirm Payment & Upload Receipt".
                  </p>
                  
                  {/* File Upload */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="receipt-upload" className="text-sm font-medium text-gray-700">
                        Select Receipt Image (Max 5MB)
                      </Label>
                      <Input
                        id="receipt-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        className="mt-1"
                        disabled={paymentLoading}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Supported formats: JPG, PNG, GIF, WebP
                      </p>
                    </div>

                    {/* Receipt Preview */}
                    {receiptPreview && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Receipt Preview:</p>
                        <div className="relative inline-block">
                          <img
                            src={receiptPreview}
                            alt="Receipt preview"
                            className="max-w-xs max-h-48 rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={removeReceipt}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          File: {receiptFile?.name} ({(receiptFile?.size || 0 / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    )}

                    {/* Upload Status */}
                    {receiptFile && (
                      <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800">
                            Receipt ready to upload with payment confirmation
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Important Note */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-yellow-800 text-xs font-bold">!</span>
                  </div>
                  <div>
                    <p className="font-medium text-yellow-800">Important:</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Make sure to include the Transfer Reference in your transfer description. 
                      Your promotion will only go live after admin verification of your payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleCancelPayment}
                  disabled={paymentLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePaymentMade}
                  disabled={paymentLoading}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {paymentLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {receiptFile ? 'Confirm Payment & Upload Receipt' : 'I Have Made Payment'}
                      </span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
