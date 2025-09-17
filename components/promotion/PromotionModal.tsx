"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Star, TrendingUp, Users, Calendar, DollarSign, Zap, Crown, Target, Settings, CheckCircle, Clock, Eye, BarChart3, BookOpen, Plane, Briefcase } from "lucide-react"
import { toast } from "sonner"

interface PromotionModalProps {
  isOpen: boolean
  onClose: () => void
  onPromote?: (contentId: string, packageData: any) => void
  contentId?: string
}

const packages = {
  spotlight: {
    id: 'spotlight',
    name: 'Spotlight Package',
    description: 'Ideal for quick promotions or testing the platform.',
    price: 9990,
    duration: 7,
    customDuration: {
      enabled: true,
      pricePerDay: 1499,
      minDays: 3,
      maxDays: 30
    },
    features: [
      'Listing Boost: Priority placement in category & search results (Top 10)',
      'Visual Enhancement: Highlighted listing with a bold border',
      'Performance Tracking: Basic performance analytics (views, clicks)',
      'Custom Duration: Need a shorter test run? Contact us for custom durations starting at ₦1,499/day (Minimum 3-day booking)'
    ],
    isHero: false,
    isFeatured: false,
    priority: 1,
    color: 'from-blue-500 to-blue-600',
    icon: Target
  },
  feature: {
    id: 'feature',
    name: 'Feature Package',
    description: 'Our most popular package for sustained growth and visibility.',
    price: 24990,
    duration: 14,
    features: [
      'Everything in Spotlight PLUS:',
      'Prime Real Estate: Featured in a dedicated section on the homepage (7-day rotation)',
      'Extended Reach: Inclusion in our weekly newsletter to 6,000+ subscribers',
      'Social Proof: Featured in our weekly Social Media Roundup on Instagram, Twitter & TikTok',
      'Advanced Insights: Advanced analytics (engagement rate, applicant demographics)'
    ],
    isHero: false,
    isFeatured: true,
    priority: 2,
    color: 'from-green-500 to-green-600',
    icon: Star
  },
  launch: {
    id: 'launch',
    name: 'Launch Package',
    description: 'Maximum impact for major launches, brand building, and top-tier recruitment.',
    price: 99990,
    duration: 14,
    features: [
      'Everything in Feature PLUS:',
      'Hero Status: Exclusive top banner placement on the homepage (7-day rotation)',
      'Dedicated Promotion: A dedicated post on our Instagram, Twitter & TikTok',
      'Deep Dive: A dedicated highlight in our weekly newsletter to 6000+ subscribers',
      'Community Access: Promotion to our engaged WhatsApp community of 5,000+'
    ],
    isHero: true,
    isFeatured: true,
    priority: 3,
    color: 'from-purple-500 to-purple-600',
    icon: Crown
  }
}

