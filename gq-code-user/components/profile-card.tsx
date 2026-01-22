'use client';

import Image from 'next/image';
import { Mail, Phone, User, Sparkles } from 'lucide-react';
import { QRProfile } from '@/lib/api';

interface ProfileCardProps {
  profile: QRProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const { name, firstName, lastName, email, phoneNumber, bio, avatarUrl, skills } = profile;

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
      {/* Avatar Section */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 flex flex-col items-center">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-lg">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
              <User className="w-16 h-16 text-primary/50" />
            </div>
          )}
        </div>
        <h1 className="mt-4 text-2xl font-bold text-white">{name}</h1>
        {(firstName || lastName) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {firstName && <span>{firstName}</span>}
            {firstName && lastName && ' '}
            {lastName && <span>{lastName}</span>}
          </p>
        )}
      </div>

      {/* Info Section */}
      <div className="p-6 space-y-4">
        {/* Email */}
        <div className="flex items-start gap-3">
          <div className="mt-1 p-2 bg-muted rounded-lg">
            <Mail className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Email</p>
            <a
              href={`mailto:${email}`}
              className="text-foreground hover:text-orange-600 transition-colors break-all font-medium"
            >
              {email}
            </a>
          </div>
        </div>

        {/* Phone */}
        {phoneNumber && (
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-muted rounded-lg">
              <Phone className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Phone</p>
              <a
                href={`tel:${phoneNumber}`}
                className="text-foreground hover:text-orange-600 transition-colors font-medium"
              >
                {phoneNumber}
              </a>
            </div>
          </div>
        )}

        {/* Bio */}
        {bio && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-2">About</p>
            <p className="text-foreground leading-relaxed">{bio}</p>
          </div>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-medium text-muted-foreground">Skills</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 rounded-full text-sm font-medium border border-orange-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

