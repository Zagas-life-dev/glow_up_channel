'use client';

import { Mail, User, Calendar, Shield, CheckCircle, XCircle } from 'lucide-react';
import { MyQRCodeData } from '@/lib/api';

interface UserInfoCardProps {
  data: MyQRCodeData;
}

export function UserInfoCard({ data }: UserInfoCardProps) {
  const { user, profile } = data;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 space-y-4">
      <h2 className="text-xl font-bold mb-4">Your Information</h2>
      
      <div className="space-y-4">
        {/* Name */}
        <div className="flex items-start gap-3">
          <div className="mt-1 p-2 bg-muted rounded-lg">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Full Name</p>
            <p className="text-foreground font-medium">
              {user.name || 'Not set'}
            </p>
            {(user.firstName || user.lastName) && (
              <p className="text-xs text-muted-foreground mt-1">
                {user.firstName && <span>First: {user.firstName}</span>}
                {user.firstName && user.lastName && ' • '}
                {user.lastName && <span>Last: {user.lastName}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="flex items-start gap-3">
          <div className="mt-1 p-2 bg-muted rounded-lg">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Email</p>
            <div className="flex items-center gap-2">
              <a
                href={`mailto:${user.email}`}
                className="text-foreground hover:text-primary transition-colors break-all"
              >
                {user.email}
              </a>
              {user.emailVerified ? (
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" title="Verified" />
              ) : (
                <XCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" title="Not verified" />
              )}
            </div>
          </div>
        </div>

        {/* Date of Birth */}
        {user.dateOfBirth && (
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-muted rounded-lg">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="text-foreground">
                {new Date(user.dateOfBirth).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Role */}
        <div className="flex items-start gap-3">
          <div className="mt-1 p-2 bg-muted rounded-lg">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Account Type</p>
            <p className="text-foreground capitalize">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Location (from profile) */}
        {(profile.country || profile.province || profile.city) && (
          <div className="flex items-start gap-3 pt-2 border-t">
            <div className="mt-1 p-2 bg-muted rounded-lg">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="text-foreground">
                {[profile.city, profile.province, profile.country].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Career Stage */}
        {profile.careerStage && (
          <div className="flex items-start gap-3 pt-2 border-t">
            <div className="mt-1 p-2 bg-muted rounded-lg">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Career Stage</p>
              <p className="text-foreground capitalize">
                {profile.careerStage.replace('-', ' ')}
              </p>
            </div>
          </div>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="flex items-start gap-3 pt-2 border-t">
            <div className="mt-1 p-2 bg-muted rounded-lg">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.slice(0, 5).map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-muted text-foreground rounded-md text-xs"
                  >
                    {skill}
                  </span>
                ))}
                {profile.skills.length > 5 && (
                  <span className="px-2 py-1 text-muted-foreground text-xs">
                    +{profile.skills.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

