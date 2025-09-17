"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { CheckCircle, FileText, Shield, Users } from 'lucide-react'

interface TermsAndConditionsProps {
  data: any
  updateData: (updates: any) => void
  isComplete: boolean
}

export default function TermsAndConditions({ data, updateData, isComplete }: TermsAndConditionsProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
            <h3 className="text-lg font-semibold text-gray-900">Terms & Conditions</h3>
        <p className="text-sm text-gray-600">Please review and agree to our terms</p>
        </div>

      <div className="space-y-6">
        {/* Terms and Conditions Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <FileText className="w-5 h-5 text-orange-600" />
              <span>Terms of Service, Privacy Policy, and Community Guidelines</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <h4 className="font-semibold text-gray-900 mb-2">1. Platform Usage</h4>
              <p className="text-gray-600 mb-4">
                By using the Glow Up Channel platform, you agree to use it responsibly and in accordance with our community guidelines. 
                You are responsible for all content you post and the accuracy of information provided.
              </p>

              <h4 className="font-semibold text-gray-900 mb-2">2. Content Guidelines</h4>
              <p className="text-gray-600 mb-4">
                All posted opportunities must be legitimate, accurate, and comply with Nigerian laws. 
                Prohibited content includes but is not limited to: fraudulent opportunities, discriminatory postings, 
                and content that violates intellectual property rights.
              </p>

              <h4 className="font-semibold text-gray-900 mb-2">3. Data Privacy</h4>
              <p className="text-gray-600 mb-4">
                We collect and process your data in accordance with our Privacy Policy. 
                Your personal information will be used to provide our services and may be shared with relevant parties 
                for opportunity verification purposes.
              </p>

              <h4 className="font-semibold text-gray-900 mb-2">4. Verification Requirements</h4>
              <p className="text-gray-600 mb-4">
                All organizations must provide valid verification documents. 
                We reserve the right to verify the authenticity of all submitted documents and may request additional verification.
              </p>

              <h4 className="font-semibold text-gray-900 mb-2">5. Platform Moderation</h4>
              <p className="text-gray-600 mb-4">
                We reserve the right to review, moderate, and remove any content that violates our guidelines. 
                Repeated violations may result in account suspension or termination.
              </p>

              <h4 className="font-semibold text-gray-900 mb-2">6. Liability and Disclaimers</h4>
              <p className="text-gray-600 mb-4">
                The platform serves as a connection point between opportunity providers and seekers. 
                We are not responsible for the outcomes of opportunities or any disputes between parties.
              </p>
              </div>
          </CardContent>
        </Card>

        {/* Community Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Community Guidelines</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">
                  Post only legitimate opportunities that comply with Nigerian employment and education laws
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">
                  Provide accurate and complete information about opportunities
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">
                  Respect all users and maintain professional communication
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">
                  Do not post discriminatory or offensive content
                </p>
      </div>
            <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-gray-600">
                  Report any suspicious or inappropriate content to our moderation team
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Checkbox */}
        <Card className="border-2 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="agreedToTerms"
                checked={data.agreedToTerms || false}
                onCheckedChange={(checked) => updateData({ agreedToTerms: checked })}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="agreedToTerms" className="text-sm font-medium text-gray-700 cursor-pointer">
                  By checking this box, I confirm that:
                </Label>
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  <li>• I agree to comply with the platform's <strong>Terms of Service, Privacy Policy, and Community Guidelines</strong> at all times</li>
                  <li>• I understand that my organization will be verified before I can post opportunities</li>
                  <li>• I will provide accurate and truthful information about my organization and opportunities</li>
                  <li>• I understand that violations of these terms may result in account suspension or termination</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Status */}
      {isComplete && (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
              <span className="text-sm font-medium">Terms and conditions accepted</span>
            </div>
      )}
    </div>
  )
}
