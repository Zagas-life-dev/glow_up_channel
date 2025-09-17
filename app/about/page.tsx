"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Target, 
  Users, 
  Lightbulb, 
  Heart, 
  Globe, 
  TrendingUp, 
  Award,
  Star,
  ArrowRight,
  Play,
  CheckCircle
} from 'lucide-react'

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState('mission')

  const stats = [
    { number: "10K+", label: "Youth Empowered", icon: Users },
    { number: "500+", label: "Opportunities Posted", icon: Target },
    { number: "10+", label: "Partners", icon: Globe },

  ]

  const values = [
    {
      icon: Target,
      title: "Access Over Excuses",
      description: "We break down barriers and create pathways for ambitious young people to succeed.",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: Users,
      title: "Community First",
      description: "We believe in growing together, supporting each other, and building lasting connections.",
      color: "from-orange-400 to-orange-500"
    },
    {
      icon: Award,
      title: "Excellence is Standard",
      description: "We showcase top-tier talent and maintain high standards in everything we do.",
      color: "from-orange-600 to-orange-700"
    },
    {
      icon: TrendingUp,
      title: "Action Changes Things",
      description: "We are a platform of doing, not just talking. Real results through real action.",
      color: "from-orange-500 to-orange-600"
    }
  ]

  const team = [
    {
      name: "Our Team",
      role: "Dedicated Professionals",
      image: "/images/placeholder-user.jpg",
      description: "A passionate team committed to empowering African youth through technology and innovation."
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 sm:mb-8">
              More Than a Platform.
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                A Movement.
              </span>
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-12 leading-relaxed max-w-3xl mx-auto">
              For far too long, brilliant African minds have been sidelined. Not due to a lack of talent, ambition, or drive, but because of a critical lack of <strong>access</strong>.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg rounded-full shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300">
                <Link href="/opportunities">
                  Explore Opportunities
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white px-8 py-4 text-lg rounded-full transition-all duration-300">
                <Link href="/contact">Get in Touch</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{stat.number}</div>
                  <div className="text-sm sm:text-base text-gray-600 font-medium">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Our Mission & Vision
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              We are the bridge that connects raw, vetted talent with the providers ready to help them <strong>glow up</strong>.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Mission Card */}
            <Card className="border-0 shadow-xl shadow-orange-500/10 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 group">
              <CardContent className="p-8 sm:p-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mb-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Our Mission</h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  To democratize access for African youth by providing a direct pathway to growth opportunities, practical knowledge, and a professional network, empowering them to build impactful careers and businesses.
                </p>
              </CardContent>
            </Card>

            {/* Vision Card */}
            <Card className="border-0 shadow-xl shadow-orange-500/10 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-500 group">
              <CardContent className="p-8 sm:p-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mb-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Lightbulb className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Our Vision</h3>
                <p className="text-lg text-gray-600 leading-relaxed">
                  A future where every young African has the tools and access they need to unlock their full potential and compete on the global stage, transforming the continent's economic landscape.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Our Core Values
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do and every decision we make.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group hover:-translate-y-2">
                  <CardContent className="p-6 sm:p-8 text-center">
                    <div className={`w-16 h-16 mx-auto mb-6 bg-gradient-to-br ${value.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">{value.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{value.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              How You Start Your Glow Up Journey
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're seeking opportunities or providing them, we have a place for you in our community.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* For Opportunity Seekers */}
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="h-8 w-8 text-orange-500 mr-3" />
                For Opportunity Seekers
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Are you ready to unlock your potential? Glow Up Channel is your one-stop shop.
              </p>
              <div className="space-y-4">
                {[
                  "Browse curated jobs, internships, and freelance gigs",
                  "Access affordable, practical courses and training",
                  "Stay updated on networking and life-changing events",
                  "Connect with mentors and potential employers"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full">
                  <Link href="/opportunities">Explore Opportunities</Link>
                </Button>
              </div>
            </div>

            {/* For Opportunity Providers */}
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <Target className="h-8 w-8 text-orange-500 mr-3" />
                For Opportunity Providers
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Tired of the endless search for qualified, passionate talent? We've done the vetting for you.
              </p>
              <div className="space-y-4">
                {[
                  "Connect with vetted, skilled African professionals",
                  "Post jobs, projects, and training programs",
                  "Build your brand as an empowerment leader",
                  "Reach your target audience effectively"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full">
                  <Link href="/submit">List an Opportunity</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Future?
          </h2>
          <p className="text-lg sm:text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Join thousands of African youth who are already accessing new opportunities and building the careers of their dreams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-4 text-lg rounded-full shadow-lg">
              <Link href="/signup">Get Started Today</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-orange-600 px-8 py-4 text-lg rounded-full">
              <Link href="/contact">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
} 