"use client"

/**
 * Settings → Feed & stories → Stories: which category stories this user gets.
 *
 * Digest and Closing soon are always on. Every category story can be turned
 * off, including ones the algorithm added, and any can be turned on by hand.
 * Each switch saves the moment it moves; today's stories rebuild on next open.
 */

import { useEffect, useState } from "react"
import { Lock } from "lucide-react"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { fetchStorySettings, setStoryCategory, type StorySettings } from "@/lib/stories/api"
import { loadStories } from "@/lib/stories/store"
import { useStoriesKey } from "@/components/stories/stories-rail"
import { storyDisc, storyIcon } from "@/components/stories/story-look"
import { cn } from "@/lib/utils"

function Row({
  title,
  hint,
  icon,
  children,
}: {
  title: string
  hint: string | null
  icon: { kind: string; categoryId?: string | null }
  children: React.ReactNode
}) {
  const Icon = storyIcon(icon)
  return (
    <li className="flex items-center gap-3 py-3">
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", storyDisc(icon))}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </li>
  )
}

export function StorySettingsList() {
  const key = useStoriesKey()
  const [data, setData] = useState<StorySettings | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    fetchStorySettings().then((d) => (d ? setData(d) : setFailed(true)))
  }, [])

  const toggle = async (id: string, on: boolean) => {
    if (!data) return
    const before = data
    setBusy(id)
    setData({ ...data, categories: data.categories.map((c) => (c.id === id ? { ...c, on } : c)) })
    const r = await setStoryCategory(id, on)
    setBusy(null)
    if (!r?.ok) {
      setData(before)
      toast.error("Couldn't change that story. Try again.")
      return
    }
    if (key) void loadStories(key, true)
  }

  if (failed) return <p className="text-sm text-muted-foreground">Couldn&apos;t load your stories. Refresh to try again.</p>
  if (!data) {
    return (
      <div className="space-y-3" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-up-md bg-up-fill" />
        ))}
      </div>
    )
  }

  const on = data.categories.filter((c) => c.on)
  const off = data.categories.filter((c) => !c.on)

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-border">
        {data.fixed.map((f) => (
          <Row key={f.id} title={f.title} hint="Always on" icon={{ kind: f.id }}>
            <Lock className="h-4 w-4 text-muted-foreground" aria-label="Always on" />
          </Row>
        ))}
        {on.map((c) => (
          <Row key={c.id} title={c.title} hint={c.reason} icon={{ kind: "category", categoryId: c.id }}>
            <Switch checked onCheckedChange={(v) => toggle(c.id, v)} disabled={busy === c.id} aria-label={`${c.title} story`} />
          </Row>
        ))}
      </ul>
      {off.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add a story</p>
          <ul className="divide-y divide-border">
            {off.map((c) => (
              <Row
                key={c.id}
                title={c.title}
                hint={c.auto ? "You turned this off" : null}
                icon={{ kind: "category", categoryId: c.id }}
              >
                <Switch checked={false} onCheckedChange={(v) => toggle(c.id, v)} disabled={busy === c.id} aria-label={`${c.title} story`} />
              </Row>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
