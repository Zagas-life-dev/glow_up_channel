"use client"

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ApiClient from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2, Send, MapPin, DollarSign, Clock, Globe, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const opportunityTypes = [
  'Internship', 'Scholarship', 'Grant', 'Fellowship', 'Volunteer Work',
  'Mentorship Program', 'Training Program', 'Workshop', 'Competition',
  'Research Opportunity', 'Startup Incubator', 'Accelerator Program',
  'Hackathon', 'Bootcamp', 'Exchange Program', 'Apprenticeship', 'Other',
]
const jobTypeOptions = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
  { value: 'remote', label: 'Remote' },
  { value: 'graduate-trainee', label: 'Graduate Trainee' },
  { value: 'other', label: 'Other' },
]
const eventTypes = ['Workshop', 'Conference', 'Webinar', 'Meetup', 'Hackathon', 'Networking', 'Bootcamp', 'Career Fair', 'Other']
const resourceCategories = ['Course', 'Tutorial', 'E-book', 'Tool', 'Template', 'Guide', 'Podcast', 'Video Series', 'Product', 'Other']

export interface PostedItemForEdit {
  _id: string
  title: string
  type: 'opportunity' | 'job' | 'event' | 'resource'
  company?: string
  organizer?: string
  status?: string
  isApproved?: boolean
  tags?: string[]
  location?: { country?: string; province?: string; city?: string; isRemote?: boolean }
  [key: string]: any
}

interface EditContentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: PostedItemForEdit | null
  onSaved: () => void
}

function getFullItem(res: any, type: string): any {
  if (!res) return null
  const map: Record<string, string> = {
    opportunity: 'opportunity',
    job: 'job',
    event: 'event',
    resource: 'resource',
  }
  const key = map[type]
  return (key && res[key]) || res
}

