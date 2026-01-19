"use client"

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Image as ImageIcon,
  Globe,
  Lock,
  X,
  Loader2,
  Send,
  Target,
  Briefcase,
  Calendar,
  BookOpen,
  MapPin,
  Clock,
  DollarSign
} from 'lucide-react'
import { toast } from 'sonner'

interface ContentItem {
  _id: string
  title: string
  description?: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  company?: string
  organization?: string
  author?: string
  location?: {
    country?: string
    province?: string
    city?: string
    isRemote?: boolean
    address?: string
  }
  dates?: {
    applicationDeadline?: string
    startDate?: string
    endDate?: string
    registrationDeadline?: string
    timezone?: string
  }
  financial?: {
    isPaid?: boolean
    amount?: string
    currency?: string
    benefits?: string[]
  }
  isPaid?: boolean
  price?: string
  currency?: string
  pay?: {
    amount?: string
    currency?: string
    period?: string
  }
  tags?: string[]
  category?: string
  duration?: string
  isPremium?: boolean
}

interface ContentShareComposerProps {
  content: ContentItem
  onPostCreated: (post: any) => void
  onClose: () => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

const typeConfig = {
  opportunity: { 
    icon: Target, 
    color: 'orange',
    label: 'Opportunity',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    accent: 'text-orange-500'
  },
  job: { 
    icon: Briefcase, 
    color: 'blue',
    label: 'Job',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    accent: 'text-blue-500'
  },
  event: { 
    icon: Calendar, 
    color: 'emerald',
    label: 'Event',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    accent: 'text-emerald-500'
  },
  resource: { 
    icon: BookOpen, 
    color: 'violet',
    label: 'Resource',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    accent: 'text-violet-500'
  }
}

export default function ContentShareComposer({ 
  content, 
  onPostCreated,
  onClose
}: ContentShareComposerProps) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [uploadedImages, setUploadedImages] = useState<{ url: string; publicId: string }[]>([])
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [isUploading, setIsUploading] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const config = typeConfig[content.type] || typeConfig.opportunity
  const TypeIcon = config.icon

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('accessToken')
    return { 'Authorization': `Bearer ${token}` }
  }, [])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed')
      return
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const uploadImages = async (): Promise<{ url: string; publicId: string }[]> => {
    if (images.length === 0) return []

    setIsUploading(true)
    try {
      const formData = new FormData()
      images.forEach(img => formData.append('images', img.file))

      const response = await fetch(`${API_BASE_URL}/api/posts/upload-images`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        return data.data.images
      } else {
        throw new Error(data.message || 'Failed to upload images')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload images')
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async () => {
    // Write-up is optional, but we need at least text or images
    if (!text.trim() && images.length === 0) {
      toast.error('Please add a write-up or images to your post')
      return
    }

    setIsPosting(true)
    try {
      // Upload images first if any
      let uploadedImgs: { url: string; publicId: string }[] = []
      if (images.length > 0) {
        uploadedImgs = await uploadImages()
      }

      const postData: any = {
        text: text.trim(),
        images: uploadedImgs,
        visibility,
        contentReference: {
          type: content.type,
          contentId: content._id,
          title: content.title,
          description: content.description,
          organization: content.organization || content.company || content.author,
          location: content.location,
          dates: content.dates,
          financial: content.financial || (content.isPaid ? { isPaid: true, amount: content.price } : null)
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Post created!')
        onPostCreated(data.data.post)
        onClose()
        
        // Reset form
        setText('')
        setImages([])
        setUploadedImages([])
      } else {
        throw new Error(data.message || 'Failed to create post')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post')
    } finally {
      setIsPosting(false)
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const getLocationString = () => {
    if (content.location?.isRemote) return 'Remote'
    const parts = [content.location?.city, content.location?.country].filter(Boolean)
    return parts.join(', ') || null
  }

  const getDateString = () => {
    if (content.dates?.applicationDeadline) {
      const date = new Date(content.dates.applicationDeadline)
      return `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }
    if (content.dates?.startDate) {
      const date = new Date(content.dates.startDate)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    return null
  }

  if (!user) return null

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-white/[0.06]">
        <DialogHeader>
          <DialogTitle className="text-white">Share {config.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Input Area */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
            <div className="flex gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
                {user.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt={user.firstName || user.email || 'Profile'}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()
                )}
              </div>

              {/* Input */}
              <div className="flex-1 min-w-0">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Add your thoughts about this..."
                  className="w-full bg-transparent text-white placeholder:text-white/30 resize-none outline-none min-h-[100px] text-[15px] leading-relaxed"
                  rows={4}
                />

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className={cn(
                    "grid gap-2 mt-3",
                    images.length === 1 && "grid-cols-1",
                    images.length === 2 && "grid-cols-2",
                    images.length >= 3 && "grid-cols-3"
                  )}>
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-white/[0.05]">
                        <Image
                          src={img.preview}
                          alt=""
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {/* Image Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={images.length >= 5}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    images.length >= 5
                      ? "text-white/20 cursor-not-allowed"
                      : "text-white/50 hover:text-orange-500 hover:bg-orange-500/10"
                  )}
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                {/* Visibility Toggle */}
                <button
                  onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
                  className={cn(
                    "p-2 rounded-lg transition-colors flex items-center gap-1.5",
                    visibility === 'private'
                      ? "text-yellow-500 bg-yellow-500/10"
                      : "text-white/50 hover:text-white/70"
                  )}
                >
                  {visibility === 'public' ? (
                    <Globe className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Post Button */}
              <Button
                onClick={handleSubmit}
                disabled={isPosting || isUploading || (!text.trim() && images.length === 0)}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-5"
              >
                {isPosting || isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Content Preview Card */}
          <div className={cn(
            "rounded-2xl border p-4",
            config.bg,
            config.border
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                config.bg
              )}>
                <TypeIcon className={cn("w-5 h-5", config.accent)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs font-medium", config.accent)}>
                    {config.label}
                  </span>
                  {(content.organization || content.company || content.author) && (
                    <>
                      <span className="text-white/20">•</span>
                      <span className="text-xs text-white/50 truncate">
                        {content.organization || content.company || content.author}
                      </span>
                    </>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-white mb-2 line-clamp-2">
                  {content.title}
                </h4>
                {content.description && (
                  <p className="text-xs text-white/60 line-clamp-2 mb-2">
                    {content.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                  {getLocationString() && (
                    <div className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{getLocationString()}</span>
                    </div>
                  )}
                  {getDateString() && (
                    <div className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{getDateString()}</span>
                    </div>
                  )}
                  {(content.financial?.isPaid || content.isPaid) && (
                    <div className="inline-flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span>{content.financial?.amount || content.price || 'Paid'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

