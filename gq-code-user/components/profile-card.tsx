'use client';

import Image from 'next/image';
import {
  User,
  Sparkles,
  Briefcase,
  GraduationCap,
  Globe,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Instagram,
  Github,
  Youtube,
  MessageCircle,
  Music,
  Link2,
} from 'lucide-react';
import { QRProfile, DEFAULT_QR_DISPLAY_OPTIONS } from '@/lib/api';
import { SaveContactButton } from '@/components/save-contact-button';

interface ProfileCardProps {
  profile: QRProfile;
}

const SOCIAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  instagram: Instagram,
  github: Github,
  youtube: Youtube,
  twitter: MessageCircle,
  tiktok: Music,
  pinterest: Link2,
};
const SOCIAL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  twitter: 'X',
  instagram: 'Instagram',
  github: 'GitHub',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
};

function show(opts: QRProfile['qrDisplayOptions'] | undefined, key: keyof typeof DEFAULT_QR_DISPLAY_OPTIONS): boolean {
  if (!opts || typeof opts[key] !== 'boolean') return true;
  return opts[key] === true;
}

function SocialIconButton({ platformKey, url }: { platformKey: string; url: string }) {
  const Icon = SOCIAL_ICONS[platformKey] || Link2;
  const label = SOCIAL_LABELS[platformKey] || platformKey;
  const href = url.startsWith('http') ? url : `https://${url}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center w-full aspect-square rounded-2xl profile-surface border profile-accent-icon hover:opacity-90 transition-all duration-200 shadow-sm"
      aria-label={label}
    >
      <Icon className="w-6 h-6" />
    </a>
  );
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const opts = profile.qrDisplayOptions;
  const displayName = profile.name || 'User';
  const aboutText = profile.bio || profile.headline || '';
  const showAbout = (show(opts, 'showBio') && profile.bio) || (show(opts, 'showHeadline') && profile.headline);

  const socialEntries = show(opts, 'showSocialLinks') && profile.socialLinks
    ? Object.entries(profile.socialLinks).filter(([, url]) => url)
    : [];
  const socialGrid = socialEntries.slice(0, 4);

  return (
    <article className="rounded-3xl overflow-hidden profile-card-bg border shadow-lg shadow-black/5 transition-shadow">
      {/* Hero: name + optional headline */}
      <header className="px-6 pt-8 pb-2 sm:px-8 sm:pt-10">
        {show(opts, 'showName') && (
          <h1 className="text-3xl sm:text-4xl font-bold profile-text-primary tracking-tight">
            {displayName}
          </h1>
        )}
        {show(opts, 'showHeadline') && profile.headline && !profile.bio && (
          <p className="mt-2 text-lg profile-text-muted font-medium max-w-xl">
            {profile.headline}
          </p>
        )}
      </header>

      <div className="px-6 pb-8 sm:px-8 sm:pb-10">
        {/* Profile photo – portfolio hero image */}
        {show(opts, 'showPhoto') && (
          <div className="relative w-full aspect-[4/3] max-h-[320px] rounded-2xl overflow-hidden mt-4 profile-surface border">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-20 h-20 profile-text-muted" />
              </div>
            )}
          </div>
        )}

        {/* About – dedicated section */}
        {showAbout && aboutText && (
          <section className="mt-8" aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-xs font-semibold uppercase tracking-widest profile-accent-icon mb-3">
              About
            </h2>
            <p className="text-base profile-text-muted leading-relaxed">
              {aboutText}
            </p>
          </section>
        )}

        {/* Connect – Save Contact + social grid */}
        <section className="mt-8" aria-label="Connect">
          <h2 className="text-xs font-semibold uppercase tracking-widest profile-accent-icon mb-4">
            Connect
          </h2>
          <div className={`grid gap-4 ${socialGrid.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <SaveContactButton profile={profile} variant="card" />
            {socialGrid.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {socialGrid.map(([key, url]) => (
                  <SocialIconButton key={key} platformKey={key} url={url} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Contact – email, phone, website */}
        {(show(opts, 'showEmail') && profile.email) ||
        (show(opts, 'showPhone') && profile.phoneNumber) ||
        (show(opts, 'showWebsite') && profile.website) ? (
          <section className="mt-8 pt-8 profile-border border-t">
            <h2 className="text-xs font-semibold uppercase tracking-widest profile-accent-icon mb-4">
              Contact
            </h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {show(opts, 'showEmail') && profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="flex items-center gap-2 text-sm profile-text-muted hover:profile-accent-icon transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  {profile.email}
                </a>
              )}
              {show(opts, 'showPhone') && profile.phoneNumber && (
                <a
                  href={`tel:${profile.phoneNumber}`}
                  className="flex items-center gap-2 text-sm profile-text-muted hover:profile-accent-icon transition-colors"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  {profile.phoneNumber}
                </a>
              )}
              {show(opts, 'showWebsite') && profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm profile-text-muted hover:profile-accent-icon transition-colors"
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </section>
        ) : null}

        {/* Experience – work, education, location, career */}
        {(show(opts, 'showWork') && profile.work && (profile.work.title || profile.work.company)) ||
        (show(opts, 'showEducation') && profile.education && (profile.education.school || profile.education.degree)) ||
        (show(opts, 'showLocation') && profile.location) ||
        (show(opts, 'showCareerStage') && profile.careerStage) ? (
        <section className="mt-6 pt-6 profile-border border-t">
          <h2 className="text-xs font-semibold uppercase tracking-widest profile-accent-icon mb-4">
            Experience
          </h2>
          <div className="space-y-4">
            {show(opts, 'showWork') && profile.work && (profile.work.title || profile.work.company) && (
              <div className="flex gap-4">
                <Briefcase className="w-5 h-5 profile-accent-icon shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium profile-text-primary">Work</p>
                  <p className="text-sm profile-text-muted">
                    {[profile.work.title, profile.work.company].filter(Boolean).join(' at ')}
                  </p>
                </div>
              </div>
            )}
            {show(opts, 'showEducation') && profile.education && (profile.education.school || profile.education.degree) && (
              <div className="flex gap-4">
                <GraduationCap className="w-5 h-5 profile-accent-icon shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium profile-text-primary">Education</p>
                  <p className="text-sm profile-text-muted">
                    {[profile.education.degree, profile.education.field, profile.education.school].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            )}
            {show(opts, 'showLocation') && profile.location && (
              <div className="flex gap-4">
                <MapPin className="w-5 h-5 profile-accent-icon shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium profile-text-primary">Location</p>
                  <p className="text-sm profile-text-muted">{profile.location}</p>
                </div>
              </div>
            )}
            {show(opts, 'showCareerStage') && profile.careerStage && (
              <div className="flex gap-4">
                <Sparkles className="w-5 h-5 profile-accent-icon shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium profile-text-primary">Career stage</p>
                  <p className="text-sm profile-text-muted">{profile.careerStage}</p>
                </div>
              </div>
            )}
          </div>
        </section>
        ) : null}

        {/* Skills */}
        {show(opts, 'showSkills') && profile.skills && profile.skills.length > 0 && (
          <section className="mt-6 pt-6 profile-border border-t">
            <h2 className="text-xs font-semibold uppercase tracking-widest profile-accent-icon mb-4">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="px-4 py-2 rounded-xl text-sm font-medium profile-text-muted profile-surface border"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
