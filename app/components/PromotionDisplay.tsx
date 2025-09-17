'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Crown, Zap, Eye, Calendar, MapPin, DollarSign } from 'lucide-react';

interface Promotion {
  _id: string;
  contentId: string;
  contentType: string;
  packageType: string;
  packageName: string;
  investment: number;
  duration: number;
  features: string[];
  priority: number;
  boostMultiplier: number;
  startDate: string;
  endDate: string;
  visualEnhancement?: {
    highlighted: boolean;
    borderStyle: string;
    priority: number;
  };
  content: {
    _id: string;
    title: string;
    description: string;
    image?: string;
    category: string;
    type: string;
    provider: string;
    location: {
      country?: string;
      province?: string;
      city?: string;
      isRemote?: boolean;
    };
    financial: {
      isPaid: boolean;
      amount?: number;
      currency: string;
    };
    dates: {
      applicationDeadline?: string;
      startDate?: string;
      endDate?: string;
    };
    tags: string[];
    metrics: {
      viewCount: number;
      saveCount: number;
      likeCount: number;
    };
  };
  provider: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PromotionDisplayProps {
  type: 'featured' | 'hero' | 'spotlight';
  limit?: number;
  contentType?: string;
}

export default function PromotionDisplay({ type, limit = 10, contentType = 'all' }: PromotionDisplayProps) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPromotions();
  }, [type, limit, contentType]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint = '';
      switch (type) {
        case 'featured':
          endpoint = `/api/promotions/featured?limit=${limit}&contentType=${contentType}`;
          break;
        case 'hero':
          endpoint = `/api/promotions/hero?limit=${limit}`;
          break;
        case 'spotlight':
          endpoint = `/api/promotions/spotlight-enhanced?limit=${limit}&contentType=${contentType}`;
          break;
      }

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        setPromotions(data.data.promotions);
      } else {
        setError(data.message || 'Failed to fetch promotions');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPackageIcon = (packageType: string) => {
    switch (packageType) {
      case 'spotlight':
        return <Zap className="h-4 w-4" />;
      case 'feature':
        return <Star className="h-4 w-4" />;
      case 'launch':
        return <Crown className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getPackageColor = (packageType: string) => {
    switch (packageType) {
      case 'spotlight':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'feature':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'launch':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-600">
        <p>Error: {error}</p>
        <Button onClick={fetchPromotions} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (promotions.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>No {type} promotions available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {type === 'hero' && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Opportunities</h2>
          <p className="text-gray-600">Exclusive top banner placements</p>
        </div>
      )}
      
      {type === 'featured' && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Featured Content</h2>
          <p className="text-gray-600">Promoted opportunities and events</p>
        </div>
      )}

      <div className={`grid gap-4 ${type === 'hero' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {promotions.map((promotion) => (
          <Card 
            key={promotion._id} 
            className={`relative transition-all duration-200 hover:shadow-lg ${
              promotion.visualEnhancement?.highlighted 
                ? 'border-2 border-orange-400 shadow-md' 
                : 'border border-gray-200'
            }`}
          >
            {promotion.visualEnhancement?.highlighted && (
              <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                SPOTLIGHT
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge className={`${getPackageColor(promotion.packageType)} flex items-center gap-1`}>
                  {getPackageIcon(promotion.packageType)}
                  {promotion.packageName}
                </Badge>
                <div className="text-sm text-gray-500">
                  {promotion.duration} days
                </div>
              </div>
              
              <CardTitle className="text-lg line-clamp-2">
                {promotion.content.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 line-clamp-3">
                {promotion.content.description}
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {promotion.content.location.isRemote 
                      ? 'Remote' 
                      : `${promotion.content.location.city || 'Location'}`
                    }
                  </span>
                </div>
                
                {promotion.content.financial.isPaid && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      {promotion.content.financial.amount 
                        ? formatCurrency(promotion.content.financial.amount, promotion.content.financial.currency)
                        : 'Paid'
                      }
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {promotion.content.dates.applicationDeadline 
                      ? `Deadline: ${formatDate(promotion.content.dates.applicationDeadline)}`
                      : 'Ongoing'
                    }
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {promotion.content.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {promotion.content.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{promotion.content.tags.length - 3} more
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm text-gray-500">
                  by {promotion.provider.firstName} {promotion.provider.lastName}
                </div>
                <div className="text-sm font-semibold text-orange-600">
                  {formatCurrency(promotion.investment)}
                </div>
              </div>

              <Button className="w-full mt-3">
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}