export default function PromotionModal({ isOpen, onClose, onPromote, contentId }: PromotionModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [customDuration, setCustomDuration] = useState<number>(7)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCustomDuration, setShowCustomDuration] = useState(false)

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackage(packageId)
    if (packageId === 'spotlight') {
      setShowCustomDuration(true)
    } else {
      setShowCustomDuration(false)
    }
  }

  const calculateCustomPrice = (pkg: any, days: number) => {
    if (pkg.id === 'spotlight' && pkg.customDuration && days > 7) {
      return days * pkg.customDuration.pricePerDay
    }
    return pkg.price
  }

  const getDisplayPrice = (pkg: any) => {
    if (pkg.id === 'spotlight' && showCustomDuration && customDuration > 7) {
      return calculateCustomPrice(pkg, customDuration)
    }
    return pkg.price
  }

  const getDisplayDuration = (pkg: any) => {
    if (pkg.id === 'spotlight' && showCustomDuration) {
      return customDuration
    }
    return pkg.duration
  }

  const handlePromote = async () => {
    if (!selectedPackage || !onPromote || !contentId) {
      toast.error('Please select a package')
      return
    }

    // Validate custom duration for Spotlight package
    if (selectedPackage === 'spotlight' && customDuration > 7) {
      const pkg = packages.spotlight
      if (customDuration < pkg.customDuration.minDays || customDuration > pkg.customDuration.maxDays) {
        toast.error(`Custom duration must be between ${pkg.customDuration.minDays} and ${pkg.customDuration.maxDays} days`)
        return
      }
    }

    try {
      setIsSubmitting(true)
      // Pass custom duration if it's a Spotlight package and duration > 7
      const packageData = {
        packageId: selectedPackage,
        customDuration: selectedPackage === 'spotlight' && customDuration > 7 ? customDuration : undefined
      }
      await onPromote(contentId, packageData)
      toast.success('Promotion activated successfully!')
      onClose()
    } catch (error) {
      console.error('Error promoting content:', error)
      toast.error('Failed to activate promotion. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(price)
  }

  const getDayByDayFeatures = (packageType: string, duration: number) => {
    const features = []
    
    if (packageType === 'spotlight') {
      if (duration >= 1) features.push({ day: 1, feature: 'Priority placement in search results', icon: Target })
      if (duration >= 3) features.push({ day: 3, feature: 'Visual enhancement with bold border', icon: Star })
      if (duration >= 7) features.push({ day: 7, feature: 'Basic analytics tracking', icon: BarChart3 })
      if (duration >= 14) features.push({ day: 14, feature: 'Featured in category section', icon: TrendingUp })
      if (duration >= 21) features.push({ day: 21, feature: 'Advanced performance metrics', icon: Eye })
      if (duration >= 30) features.push({ day: 30, feature: 'Maximum visibility boost', icon: Zap })
    } else if (packageType === 'feature') {
      if (duration >= 1) features.push({ day: 1, feature: 'All Spotlight features activated', icon: CheckCircle })
      if (duration >= 3) features.push({ day: 3, feature: 'Homepage featured section', icon: Star })
      if (duration >= 7) features.push({ day: 7, feature: 'Newsletter inclusion', icon: BookOpen })
      if (duration >= 10) features.push({ day: 10, feature: 'Social media promotion', icon: TrendingUp })
      if (duration >= 14) features.push({ day: 14, feature: 'Advanced analytics dashboard', icon: BarChart3 })
    } else if (packageType === 'launch') {
      if (duration >= 1) features.push({ day: 1, feature: 'All Feature features activated', icon: CheckCircle })
      if (duration >= 2) features.push({ day: 2, feature: 'Hero carousel placement', icon: Crown })
      if (duration >= 5) features.push({ day: 5, feature: 'Dedicated social media posts', icon: TrendingUp })
      if (duration >= 7) features.push({ day: 7, feature: 'Newsletter deep dive', icon: BookOpen })
      if (duration >= 10) features.push({ day: 10, feature: 'WhatsApp community promotion', icon: Users })
      if (duration >= 14) features.push({ day: 14, feature: 'Maximum brand exposure', icon: Zap })
    }
    
    return features
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-2xl">
            <Zap className="h-6 w-6 text-orange-500" />
            <span>Promote Your Content</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Package Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Promotion Package</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.values(packages).map((pkg) => {
                const Icon = pkg.icon
                const isSelected = selectedPackage === pkg.id
                const displayPrice = getDisplayPrice(pkg)
                const displayDuration = getDisplayDuration(pkg)
                
                return (
                  <Card 
                    key={pkg.id} 
                    className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer ${
                      pkg.id === 'feature' ? 'ring-2 ring-green-500' : ''
                    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => handleSelectPackage(pkg.id)}
                  >
                    {pkg.id === 'feature' && (
                      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white text-center py-2 text-sm font-medium">
                        <Star className="h-4 w-4 inline mr-2" />
                        Most Popular
                      </div>
                    )}
                    <CardHeader className="text-center p-6">
                      <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${pkg.color} flex items-center justify-center mb-4`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-xl text-gray-900 mb-2">{pkg.name}</CardTitle>
                      <div className="text-3xl font-bold text-gray-900 mb-1">
                        {formatPrice(displayPrice)}
                        <span className="text-sm font-normal text-gray-500">/{displayDuration} days</span>
                      </div>
                      <p className="text-sm text-gray-600">{pkg.description}</p>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                      <ul className="space-y-3 mb-6">
                        {pkg.features.map((feature, index) => (
                          <li key={index} className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        onClick={() => handleSelectPackage(pkg.id)}
                        className={`w-full bg-gradient-to-r ${pkg.color} hover:from-${pkg.color.split('-')[1]}-600 hover:to-${pkg.color.split('-')[1]}-700 text-white rounded-xl py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                          isSelected ? 'ring-2 ring-white' : ''
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          'Select Package'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Custom Duration for Spotlight Package */}
          {selectedPackage === 'spotlight' && showCustomDuration && (
            <Card className="border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-200">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Settings className="h-5 w-5 text-blue-600" />
                  Custom Duration Options
                </CardTitle>
                <p className="text-sm text-gray-600">Customize your promotion duration for better value</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Promotion Duration (days)</label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="number"
                          min={packages.spotlight.customDuration.minDays}
                          max={packages.spotlight.customDuration.maxDays}
                          value={customDuration}
                          onChange={(e) => setCustomDuration(parseInt(e.target.value) || 7)}
                          className="h-11 w-24 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 px-3"
                        />
                        <span className="text-sm text-gray-600">days</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Choose from {packages.spotlight.customDuration.minDays} to {packages.spotlight.customDuration.maxDays} days
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Day-by-Day Features</label>
                      <div className="space-y-2">
                        {getDayByDayFeatures('spotlight', customDuration).map((item, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                              {item.day}
                            </div>
                            <item.icon className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-gray-700">{item.feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-2xl border border-blue-200">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {formatPrice(calculateCustomPrice(packages.spotlight, customDuration))}
                      </div>
                      <div className="text-sm text-gray-600 mb-4">
                        for {customDuration} day{customDuration !== 1 ? 's' : ''}
                      </div>
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        {formatPrice(calculateCustomPrice(packages.spotlight, customDuration) / customDuration)}/day
                      </div>
                      <p className="text-xs text-gray-500">
                        {customDuration >= 21 ? 'Best value for long-term promotions' : 
                         customDuration >= 14 ? 'Good value for medium-term promotions' : 
                         'Standard pricing for short-term promotions'}
                      </p>
                    </div>

                    {customDuration > 7 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800 font-medium">
                            Save {formatPrice(packages.spotlight.price - calculateCustomPrice(packages.spotlight, customDuration))} 
                            with custom duration!
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Day-by-Day Promotion Plan */}
          {selectedPackage && (
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-purple-200">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Your Promotion Timeline
                </CardTitle>
                <p className="text-sm text-gray-600">See what happens each day of your promotion</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {getDayByDayFeatures(selectedPackage, getDisplayDuration(packages[selectedPackage as keyof typeof packages])).map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-lg">
                        {item.day}
                      </div>
                      <div className="flex items-center space-x-3 flex-1">
                        <item.icon className="h-5 w-5 text-purple-600" />
                        <span className="text-gray-900 font-medium">{item.feature}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Day {item.day}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Promotion Benefits */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-b border-orange-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Crown className="h-5 w-5 text-orange-600" />
                Why Promote Your Content?
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Increased Visibility</h4>
                  <p className="text-sm text-gray-600">Get up to 5x more views on your content</p>
                </div>
                
                <div className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2 group-hover:text-green-600 transition-colors">Better Engagement</h4>
                  <p className="text-sm text-gray-600">Attract higher quality interactions</p>
                </div>
                
                <div className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">Faster Results</h4>
                  <p className="text-sm text-gray-600">Achieve your goals quicker with promoted content</p>
                </div>
                
                <div className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">Targeted Reach</h4>
                  <p className="text-sm text-gray-600">Reach your ideal audience more effectively</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button variant="outline" onClick={onClose} className="px-8 py-3 rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handlePromote}
              disabled={isSubmitting || !selectedPackage}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Activate Promotion
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}