export function EditContentModal({ open, onOpenChange, item, onSaved }: EditContentModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isRemote, setIsRemote] = useState(false)
  const [isPaid, setIsPaid] = useState(false)

  const fetchFullItem = useCallback(async () => {
    if (!item?._id || !item?.type) return
    setLoading(true)
    setError('')
    try {
      let res: any
      switch (item.type) {
        case 'opportunity':
          res = await ApiClient.getOpportunityById(item._id)
          break
        case 'job':
          res = await ApiClient.getJobById(item._id)
          break
        case 'event':
          res = await ApiClient.getEventById(item._id)
          break
        case 'resource':
          res = await ApiClient.getResourceById(item._id)
          break
        default:
          throw new Error(`Unknown type: ${item.type}`)
      }
      const full = getFullItem(res, item.type)
      if (!full) throw new Error('Failed to load content')
      setFormData(full)
      setTags(Array.isArray(full.tags) ? [...full.tags] : [])
      setTagInput('')
      setIsRemote(!!full.location?.isRemote)
      setIsPaid(
        full.isPaid !== undefined
          ? full.isPaid
          : !!(full.pay?.isPaid || full.financial?.isPaid)
      )
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
      toast.error(e?.message || 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [item?._id, item?.type])

  useEffect(() => {
    if (open && item) fetchFullItem()
    else {
      setFormData({})
      setTags([])
      setError('')
    }
  }, [open, item, fetchFullItem])

  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const updateNested = (parent: string, key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...(prev[parent] || {}), [key]: value },
    }))
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const t = tagInput.trim()
      if (t && !tags.includes(t) && tags.length < 10) {
        setTags([...tags, t])
        setTagInput('')
      }
    }
  }

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item?._id || !item?.type) return
    setSaving(true)
    setError('')
    try {
      const id = item._id
      const type = item.type

      if (type === 'opportunity') {
        const payload = {
          title: formData.title,
          type: formData.type,
          description: formData.description,
          url: formData.url,
          requirements: formData.requirements,
          tags,
          location: {
            country: formData.location?.country,
            province: formData.location?.province,
            city: formData.location?.city,
            isRemote,
          },
          financial: {
            isPaid,
            amount: formData.financial?.amount,
            currency: formData.financial?.currency || 'NGN',
          },
          dates: formData.dates ? { applicationDeadline: formData.dates.applicationDeadline } : undefined,
        }
        await ApiClient.updateOpportunity(id, payload)
      } else if (type === 'job') {
        const payload = {
          title: formData.title,
          company: formData.company,
          jobType: formData.jobType || (formData.type && String(formData.type).toLowerCase().replace(/\s+/g, '-')) || undefined,
          description: formData.description,
          url: formData.url,
          tags,
          location: {
            country: formData.location?.country,
            province: formData.location?.province,
            city: formData.location?.city,
            isRemote,
          },
          pay: {
            isPaid,
            amount: formData.pay?.amount,
            period: formData.pay?.period,
            currency: formData.pay?.currency || 'NGN',
          },
          dates: formData.dates ? { applicationDeadline: formData.dates.applicationDeadline } : undefined,
        }
        await ApiClient.updateJob(id, payload)
      } else if (type === 'event') {
        const eventPrice = formData.price != null ? Number(formData.price) : undefined
        const capacityNum = formData.capacity != null ? parseInt(String(formData.capacity), 10) : undefined
        const payload = {
          title: formData.title,
          organizer: formData.organizer,
          eventType: formData.eventType || formData.type,
          description: formData.description,
          url: formData.url,
          tags,
          isPaid,
          ...(isPaid && eventPrice != null && !Number.isNaN(eventPrice) && { price: eventPrice }),
          currency: formData.currency || 'NGN',
          location: {
            ...(formData.location?.country && { country: formData.location.country }),
            ...(formData.location?.province && { province: formData.location.province }),
            ...(formData.location?.city && { city: formData.location.city }),
            isRemote,
          },
          dates: {
            ...(formData.dates?.startDate && { startDate: formData.dates.startDate }),
            ...(formData.dates?.endDate && { endDate: formData.dates.endDate }),
            ...(formData.dates?.registrationDeadline && { registrationDeadline: formData.dates.registrationDeadline }),
          },
          ...(capacityNum != null && !Number.isNaN(capacityNum) && capacityNum >= 1 && { capacity: { maxAttendees: capacityNum } }),
        }
        await ApiClient.updateEvent(id, payload)
      } else if (type === 'resource') {
        const resourceCategory = (formData.type || formData.category || '').trim()
        const payload = {
          title: formData.title,
          description: formData.description,
          category: resourceCategory,
          ...(formData.paymentLink?.trim() && { paymentLink: formData.paymentLink.trim() }),
        }
        await ApiClient.updateResource(id, payload)
      }

      toast.success('Content updated successfully')
      onOpenChange(false)
      onSaved()
    } catch (err: any) {
      const msg = err?.message || 'Failed to update'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = item?.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-card border-border">
        <DialogHeader>
          <DialogTitle>Edit {typeLabel}</DialogTitle>
          <DialogDescription>Update the details below. Changes may require re-approval.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-4 pr-2">
            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title ?? ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                  className="bg-muted border-border"
                />
              </div>
              {(item?.type === 'opportunity' || item?.type === 'job') && (
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={formData.company ?? formData.provider ?? ''}
                    onChange={(e) => updateField('company', e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
              )}
              {item?.type === 'event' && (
                <div className="space-y-2">
                  <Label>Organizer</Label>
                  <Input
                    value={formData.organizer ?? ''}
                    onChange={(e) => updateField('organizer', e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
              )}
            </div>

            {(item?.type === 'opportunity' || item?.type === 'job' || item?.type === 'event') && (
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.eventType || formData.jobType || formData.type || ''}
                  onValueChange={(v) => {
                    if (item?.type === 'event') updateField('eventType', v)
                    else if (item?.type === 'job') updateField('jobType', v)
                    else updateField('type', v)
                  }}
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {item?.type === 'opportunity' && opportunityTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                    {item?.type === 'job' && jobTypeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                    {item?.type === 'event' && eventTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {item?.type === 'resource' && (
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category || formData.type || ''}
                  onValueChange={(v) => { updateField('category', v); updateField('type', v) }}
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {resourceCategories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description ?? ''}
                onChange={(e) => updateField('description', e.target.value)}
                required
                rows={4}
                className="bg-muted border-border resize-none"
              />
            </div>

            {(item?.type !== 'resource') && (
              <div className="space-y-2">
                <Label>External Link *</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={formData.url ?? ''}
                    onChange={(e) => updateField('url', e.target.value)}
                    type="url"
                    required
                    className="pl-10 bg-muted border-border"
                  />
                </div>
              </div>
            )}

            {item?.type === 'resource' && (
              <div className="space-y-2">
                <Label>Payment / Link</Label>
                <Input
                  value={formData.paymentLink ?? ''}
                  onChange={(e) => updateField('paymentLink', e.target.value)}
                  placeholder="https://..."
                  className="bg-muted border-border"
                />
              </div>
            )}

            {item?.type !== 'resource' && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Location
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Virtual</span>
                    <Switch checked={isRemote} onCheckedChange={setIsRemote} />
                  </div>
                </div>
                {!isRemote && (
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Country"
                      value={formData.location?.country ?? ''}
                      onChange={(e) => updateNested('location', 'country', e.target.value)}
                      className="bg-muted border-border text-sm"
                    />
                    <Input
                      placeholder="State/Province"
                      value={formData.location?.province ?? ''}
                      onChange={(e) => updateNested('location', 'province', e.target.value)}
                      className="bg-muted border-border text-sm"
                    />
                    <Input
                      placeholder="City"
                      value={formData.location?.city ?? ''}
                      onChange={(e) => updateNested('location', 'city', e.target.value)}
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {(item?.type === 'opportunity' || item?.type === 'job' || item?.type === 'event') && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    {item.type === 'event' ? 'Paid event' : 'Paid'}
                  </span>
                  <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                </div>
                {isPaid && (
                  <Input
                    placeholder={item.type === 'event' ? 'Price' : 'Amount'}
                    value={
                      item.type === 'event'
                        ? formData.price ?? ''
                        : formData.pay?.amount ?? formData.financial?.amount ?? ''
                    }
                    onChange={(e) => {
                      if (item.type === 'event') updateField('price', e.target.value)
                      else updateNested('pay', 'amount', e.target.value)
                    }
                    }
                    className="bg-muted border-border"
                  />
                )}
              </div>
            )}

            {item?.type !== 'resource' && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Dates
                </span>
                {item?.type === 'event' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Start</Label>
                      <Input
                        type="date"
                        value={formData.dates?.startDate?.slice?.(0, 10) ?? ''}
                        onChange={(e) => updateNested('dates', 'startDate', e.target.value)}
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">End</Label>
                      <Input
                        type="date"
                        value={formData.dates?.endDate?.slice?.(0, 10) ?? ''}
                        onChange={(e) => updateNested('dates', 'endDate', e.target.value)}
                        className="bg-muted border-border text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs">Application deadline</Label>
                    <Input
                      type="date"
                      value={formData.dates?.applicationDeadline?.slice?.(0, 10) ?? ''}
                      onChange={(e) => updateNested('dates', 'applicationDeadline', e.target.value)}
                      className="bg-muted border-border text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {item?.type === 'event' && (
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  placeholder="Max attendees"
                  value={formData.capacity?.maxAttendees ?? formData.capacity ?? ''}
                  onChange={(e) => updateField('capacity', e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
            )}

            {item?.type === 'opportunity' && (
              <div className="space-y-2">
                <Label>Requirements</Label>
                <Textarea
                  value={formData.requirements ?? ''}
                  onChange={(e) => updateField('requirements', e.target.value)}
                  rows={3}
                  className="bg-muted border-border resize-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mb-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-sm"
                  >
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Type and Enter to add (max 10)"
                className="bg-muted border-border"
              />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Save changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
