'use client';

import { useState, FormEvent, useRef } from 'react';
import { Save, Loader2, Upload, X, Camera } from 'lucide-react';
import { uploadProfilePicture } from '@/lib/api';

interface ProfileEditorProps {
  initialData: {
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    qrCodeEnabled: boolean;
  };
  userData?: {
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    emailVerified?: boolean;
  };
  token: string;
  onSave: (data: {
    phoneNumber?: string;
    bio?: string;
    avatarUrl?: string;
    qrCodeEnabled?: boolean;
  }) => Promise<void>;
}

export function ProfileEditor({ initialData, userData, token, onSave }: ProfileEditorProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialData.phoneNumber || '');
  const [bio, setBio] = useState(initialData.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl || '');
  const [qrCodeEnabled, setQrCodeEnabled] = useState(initialData.qrCodeEnabled);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(initialData.avatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setUploading(true);
    setMessage(null);
    try {
      const uploadedUrl = await uploadProfilePicture(token, file);
      setAvatarUrl(uploadedUrl);
      setPreview(uploadedUrl);
      setMessage({ type: 'success', text: 'Profile picture uploaded successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to upload image' });
      setPreview(initialData.avatarUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setAvatarUrl('');
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await onSave({
        phoneNumber: phoneNumber.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        qrCodeEnabled,
      });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 space-y-6">
      <h2 className="text-xl font-bold">Edit QR Profile</h2>

      {/* User Information (Read-only) */}
      {userData && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-2 border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-3">Account Information</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="text-foreground font-medium">{userData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground font-medium">{userData.email}</span>
            </div>
            {userData.emailVerified !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email Status:</span>
                <span className={userData.emailVerified ? 'text-green-600' : 'text-yellow-600'}>
                  {userData.emailVerified ? 'Verified' : 'Not verified'}
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            To change your name or email, please update your account settings in the main app.
          </p>
        </div>
      )}

      {/* Phone Number */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium mb-2">
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+1234567890"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium mb-2">
          Bio <span className="text-muted-foreground">(max 500 characters)</span>
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Tell people about yourself..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">{bio.length}/500</p>
      </div>

      {/* Profile Picture Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Profile Picture
        </label>
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {preview ? (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Profile preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="avatar-upload"
                disabled={uploading}
              />
              <label
                htmlFor="avatar-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-medium cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-all duration-300 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>{preview ? 'Change Picture' : 'Upload Picture'}</span>
                  </>
                )}
              </label>
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG, or WebP. Max 5MB. Square images work best.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Enabled */}
      <div className="flex items-center gap-3">
        <input
          id="enabled"
          type="checkbox"
          checked={qrCodeEnabled}
          onChange={(e) => setQrCodeEnabled(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <label htmlFor="enabled" className="text-sm font-medium">
          Enable QR Code Profile
        </label>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full font-semibold shadow-lg hover:from-orange-600 hover:to-orange-700 hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {saving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            <span>Save Changes</span>
          </>
        )}
      </button>
    </form>
  );
}

