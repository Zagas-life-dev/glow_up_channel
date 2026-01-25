"use client"

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  User,
  Camera,
  X,
  Loader2,
  Plus,
  Briefcase,
  GraduationCap,
  Link as LinkIcon,
  Globe,
  Lock,
  Users,
  Save
} from 'lucide-react'
import { FaLinkedin, FaTwitter, FaInstagram, FaGithub } from 'react-icons/fa'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

interface ProfileData {
  _id: string
  firstName?: string
  lastName?: string
  profileImage?: string
  bio?: string
  headline?: string
  website?: string
  skills: string[]
  work?: { company?: string; title?: string }
  education?: { school?: string; degree?: string; field?: string }
  socialLinks?: { linkedin?: string; twitter?: string; instagram?: string; github?: string }
  isPrivate: boolean
  showConnections: boolean
}

interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
  profile: ProfileData
  onUpdate: (updated: Partial<ProfileData>) => void
}

export default function ProfileEditModal({ isOpen, onClose, profile, onUpdate }: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    bio: profile.bio || '',
    headline: profile.headline || '',
    website: profile.website || '',
    skills: profile.skills || [],
    work: profile.work || { company: '', title: '' },
    education: profile.education || { school: '', degree: '', field: '' },
    socialLinks: profile.socialLinks || { linkedin: '', twitter: '', instagram: '', github: '' },
    isPrivate: profile.isPrivate || false,
    showConnections: profile.showConnections !== false
  })
  
  const [newSkill, setNewSkill] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(profile.profileImage || null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getAuthHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    const reader = new FileReader()
    reader.onload = (e) => setPreviewImage(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const token = localStorage.getItem('accessToken')
      const response = await fetch(`${API_BASE_URL}/api/profile/me/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      const data = await response.json()

      if (data.success) {
        setPreviewImage(data.data.profileImage)
        onUpdate({ profileImage: data.data.profileImage })
      } else {
        setError(data.message || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      setError('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddSkill = () => {
    const skill = newSkill.trim()
    if (skill && formData.skills.length < 20 && !formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }))
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          firstName: formData.firstName || null,
          lastName: formData.lastName || null,
          bio: formData.bio || null,
          headline: formData.headline || null,
          website: formData.website || null,
          skills: formData.skills,
          work: formData.work.title || formData.work.company ? formData.work : null,
          education: formData.education.school ? formData.education : null,
          socialLinks: formData.socialLinks,
          isPrivate: formData.isPrivate,
          showConnections: formData.showConnections
        })
      })
      const data = await response.json()

      if (data.success) {
        onUpdate(data.data.profile)
        onClose()
      } else {
        setError(data.message || 'Failed to update profile')
      }
    } catch (err) {
      console.error('Error updating profile:', err)
      setError('Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[500px] bg-[#0a0a0a] border-white/[0.08] p-0 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-white">Edit Profile</SheetTitle>
              <SheetDescription className="text-white/40 text-xs">
                Update your profile information
              </SheetDescription>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05]">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-140px)] p-6 space-y-6">
          {/* Profile Image */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/[0.05]">
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-white/40 mt-2">Click to upload new photo</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">Basic Info</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">First Name</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="John"
                  className="mt-1 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Doe"
                  className="mt-1 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-white/60 text-xs">Headline</Label>
              <Input
                value={formData.headline}
                onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                placeholder="Software Engineer | Tech Enthusiast"
                maxLength={100}
                className="mt-1 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
              />
              <p className="text-xs text-white/30 mt-1">{formData.headline.length}/100</p>
            </div>

            <div>
              <Label className="text-white/60 text-xs">Bio</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell people about yourself..."
                maxLength={500}
                rows={4}
                className="mt-1 bg-white/[0.05] border-white/[0.08] text-white rounded-xl resize-none"
              />
              <p className="text-xs text-white/30 mt-1">{formData.bio.length}/500</p>
            </div>

            <div>
              <Label className="text-white/60 text-xs">Website</Label>
              <div className="relative mt-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="pl-10 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Work */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Work
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Job Title</Label>
                <Input
                  value={formData.work.title || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    work: { ...prev.work, title: e.target.value }
                  }))}
                  placeholder="Software Engineer"
                  className="mt-1 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Company</Label>
                <Input
                  value={formData.work.company || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    work: { ...prev.work, company: e.target.value }
                  }))}
                  placeholder="Google"
                  className="mt-1 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Education
            </h3>
            
            <div>
              <Label className="text-white/60 text-xs">School/University</Label>
              <Input
                value={formData.education.school || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  education: { ...prev.education, school: e.target.value }
                }))}
                placeholder="Stanford University"
                className="mt-1 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/60 text-xs">Degree</Label>
                <Input
                  value={formData.education.degree || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    education: { ...prev.education, degree: e.target.value }
                  }))}
                  placeholder="Bachelor's"
                  className="mt-1 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
              <div>
                <Label className="text-white/60 text-xs">Field of Study</Label>
                <Input
                  value={formData.education.field || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    education: { ...prev.education, field: e.target.value }
                  }))}
                  placeholder="Computer Science"
                  className="mt-1 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">
              Skills & Interests ({formData.skills.length}/20)
            </h3>
            
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                placeholder="Add a skill..."
                className="bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
              />
              <Button
                onClick={handleAddSkill}
                disabled={!newSkill.trim() || formData.skills.length >= 20}
                size="icon"
                className="bg-orange-500 hover:bg-orange-600 rounded-xl flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-sm"
                  >
                    {skill}
                    <button 
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-orange-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">Social Links</h3>
            
            <div className="space-y-3">
              <div className="relative">
                <FaLinkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0077b5]" />
                <Input
                  value={formData.socialLinks.linkedin || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, linkedin: e.target.value }
                  }))}
                  placeholder="https://linkedin.com/in/username"
                  className="pl-10 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
              
              <div className="relative">
                <FaTwitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1da1f2]" />
                <Input
                  value={formData.socialLinks.twitter || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, twitter: e.target.value }
                  }))}
                  placeholder="https://twitter.com/username"
                  className="pl-10 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
              
              <div className="relative">
                <FaInstagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#e4405f]" />
                <Input
                  value={formData.socialLinks.instagram || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, instagram: e.target.value }
                  }))}
                  placeholder="https://instagram.com/username"
                  className="pl-10 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
              
              <div className="relative">
                <FaGithub className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <Input
                  value={formData.socialLinks.github || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    socialLinks: { ...prev.socialLinks, github: e.target.value }
                  }))}
                  placeholder="https://github.com/username"
                  className="pl-10 bg-white/[0.05] border-white/[0.08] text-white rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider">Privacy</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  {formData.isPrivate ? (
                    <Lock className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Globe className="w-5 h-5 text-emerald-500" />
                  )}
                  <div>
                    <p className="font-medium text-white">Private Account</p>
                    <p className="text-xs text-white/50">
                      {formData.isPrivate 
                        ? "People must request to partner with you"
                        : "Anyone can partner with you"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.isPrivate}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPrivate: checked }))}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-violet-500" />
                  <div>
                    <p className="font-medium text-white">Show Connections</p>
                    <p className="text-xs text-white/50">
                      {formData.showConnections 
                        ? "Your partners/partnering are visible"
                        : "Your connections are hidden"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.showConnections}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showConnections: checked }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-white/[0.06] px-6 py-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-orange-500 hover:bg-orange-600 rounded-xl"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

