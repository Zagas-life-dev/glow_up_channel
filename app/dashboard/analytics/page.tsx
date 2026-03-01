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
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-page/95 backdrop-blur-lg border-b border-border -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="max-w-7xl mx-auto py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </Link>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
                <p className="text-sm lg:text-base text-muted-foreground">Track your posting performance and insights</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32 h-11 rounded-xl bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-page border-border">
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl px-4 py-2">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="border border-border bg-card hover:bg-muted transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Views</p>
                  <p className="text-3xl font-bold text-foreground mb-2">{analyticsData.totalViews.toLocaleString()}</p>
                  <p className="text-sm text-emerald-400 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    +12.5% from last month
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-primary/30">
                  <Eye className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card hover:bg-muted transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Average Views per Posting</p>
                  <p className="text-3xl font-bold text-foreground mb-2">{analyticsData.averageViewsPerPosting}</p>
                  <p className="text-sm text-emerald-400 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    +5.2% from last month
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/30">
                  <BarChart3 className="h-8 w-8 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card hover:bg-muted transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Active Postings</p>
                  <p className="text-3xl font-bold text-foreground mb-2">{analyticsData.totalPostings}</p>
                  <p className="text-sm text-primary flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    All performing well
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-violet-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-violet-500/30">
                  <Target className="h-8 w-8 text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Posting Performance */}
          <Card className="border border-border bg-card hover:bg-muted transition-all duration-300 rounded-2xl overflow-hidden lg:col-span-2">
            <CardHeader className="bg-muted border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                Posting Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {postingStats.map((posting) => (
                  <div key={posting.id} className="group flex items-center justify-between p-4 bg-muted rounded-xl hover:bg-muted border border-border transition-all duration-300 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/30">
                        {posting.type === 'job' ? (
                          <Briefcase className="h-6 w-6 text-orange-400" />
                        ) : posting.type === 'event' ? (
                          <Calendar className="h-6 w-6 text-emerald-400" />
                        ) : (
                          <Target className="h-6 w-6 text-orange-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground text-sm group-hover:text-orange-400 transition-colors">{posting.title}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{posting.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">{posting.views.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Views</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border border-border bg-card hover:bg-muted transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Activity className="h-5 w-5 text-emerald-400" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {analyticsData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 group">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 group-hover:scale-150 transition-transform duration-300"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground group-hover:text-primary transition-colors">
                        <span className="font-medium">
                          {activity.count.toLocaleString()} views
                        </span> for {activity.posting}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Views by Type */}
          <Card className="border border-border bg-card hover:bg-muted transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <PieChart className="h-5 w-5 text-violet-400" />
                Views by Posting Type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20 hover:bg-primary/100/15 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Jobs</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-foreground">690</p>
                    <p className="text-xs text-muted-foreground">55.4% of total</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 hover:bg-emerald-500/15 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                      <Calendar className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Events</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-foreground">389</p>
                    <p className="text-xs text-muted-foreground">31.2% of total</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-orange-500/20 hover:bg-primary/15 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                      <Target className="h-5 w-5 text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Opportunities</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-foreground">168</p>
                    <p className="text-xs text-muted-foreground">13.4% of total</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Views Trends */}
          <Card className="border border-border bg-card hover:bg-muted transition-all duration-300 rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Views Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 border border-emerald-500/30">
                    <TrendingUp className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Growing Steadily</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your views have increased by 18% this month
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center p-2 bg-muted rounded-lg border border-border">
                      <p className="font-semibold text-foreground">Week 1</p>
                      <p className="text-muted-foreground">245</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg border border-border">
                      <p className="font-semibold text-foreground">Week 2</p>
                      <p className="text-muted-foreground">312</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg border border-border">
                      <p className="font-semibold text-foreground">Week 3</p>
                      <p className="text-muted-foreground">389</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded-lg border border-border">
                      <p className="font-semibold text-foreground">Week 4</p>
                      <p className="text-muted-foreground">456</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-foreground px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <Link href="/dashboard/provider/posting">
              <Plus className="h-4 w-4 mr-2" />
              Post New Opportunity
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-orange-500/30 text-orange-400 hover:bg-primary/10 hover:text-orange-300 px-8 py-3 rounded-full transition-all duration-300">
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