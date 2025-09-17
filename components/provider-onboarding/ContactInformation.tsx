"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Mail, Phone, MapPin, Globe, Calendar, Shield, FileText } from 'lucide-react'

interface ContactInformationProps {
  data: any
  updateData: (updates: any) => void
  isComplete: boolean
}

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
]

// Year established will be a number input instead of select options

export default function ContactInformation({ data, updateData, isComplete }: ContactInformationProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
        <p className="text-sm text-gray-600">How can we reach you?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Official Email */}
        <div>
          <Label htmlFor="officialEmail" className="text-sm font-medium text-gray-700">
            Official Email (verified once via OTP/activation link) *
          </Label>
          <Input
            id="officialEmail"
            type="email"
            value={data.officialEmail || ''}
            onChange={(e) => updateData({ officialEmail: e.target.value })}
            placeholder="your-email@organization.com"
            className="mt-1"
          />
        </div>

        {/* Phone Number */}
        <div>
          <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
            Phone Number (WhatsApp/Cell) *
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            value={data.phoneNumber || ''}
            onChange={(e) => updateData({ phoneNumber: e.target.value })}
            placeholder="+234 800 000 0000"
            className="mt-1"
          />
        </div>

        {/* State of Operation */}
        <div>
          <Label htmlFor="stateOfOperation" className="text-sm font-medium text-gray-700">
            State of Operation *
          </Label>
          <Select
            value={data.stateOfOperation || ''}
            onValueChange={(value) => updateData({ stateOfOperation: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Year Established */}
        <div>
          <Label htmlFor="yearEstablished" className="text-sm font-medium text-gray-700">
            Year Established *
          </Label>
          <Input
            id="yearEstablished"
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            value={data.yearEstablished || ''}
            onChange={(e) => updateData({ yearEstablished: e.target.value })}
            placeholder="e.g., 2020"
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the year your organization was established
          </p>
        </div>

        {/* Website */}
        <div>
          <Label htmlFor="website" className="text-sm font-medium text-gray-700">
            Website (optional but helps credibility)
          </Label>
          <Input
            id="website"
            type="url"
            value={data.website || ''}
            onChange={(e) => updateData({ website: e.target.value })}
            placeholder="https://www.yourwebsite.com"
            className="mt-1"
          />
        </div>

        {/* Social Media Handles */}
        <div>
          <Label htmlFor="socialMediaHandles" className="text-sm font-medium text-gray-700">
            Social Media Handles (optional)
          </Label>
          <Input
            id="socialMediaHandles"
            value={data.socialMediaHandles || ''}
            onChange={(e) => updateData({ socialMediaHandles: e.target.value })}
            placeholder="@yourhandle, @yourorg"
            className="mt-1"
          />
        </div>
      </div>

      {/* Registration Status Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-orange-600" />
          <h4 className="text-lg font-semibold text-gray-900">Registration Status</h4>
        </div>
        
        <div className="space-y-6">
          {/* Are you a registered organization? */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Are you a registered organization? *
            </Label>
            <RadioGroup
              value={data.isRegistered ? 'yes' : 'no'}
              onValueChange={(value) => updateData({ isRegistered: value === 'yes' })}
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="registered-yes" />
                <Label htmlFor="registered-yes" className="text-sm text-gray-700 cursor-pointer">
                  Yes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="registered-no" />
                <Label htmlFor="registered-no" className="text-sm text-gray-700 cursor-pointer">
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Registration Number (if registered) */}
          {data.isRegistered && (
            <div>
              <Label htmlFor="registrationNumber" className="text-sm font-medium text-gray-700">
                CAC/Registration Number *
              </Label>
              <Input
                id="registrationNumber"
                value={data.registrationNumber || ''}
                onChange={(e) => updateData({ registrationNumber: e.target.value })}
                placeholder="Enter your CAC/Registration number"
                className="mt-1"
              />
            </div>
          )}

          {/* ID Options (if not registered) */}
          {!data.isRegistered && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">
                Please provide one of the following IDs: *
              </Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nationalId" className="text-sm font-medium text-gray-700">
                    National ID
                  </Label>
                  <Input
                    id="nationalId"
                    value={data.nationalId || ''}
                    onChange={(e) => updateData({ nationalId: e.target.value })}
                    placeholder="Enter National ID number"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="passportId" className="text-sm font-medium text-gray-700">
                    Passport ID
                  </Label>
                  <Input
                    id="passportId"
                    value={data.passportId || ''}
                    onChange={(e) => updateData({ passportId: e.target.value })}
                    placeholder="Enter Passport ID number"
                    className="mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="otherId" className="text-sm font-medium text-gray-700">
                    Other ID
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="otherId"
                      value={data.otherId || ''}
                      onChange={(e) => updateData({ otherId: e.target.value })}
                      placeholder="Enter other ID number"
                      className="mt-1 flex-1"
                    />
                    <Input
                      value={data.otherIdType || ''}
                      onChange={(e) => updateData({ otherIdType: e.target.value })}
                      placeholder="ID Type (e.g., Driver's License)"
                      className="mt-1 flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completion Status */}
      {isComplete && (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
          <span className="text-sm font-medium">Contact information completed</span>
        </div>
      )}
    </div>
  )
}