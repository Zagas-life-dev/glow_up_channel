"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Building2, User, MapPin, FileText } from 'lucide-react'

interface OrganizationDetailsProps {
  data: any
  updateData: (updates: any) => void
  isComplete: boolean
}

const PROVIDER_TYPES = [
  { value: 'individual', label: 'Individual' },
  { value: 'private-company', label: 'Private Company' },
  { value: 'ngo', label: 'NGO/Non Profit' },
  { value: 'government', label: 'Government' },
  { value: 'academic', label: 'Academic Institution' },
  { value: 'other', label: 'Others' }
]

export default function OrganizationDetails({ data, updateData, isComplete }: OrganizationDetailsProps) {
  const handleProviderTypeChange = (value: string) => {
    updateData({ 
      providerType: value,
      otherProviderType: value === 'other' ? data.otherProviderType : ''
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Organization Name */}
        <div className="md:col-span-2">
          <Label htmlFor="organizationName" className="text-sm font-medium text-muted-foreground mb-2 block">
            Organization/Provider Name *
          </Label>
          <Input
            id="organizationName"
            value={data.organizationName || ''}
            onChange={(e) => updateData({ organizationName: e.target.value })}
            placeholder="Enter your organization name"
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl"
          />
        </div>

        {/* Provider Type */}
        <div className="md:col-span-2">
          <Label className="text-sm font-medium text-muted-foreground mb-3 block">
            Provider Type *
          </Label>
          <RadioGroup
            value={data.providerType || ''}
            onValueChange={handleProviderTypeChange}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {PROVIDER_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-3 p-3 rounded-xl bg-muted border border-border hover:bg-muted transition-colors">
                <RadioGroupItem value={type.value} id={type.value} className="border-border data-[state=checked]:border-orange-500 data-[state=checked]:bg-primary" />
                <Label htmlFor={type.value} className="text-sm text-muted-foreground cursor-pointer flex-1">
                  {type.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          
          {data.providerType === 'other' && (
            <Input
              value={data.otherProviderType || ''}
              onChange={(e) => updateData({ otherProviderType: e.target.value })}
              placeholder="Please specify"
              className="mt-3 bg-muted border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl"
            />
          )}
        </div>

        {/* Contact Person */}
        <div>
          <Label htmlFor="contactPersonName" className="text-sm font-medium text-muted-foreground mb-2 block">
            Contact Person Name *
          </Label>
          <Input
            id="contactPersonName"
            value={data.contactPersonName || ''}
            onChange={(e) => updateData({ contactPersonName: e.target.value })}
            placeholder="Full name"
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="contactPersonRole" className="text-sm font-medium text-muted-foreground mb-2 block">
            Contact Person Role *
          </Label>
          <Input
            id="contactPersonRole"
            value={data.contactPersonRole || ''}
            onChange={(e) => updateData({ contactPersonRole: e.target.value })}
            placeholder="e.g., HR Manager, CEO"
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-11 rounded-xl"
          />
        </div>

        {/* Provider Address */}
        <div className="md:col-span-2">
          <Label htmlFor="providerAddress" className="text-sm font-medium text-muted-foreground mb-2 block">
            Provider's Address *
          </Label>
          <Textarea
            id="providerAddress"
            value={data.providerAddress || ''}
            onChange={(e) => updateData({ providerAddress: e.target.value })}
            placeholder="Enter complete address"
            rows={3}
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none"
          />
        </div>

        {/* About Organization */}
        <div className="md:col-span-2">
          <Label htmlFor="aboutOrganization" className="text-sm font-medium text-muted-foreground mb-2 block">
            About the organization/provider *
          </Label>
          <Textarea
            id="aboutOrganization"
            value={data.aboutOrganization || ''}
            onChange={(e) => updateData({ aboutOrganization: e.target.value })}
            placeholder="Describe your organization, mission, and what you do"
            rows={4}
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none"
          />
        </div>
      </div>

      {/* Completion Status */}
      {isComplete && (
        <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
          <div className="w-5 h-5 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-400 text-xs">✓</span>
          </div>
          <span className="text-sm font-medium">Organization details completed</span>
        </div>
      )}
    </div>
  )
}