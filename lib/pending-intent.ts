/**
 * What a guest was doing when we asked them to sign up, kept until they are signed in.
 *
 * Before this, every gated tap (save, add to playlist, apply) ended on a bare /signup,
 * then /verify-email, then /onboarding, then the home feed — the listing and the tap
 * were both forgotten. Now the tap writes an intent here; login, sign-up, email
 * verification and onboarding read `returnTo` to land the user back on the listing,
 * and PendingIntentRunner replays the save once they are signed in.
 *
 * localStorage, not sessionStorage: the verification email is often opened in a new
 * tab, and the intent has to survive that. It expires after a day.
 */

export type IntentAction = 'save' | 'playlist' | 'apply' | 'track'
export type IntentKind = 'job' | 'opportunity' | 'event' | 'resource'

export interface PendingIntent {
  /** Same-origin path to land on after auth, e.g. /jobs/abc?src=feed */
  returnTo?: string
  action?: IntentAction
  kind?: IntentKind
  id?: string
  /** Where the ask was shown, for sign-up attribution. */
  source?: string
  at: number
}

const KEY = 'up-pending-intent'
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const ACTIONS: IntentAction[] = ['save', 'playlist', 'apply', 'track']
const KINDS: IntentKind[] = ['job', 'opportunity', 'event', 'resource']

/** Only same-origin paths: never an absolute or protocol-relative URL (open redirect). */
export function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim()
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return undefined
  // URL parsers drop tabs and newlines, so "/<tab>/evil.com" would resolve to "//evil.com".
  if (/[\u0000-\u001f\u007f\\]/.test(v)) return undefined
  if (/^\/(login|signup|verify-email|onboarding)(\/|\?|$)/.test(v)) return undefined
  return v
}

export function readPendingIntent(now = Date.now()): PendingIntent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingIntent
    if (!parsed || typeof parsed.at !== 'number' || now - parsed.at > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function write(intent: PendingIntent | null) {
  if (typeof window === 'undefined') return
  try {
    if (intent) window.localStorage.setItem(KEY, JSON.stringify(intent))
    else window.localStorage.removeItem(KEY)
  } catch {
    // Storage blocked (private mode): the user simply lands on the default page.
  }
}

/** Record (or extend) what the guest wanted. Fields left out keep their stored value. */
export function savePendingIntent(next: Omit<PendingIntent, 'at'>): void {
  const current = readPendingIntent()
  const returnTo = safeReturnTo(next.returnTo) ?? current?.returnTo
  const action = next.action && ACTIONS.includes(next.action) ? next.action : current?.action
  const kind = next.kind && KINDS.includes(next.kind) ? next.kind : current?.kind
  write({ returnTo, action, kind, id: next.id ?? current?.id, source: next.source ?? current?.source, at: Date.now() })
}

/** Parse `intent=save:job:<id>` from a query string value. */
export function parseIntentParam(value: string | null | undefined): Pick<PendingIntent, 'action' | 'kind' | 'id'> {
  if (!value) return {}
  const [action, kind, id] = value.split(':')
  if (!ACTIONS.includes(action as IntentAction) || !KINDS.includes(kind as IntentKind) || !id || !/^[a-f0-9]{24}$/i.test(id)) return {}
  return { action: action as IntentAction, kind: kind as IntentKind, id }
}

/** Build /signup or /login links that carry the intent through the query string too. */
export function authHref(path: '/signup' | '/login', intent?: Omit<PendingIntent, 'at'>): string {
  const params = new URLSearchParams()
  const returnTo = safeReturnTo(intent?.returnTo)
  if (returnTo) params.set('callbackUrl', returnTo)
  if (intent?.action && intent.kind && intent.id) params.set('intent', `${intent.action}:${intent.kind}:${intent.id}`)
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

/** Store whatever ?callbackUrl= and ?intent= an auth page was opened with. */
export function captureIntentFromSearch(search: string): void {
  const params = new URLSearchParams(search)
  const returnTo = safeReturnTo(params.get('callbackUrl'))
  const parsed = parseIntentParam(params.get('intent'))
  if (!returnTo && !parsed.action) return
  savePendingIntent({ returnTo, ...parsed })
}

/** Where to go once auth is done: the remembered page, else `fallback`. Clears returnTo. */
export function takeReturnTo(fallback: string): string {
  const intent = readPendingIntent()
  if (!intent?.returnTo) return fallback
  write({ ...intent, returnTo: undefined })
  return intent.returnTo
}

/** Hand the pending action to the runner exactly once. */
export function takePendingAction(): PendingIntent | null {
  const intent = readPendingIntent()
  if (!intent?.action || !intent.kind || !intent.id) return null
  write(intent.returnTo ? { ...intent, action: undefined, kind: undefined, id: undefined } : null)
  return intent
}

export function clearPendingIntent(): void {
  write(null)
}
