"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {usePage} from "@/contexts/page-context"
import { Facebook, Instagram, Linkedin, Mail, Phone, MapPin, ArrowRight, Youtube, Music } from "lucide-react"

export default function Footer() {
  const [email, setEmail] = useState("")
  const { hideFooter } = usePage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Handle newsletter signup
    console.log("Newsletter signup:", email)
    setEmail("")
  }
  if (hideFooter) {
    return null
  }

  return (
    <footer className="w-full bg-gray-900 text-white">
      <div className="container px-4 sm:px-6 md:px-8 lg:px-12 py-12 sm:py-16 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12 mb-8 sm:mb-12 text-center sm:text-left">
          {/* Brand Section */}
          <div className="space-y-4 sm:space-y-6">
            <div className="mb-4 sm:mb-6 flex justify-center sm:justify-start">
              <Image
                src="/images/logo-transparent.svg"
                alt="Glow Up Channel"
                width={120}
                height={50}
                className="sm:w-32 md:w-36 lg:w-40 brightness-0 invert"
              />
            </div>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-sm mx-auto sm:mx-0">
              Connect young ambitious people to opportunities, events, and free resources that accelerate personal and professional growth.
            </p>
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider">Follow Us</h4>
              <div className="flex space-x-3 sm:space-x-4 justify-center sm:justify-start">
                <a href="https://www.facebook.com/share/1GZ3c5eh7c/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors duration-300 touch-manipulation">
                  <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a href="https://x.com/glowupchannel?s=21" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors duration-300 touch-manipulation">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a href="https://www.instagram.com/glowup.channel?igsh=MTh3OXE2dHdpdDkxOA==" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors duration-300 touch-manipulation">
                  <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a href="https://www.linkedin.com/company/glowupchannel/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors duration-300 touch-manipulation">
                  <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a href="https://whatsapp.com/channel/0029Vanm1p0InlqII9gDQl0i" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors duration-300 touch-manipulation">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </a>
                <a href="https://youtube.com/@glowup.channel25?si=Eqd6-GFuOM5womCM" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors duration-300 touch-manipulation">
                  <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
                <a href="https://www.tiktok.com/@glowup_channel?_t=ZS-8zfGxB4G9aM&_r=1" target="_blank" rel="noopener noreferrer" className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-600 transition-colors duration-300 touch-manipulation">
                  <Music className="w-4 h-4 sm:w-5 sm:h-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 sm:space-y-6">
            <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Quick Links</h4>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { name: "Opportunities", href: "/opportunities" },
                { name: "Jobs", href: "/jobs" },
                { name: "Events", href: "/events" },
                { name: "Resources", href: "/resources" },
                { name: "About Us", href: "/about" },
                { name: "Contact", href: "/contact" }
              ].map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href} 
                    className="text-sm sm:text-base text-gray-300 hover:text-orange-400 transition-colors duration-300 inline-block py-1 touch-manipulation"
                  >
                    {link.name}
                </Link>
              </li>
              ))}
            </ul>
          </div>

          {/* Submit & Admin */}
          

          {/* Contact Info */}
          <div className="space-y-4 sm:space-y-6">
            <h4 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4">Contact Info</h4>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-3 justify-center sm:justify-start">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm sm:text-base text-gray-300">info.glowupchannel@gmail.com</span>
              </div>

              <div className="flex items-start gap-3 justify-center sm:justify-start">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm sm:text-base text-gray-300 text-center sm:text-left">Nigeria</span>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="border-t border-gray-700 pt-8 sm:pt-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-white mb-2 sm:mb-3">
              Stay Updated
            </h3>
            <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 leading-relaxed">
              Get the latest opportunities, events, and resources delivered to your inbox.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-orange-500 py-2 sm:py-3 text-sm sm:text-base touch-manipulation"
                required
              />
              <Button 
                type="submit" 
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base touch-manipulation"
              >
                Subscribe
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 sm:mt-12 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
              <p>&copy; 2025 Glow Up Channel. All rights reserved.</p>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6 text-xs sm:text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-orange-400 transition-colors touch-manipulation">
                Privacy Polcy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-orange-400 transition-colors touch-manipulation">
                Terms of Service
              </Link>
              <Link href="/cookies" className="text-gray-400 hover:text-orange-400 transition-colors touch-manipulation">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
