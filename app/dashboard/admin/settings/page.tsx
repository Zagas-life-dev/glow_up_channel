"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePage } from "@/contexts/page-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Settings, 
  Shield, 
  Users, 
  Database,
  Mail,
  Bell,
  ChevronLeft,
  AlertTriangle,
  Save,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function AdminSettings() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { setHideNavbar, setHideFooter } = usePage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Settings state
  const [settings, setSettings] = useState({
    platformName: "Glow Up Channel",
    platformDescription: "Connecting young ambitious people to opportunities that accelerate personal and professional growth.",
    supportEmail: "support@glowupchannel.com",
    adminEmail: "admin@glowupchannel.com",
    maxFileSize: "10",
    allowedFileTypes: "jpg,jpeg,png,pdf,doc,docx",
    emailNotifications: true,
    userRegistration: true,
    contentModeration: true,
    analyticsTracking: true
  })

  // Hide navbar and footer when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role !== 'super_admin') {
        setError('Access denied. Super admin privileges required.')
        return
      }
      // Load settings from backend (placeholder for now)
      loadSettings()
    }
  }, [isLoading, isAuthenticated, user])

  const loadSettings = async () => {
    try {
      setLoading(true)
      // TODO: Implement API call to load settings
      // const settingsData = await ApiClient.getAdminSettings()
      // setSettings(settingsData)
    } catch (error: any) {
      console.error('Error loading settings:', error)
      setError(error.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setLoading(true)
      // TODO: Implement API call to save settings
      // await ApiClient.updateAdminSettings(settings)
      toast.success('Settings saved successfully')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <Settings className="w-8 h-8 text-orange-600 animate-pulse" />
          </div>
          <p className="text-lg text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You need super admin privileges to access this page.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/admin">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <div className="flex items-center space-x-2">
                <Settings className="h-8 w-8 text-orange-600" />
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
              </div>
              <Badge variant="destructive">Super Admin</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={loadSettings}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="space-y-8">
          {/* Platform Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-orange-600" />
                <span>Platform Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={settings.platformName}
                    onChange={(e) => handleInputChange('platformName', e.target.value)}
                    placeholder="Enter platform name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                    placeholder="support@example.com"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="platformDescription">Platform Description</Label>
                <Textarea
                  id="platformDescription"
                  value={settings.platformDescription}
                  onChange={(e) => handleInputChange('platformDescription', e.target.value)}
                  placeholder="Enter platform description"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* File Upload Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>File Upload Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    value={settings.maxFileSize}
                    onChange={(e) => handleInputChange('maxFileSize', e.target.value)}
                    placeholder="10"
                  />
                </div>
                
                <div>
                  <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
                  <Input
                    id="allowedFileTypes"
                    value={settings.allowedFileTypes}
                    onChange={(e) => handleInputChange('allowedFileTypes', e.target.value)}
                    placeholder="jpg,jpeg,png,pdf,doc,docx"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-green-600" />
                <span>Notification Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Enable email notifications for users</p>
                  </div>
                  <Button
                    type="button"
                    variant={settings.emailNotifications ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleInputChange('emailNotifications', !settings.emailNotifications)}
                  >
                    {settings.emailNotifications ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="userRegistration">User Registration</Label>
                    <p className="text-sm text-gray-500">Allow new user registrations</p>
                  </div>
                  <Button
                    type="button"
                    variant={settings.userRegistration ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleInputChange('userRegistration', !settings.userRegistration)}
                  >
                    {settings.userRegistration ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="contentModeration">Content Moderation</Label>
                    <p className="text-sm text-gray-500">Enable automatic content moderation</p>
                  </div>
                  <Button
                    type="button"
                    variant={settings.contentModeration ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleInputChange('contentModeration', !settings.contentModeration)}
                  >
                    {settings.contentModeration ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="analyticsTracking">Analytics Tracking</Label>
                    <p className="text-sm text-gray-500">Enable user behavior tracking</p>
                  </div>
                  <Button
                    type="button"
                    variant={settings.analyticsTracking ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleInputChange('analyticsTracking', !settings.analyticsTracking)}
                  >
                    {settings.analyticsTracking ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span>Admin Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Manage admin users and their permissions. Only super admins can modify admin accounts.
                </p>
                <div className="flex space-x-4">
                  <Button asChild variant="outline">
                    <Link href="/dashboard/admin/users?role=admin">
                      <Users className="h-4 w-4 mr-2" />
                      View All Admins
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/admin/users/pending?role=admin">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Pending Admin Requests
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={loadSettings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Changes
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
