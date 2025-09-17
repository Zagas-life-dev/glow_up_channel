"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePage } from "@/contexts/page-context"
import { 
  ArrowLeft,
  TrendingUp,
  Eye,
  Users,
  Calendar,
  Target,
  Briefcase,
  BookOpen,
  BarChart3,
  PieChart,
  Activity,
  Download,
  Filter,
  Star,
  Zap,
  Clock,
  MapPin,
  Plus
} from 'lucide-react'

export default function AnalyticsPage() {
  const { setHideNavbar, setHideFooter } = usePage()
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedPosting, setSelectedPosting] = useState('all')

  // Hide navbar when this page is active
  useEffect(() => {
    setHideNavbar(true)
    setHideFooter(true)
    return () => {
      setHideNavbar(false)
      setHideFooter(false)
    }
  }, [setHideNavbar, setHideFooter])

  // Mock analytics data
  const analyticsData = {
    totalViews: 1247,
    totalPostings: 6,
    averageViewsPerPosting: 208,
    topPerformingPosting: "Frontend Developer Position",
    recentActivity: [
      { type: 'view', posting: 'Web Development Training', count: 45, time: '2 hours ago' },
      { type: 'view', posting: 'Content Writer Needed', count: 23, time: '4 hours ago' },
      { type: 'view', posting: 'Data Science Internship', count: 23, time: '6 hours ago' },
      { type: 'view', posting: 'Marketing Workshop', count: 18, time: '1 day ago' }
    ]
  }

  const postingStats = [
    {
      id: 1,
      title: "Frontend Developer Position",
      type: "job",
      views: 456,
      status: "active"
    },
    {
      id: 2,
      title: "Web Development Training",
      type: "event",
      views: 389,
      status: "active"
    },
    {
      id: 3,
      title: "Content Writer Needed",
      type: "job",
      views: 234,
      status: "active"
    },
    {
      id: 4,
      title: "Data Science Internship",
      type: "opportunity",
      views: 198,
      status: "active"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm lg:text-base text-gray-600">Track your posting performance and insights</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 h-11 rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" className="border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Views</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.totalViews.toLocaleString()}</p>
                  <p className="text-sm text-green-600 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    +12.5% from last month
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Average Views per Posting</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.averageViewsPerPosting}</p>
                  <p className="text-sm text-green-600 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    +5.2% from last month
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Active Postings</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.totalPostings}</p>
                  <p className="text-sm text-blue-600 flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    All performing well
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Posting Performance */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden lg:col-span-2">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Posting Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {postingStats.map((posting) => (
                  <div key={posting.id} className="group flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        {posting.type === 'job' ? (
                          <Briefcase className="h-6 w-6 text-white" />
                        ) : posting.type === 'event' ? (
                          <Calendar className="h-6 w-6 text-white" />
                        ) : (
                          <Target className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm group-hover:text-orange-600 transition-colors">{posting.title}</h4>
                        <p className="text-xs text-gray-500 capitalize">{posting.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{posting.views.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Total Views</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-green-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Activity className="h-5 w-5 text-green-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {analyticsData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 group">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 group-hover:scale-150 transition-transform duration-300"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                        <span className="font-medium">
                          {activity.count.toLocaleString()} views
                        </span> for {activity.posting}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Views by Type */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b border-purple-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <PieChart className="h-5 w-5 text-purple-600" />
                Views by Posting Type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Jobs</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">690</p>
                    <p className="text-xs text-gray-500">55.4% of total</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Events</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">389</p>
                    <p className="text-xs text-gray-500">31.2% of total</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">Opportunities</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">168</p>
                    <p className="text-xs text-gray-500">13.4% of total</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Views Trends */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b border-green-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Views Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Growing Steadily</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Your views have increased by 18% this month
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                      <p className="font-semibold text-gray-900">Week 1</p>
                      <p className="text-gray-500">245</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                      <p className="font-semibold text-gray-900">Week 2</p>
                      <p className="text-gray-500">312</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                      <p className="font-semibold text-gray-900">Week 3</p>
                      <p className="text-gray-500">389</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                      <p className="font-semibold text-gray-900">Week 4</p>
                      <p className="text-gray-500">456</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <Link href="/dashboard/posting">
              <Plus className="h-4 w-4 mr-2" />
              Post New Opportunity
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50 px-8 py-3 rounded-full hover:shadow-lg transition-all duration-300">
            <Link href="/dashboard/provider/promotions">
              <Zap className="h-4 w-4 mr-2" />
              Promote Postings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
} 