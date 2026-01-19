'use client';

import { useEffect, useState } from 'react';
import { QRCodeDisplay } from '@/components/qr-code-display';
import { ProfileEditor } from '@/components/profile-editor';
import { UserInfoCard } from '@/components/user-info-card';
import { getMyQRCode, updateQRProfile, MyQRCodeData } from '@/lib/api';
import { Loader2, AlertCircle, Lock } from 'lucide-react';

// Get auth token from URL parameter or localStorage
const getAuthToken = () => {
  if (typeof window === 'undefined') return '';
  
  // First, check URL parameters (passed from main app)
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  
  if (tokenFromUrl) {
    // Store in localStorage for future use
    localStorage.setItem('accessToken', tokenFromUrl);
    return tokenFromUrl;
  }
  
  // Fallback to localStorage (check both 'accessToken' and 'authToken')
  return localStorage.getItem('accessToken') || localStorage.getItem('authToken') || '';
};

export default function DashboardPage() {
  const [data, setData] = useState<MyQRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const authToken = getAuthToken();
    setToken(authToken);
    
    if (!authToken) {
      setError('Please log in to view your QR code. If you came from the main app, make sure you are signed in.');
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const qrData = await getMyQRCode(authToken);
        setData(qrData);
      } catch (err: any) {
        setError(err.message || 'Failed to load QR code');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSave = async (updates: {
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    qrCodeEnabled?: boolean;
  }) => {
    if (!token) throw new Error('Not authenticated');
    
    await updateQRProfile(token, updates);
    
    // Refresh data
    const updatedData = await getMyQRCode(token);
    setData(updatedData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your QR code...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Failed to load data'}</p>
          {!token && (
            <p className="text-sm text-gray-500">
              Please log in to access your QR code dashboard.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!data.profile.qrCodeEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">QR Code Disabled</h1>
          <p className="text-gray-600 mb-4">
            Your QR code profile is currently disabled. Enable it in the settings below to share your profile.
          </p>
          <ProfileEditor
            initialData={data.profile}
            userData={data.user}
            token={token}
            onSave={handleSave}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your QR Code</h1>
          <p className="text-gray-600">
            Share this QR code so others can view and save your contact information
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* QR Code Display */}
          <div className="lg:col-span-1">
            <QRCodeDisplay qrCodeUrl={data.qrCodeUrl} userId={data.userId} />
          </div>

          {/* User Info and Profile Editor */}
          <div className="lg:col-span-2 space-y-6">
            <UserInfoCard data={data} />
            <ProfileEditor 
              initialData={data.profile} 
              userData={data.user}
              token={token}
              onSave={handleSave} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

