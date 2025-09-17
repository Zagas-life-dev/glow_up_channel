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
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
          <Building2 className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Organization Details</h3>
        <p className="text-sm text-gray-600">Tell us about your organization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization Name */}
        <div className="md:col-span-2">
          <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700">
            Organization/Provider Name *
          </Label>
          <Input
            id="organizationName"
            value={data.organizationName || ''}
            onChange={(e) => updateData({ organizationName: e.target.value })}
            placeholder="Enter your organization name"
            className="mt-1"
          />
        </div>

        {/* Provider Type */}
        <div className="md:col-span-2">
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Provider Type *
          </Label>
          <RadioGroup
            value={data.providerType || ''}
            onValueChange={handleProviderTypeChange}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {PROVIDER_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <RadioGroupItem value={type.value} id={type.value} />
                <Label htmlFor={type.value} className="text-sm text-gray-700 cursor-pointer">
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
              className="mt-3"
            />
          )}
        </div>

        {/* Contact Person */}
        <div>
          <Label htmlFor="contactPersonName" className="text-sm font-medium text-gray-700">
            Contact Person Name *
          </Label>
          <Input
            id="contactPersonName"
            value={data.contactPersonName || ''}
            onChange={(e) => updateData({ contactPersonName: e.target.value })}
            placeholder="Full name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="contactPersonRole" className="text-sm font-medium text-gray-700">
            Contact Person Role *
          </Label>
          <Input
            id="contactPersonRole"
            value={data.contactPersonRole || ''}
            onChange={(e) => updateData({ contactPersonRole: e.target.value })}
            placeholder="e.g., HR Manager, CEO"
            className="mt-1"
          />
        </div>

        {/* Provider Address */}
        <div className="md:col-span-2">
          <Label htmlFor="providerAddress" className="text-sm font-medium text-gray-700">
            Provider's Address *
          </Label>
          <Textarea
            id="providerAddress"
            value={data.providerAddress || ''}
            onChange={(e) => updateData({ providerAddress: e.target.value })}
            placeholder="Enter complete address"
            rows={3}
            className="mt-1"
          />
        </div>

        {/* About Organization */}
        <div className="md:col-span-2">
          <Label htmlFor="aboutOrganization" className="text-sm font-medium text-gray-700">
            About the organization/provider *
          </Label>
          <Textarea
            id="aboutOrganization"
            value={data.aboutOrganization || ''}
            onChange={(e) => updateData({ aboutOrganization: e.target.value })}
            placeholder="Describe your organization, mission, and what you do"
            rows={4}
            className="mt-1"
          />
        </div>
      </div>

      {/* Completion Status */}
      {isComplete && (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
          <span className="text-sm font-medium">Organization details completed</span>
        </div>
      )}
    </div>
  )
}