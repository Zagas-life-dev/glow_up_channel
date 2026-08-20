"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ADMIN_EMAIL, SUPPORT_EMAIL } from "@/lib/contact"
import { AdminShell } from "@/components/admin/admin-shell"
import { AdminSection } from "@/components/admin/ui"
import {
  RiInformationLine,
  RiArrowRightLine,
  RiSaveLine,
  RiRefreshLine,
} from "react-icons/ri"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/**
 * Platform settings.
 *
 * NOTE: there is no settings API yet — `loadSettings` and `handleSaveSettings` were stubbed
 * with TODOs, and the old page still popped a "Settings saved successfully" toast on submit.
 * The form is kept fully editable, but it now says plainly that nothing is persisted rather
 * than claiming a save that never happened.
 */
const SETTINGS_API_CONNECTED = false

interface ToggleRowProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}

function ToggleRow({ id, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
    </div>
  )
}

export default function AdminSettings() {
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const initial = {
    platformName: "UP",
    platformDescription:
      "Connecting young ambitious people to opportunities that accelerate personal and professional growth.",
    supportEmail: SUPPORT_EMAIL,
    adminEmail: ADMIN_EMAIL,
    maxFileSize: "10",
    allowedFileTypes: "jpg,jpeg,png,pdf,doc,docx",
    emailNotifications: true,
    userRegistration: true,
    contentModeration: true,
    analyticsTracking: true,
  }

  const [settings, setSettings] = useState(initial)

  const update = (field: keyof typeof initial, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  const handleReset = () => {
    setSettings(initial)
    setDirty(false)
    toast.success("Reverted to the current values")
  }

  const handleSave = async () => {
    if (!SETTINGS_API_CONNECTED) {
      toast.error("Settings cannot be saved yet — no settings API is connected.")
      return
    }

    setSaving(true)
    try {
      // await ApiClient.updateAdminSettings(settings)
      setDirty(false)
      toast.success("Settings saved")
    } catch (error: any) {
      toast.error(error?.message || "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell
      title="Settings"
      description="Platform configuration, uploads, and feature switches."
      requireSuperAdmin
      width="narrow"
    >
      {!SETTINGS_API_CONNECTED ? (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <RiInformationLine className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="min-w-0 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium">Not connected yet</p>
            <p className="mt-0.5 text-amber-700/90 dark:text-amber-300/80">
              These values are the defaults compiled into the app. There is no settings API
              behind this page, so changes here are not saved anywhere.
            </p>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
        className="space-y-6"
      >
        <AdminSection title="Platform" description="Names and addresses shown to users.">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="platformName" className="text-xs font-medium text-muted-foreground">
                  Platform name
                </Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) => update("platformName", e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supportEmail" className="text-xs font-medium text-muted-foreground">
                  Support email
                </Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => update("supportEmail", e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminEmail" className="text-xs font-medium text-muted-foreground">
                Admin email
              </Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings.adminEmail}
                onChange={(e) => update("adminEmail", e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="platformDescription" className="text-xs font-medium text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="platformDescription"
                rows={3}
                value={settings.platformDescription}
                onChange={(e) => update("platformDescription", e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Uploads" description="Limits applied to files users attach.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="maxFileSize" className="text-xs font-medium text-muted-foreground">
                Max file size (MB)
              </Label>
              <Input
                id="maxFileSize"
                type="number"
                min="1"
                value={settings.maxFileSize}
                onChange={(e) => update("maxFileSize", e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="allowedFileTypes" className="text-xs font-medium text-muted-foreground">
                Allowed file types
              </Label>
              <Input
                id="allowedFileTypes"
                value={settings.allowedFileTypes}
                onChange={(e) => update("allowedFileTypes", e.target.value)}
                placeholder="jpg,png,pdf"
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Comma-separated extensions.</p>
            </div>
          </div>
        </AdminSection>

        {/* Real switches — the old page used eye / eye-off icon buttons, which do not read as on-off. */}
        <AdminSection title="Features" description="Switches that change how the platform behaves.">
          <div className="divide-y divide-border">
            <ToggleRow
              id="emailNotifications"
              label="Email notifications"
              description="Send notification emails to users."
              checked={settings.emailNotifications}
              onChange={(v) => update("emailNotifications", v)}
            />
            <ToggleRow
              id="userRegistration"
              label="User registration"
              description="Allow new accounts to be created."
              checked={settings.userRegistration}
              onChange={(v) => update("userRegistration", v)}
            />
            <ToggleRow
              id="contentModeration"
              label="Content moderation"
              description="Route new submissions through the moderation queue."
              checked={settings.contentModeration}
              onChange={(v) => update("contentModeration", v)}
            />
            <ToggleRow
              id="analyticsTracking"
              label="Analytics tracking"
              description="Record visits and engagement for the analytics dashboard."
              checked={settings.analyticsTracking}
              onChange={(v) => update("analyticsTracking", v)}
            />
          </div>
        </AdminSection>

        <AdminSection
          title="Admin accounts"
          description="Only super admins can modify admin accounts."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/dashboard/admin/users?role=admin"
              className="group flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground">View all admins</span>
              <RiArrowRightLine className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard/admin/users/pending?role=admin"
              className="group flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="text-sm font-medium text-foreground">Pending admin requests</span>
              <RiArrowRightLine className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </AdminSection>

        {/* Save stays reachable at the bottom of a long form. */}
        <div
          className={cn(
            "sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-page/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6",
          )}
        >
          {dirty ? (
            <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>
          ) : null}
          <Button type="button" variant="outline" onClick={handleReset} className="h-10 rounded-xl">
            <RiRefreshLine className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button type="submit" disabled={saving} className="h-10 rounded-xl">
            <RiSaveLine className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </AdminShell>
  )
}
