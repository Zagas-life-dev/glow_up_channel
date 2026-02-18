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
import { Image as ImageIcon, Lock, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { trackPostCreated } from '@/lib/tracking'
import {
  RiCloseLine,
  RiGlobalLine,
  RiLoader4Line,
  RiSendPlaneLine,
  RiFocus3Line,
  RiBriefcaseLine,
  RiCalendarLine,
  RiBook2Line,
  RiTimeLine,
  RiMoneyDollarCircleLine,
} from "react-icons/ri"

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
    iconName: 'target', 
    color: 'orange',
    label: 'Opportunity',
    bg: 'bg-primary/10',
    border: 'border-orange-500/20',
    accent: 'text-orange-500'
  },
  job: { 
    iconName: 'briefcase', 
    color: 'primary',
    label: 'Job',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    accent: 'text-primary'
  },
  event: { 
    iconName: 'calendar', 
    color: 'emerald',
    label: 'Event',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    accent: 'text-emerald-500'
  },
  resource: { 
    iconName: 'book', 
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

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-page border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Share {config.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Input Area */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0">
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
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[100px] text-[15px] leading-relaxed"
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
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
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
                          <RiCloseLine className="w-4 h-4 text-foreground" aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2">
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
                      ? "text-muted-foreground cursor-not-allowed"
                      : "text-muted-foreground hover:text-orange-500 hover:bg-primary/10"
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
                      : "text-muted-foreground hover:text-muted-foreground"
                  )}
                >
                  {visibility === 'public' ? (
                    <RiGlobalLine className="w-5 h-5" aria-hidden />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Post Button */}
              <Button
                onClick={handleSubmit}
                disabled={isPosting || isUploading || (!text.trim() && images.length === 0)}
                className="bg-primary hover:bg-primary/90 text-foreground rounded-full px-5"
              >
                {isPosting || isUploading ? (
                  <RiLoader4Line className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <>
                    <RiSendPlaneLine className="w-4 h-4 mr-2" aria-hidden />
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
                {content.type === 'opportunity' && (
                  <RiFocus3Line className={cn("w-5 h-5", config.accent)} aria-hidden />
                )}
                {content.type === 'job' && (
                  <RiBriefcaseLine className={cn("w-5 h-5", config.accent)} aria-hidden />
                )}
                {content.type === 'event' && (
                  <RiCalendarLine className={cn("w-5 h-5", config.accent)} aria-hidden />
                )}
                {content.type === 'resource' && (
                  <RiBook2Line className={cn("w-5 h-5", config.accent)} aria-hidden />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs font-medium", config.accent)}>
                    {config.label}
                  </span>
                  {(content.organization || content.company || content.author) && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {content.organization || content.company || content.author}
                      </span>
                    </>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-2 line-clamp-2">
                  {content.title}
                </h4>
                {content.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {content.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {getLocationString() && (
                    <div className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{getLocationString()}</span>
                    </div>
                  )}
                  {getDateString() && (
                    <div className="inline-flex items-center gap-1">
                      <RiTimeLine className="w-3 h-3" aria-hidden />
                      <span>{getDateString()}</span>
                    </div>
                  )}
                  {(content.financial?.isPaid || content.isPaid) && (
                    <div className="inline-flex items-center gap-1">
                      <RiMoneyDollarCircleLine className="w-3 h-3" aria-hidden />
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

