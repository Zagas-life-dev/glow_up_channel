'use client';

import React from 'react';
import PromotionDisplay from '@/app/components/PromotionDisplay';

export default function PromotionsDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Promotion Display Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            This page demonstrates the different promotion display types based on package levels:
            Spotlight (search enhancement), Feature (featured section), and Launch (hero banner).
          </p>
        </div>

        <div className="space-y-16">
          {/* Hero Section - Launch Packages */}
          <section className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Hero Banner</h2>
              <p className="text-purple-100 text-lg">
                Launch packages get exclusive top banner placement on the homepage
              </p>
            </div>
            <PromotionDisplay type="hero" limit={3} />
          </section>

          {/* Featured Section - Feature & Launch Packages */}
          <section className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Section</h2>
              <p className="text-gray-600 text-lg">
                Feature and Launch packages appear in the featured section
              </p>
            </div>
            <PromotionDisplay type="featured" limit={6} />
          </section>

          {/* Spotlight Enhanced Section - Spotlight Packages */}
          <section className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Search Results (Spotlight Enhanced)</h2>
              <p className="text-gray-600 text-lg">
                Spotlight packages get visual enhancements in search results with highlighted borders
              </p>
            </div>
            <PromotionDisplay type="spotlight" limit={9} />
          </section>

          {/* Package Comparison */}
          <section className="bg-gray-100 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Package Comparison</h2>
              <p className="text-gray-600 text-lg">
                Understanding the different promotion package levels
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Spotlight Package</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Priority placement in search results</li>
                  <li>• Visual enhancement with bold border</li>
                  <li>• Basic performance analytics</li>
                  <li>• <strong>NOT shown in featured or hero sections</strong></li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Feature Package</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Everything in Spotlight package</li>
                  <li>• Featured section placement</li>
                  <li>• Enhanced visibility</li>
                  <li>• <strong>Shown in featured section</strong></li>
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">👑</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Launch Package</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Everything in Feature package</li>
                  <li>• Hero banner placement</li>
                  <li>• Exclusive top banner on homepage</li>
                  <li>• <strong>Shown in both featured and hero sections</strong></li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

