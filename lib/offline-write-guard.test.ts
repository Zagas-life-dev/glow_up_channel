/**
 * Offline is read-only, and this pins the enforcement.
 *
 * The UI hides write controls when the connection drops, but that only covers
 * the surfaces someone remembered to gate. The guard in the API client is what
 * covers the rest — nothing is queued for replay, so a write with no connection
 * can only fail, and it should fail with a sentence rather than "Failed to
 * fetch" from inside a form handler.
 *
 * Reads are asserted to still go through, because the service worker answering
 * them from cache is the whole point of the offline mode.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import ApiClient from '@/lib/api-client'

/** jsdom reports navigator.onLine as true and has no way to set it. */
function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    value,
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  setOnline(true)
  vi.restoreAllMocks()
})

describe('write guard while offline', () => {
  it('refuses a JSON write and says why', async () => {
    setOnline(false)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await expect(
      ApiClient.makeAuthenticatedRequest('http://backend.test/api/anything', { method: 'POST' })
    ).rejects.toThrow(ApiClient.OFFLINE_WRITE_MESSAGE)

    // The point is that it never reaches the network, not merely that it fails.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses multipart uploads, which bypass the JSON request path', async () => {
    setOnline(false)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    await expect(
      ApiClient.makeAuthenticatedFormRequest(
        'http://backend.test/api/anything',
        'POST',
        new FormData()
      )
    ).rejects.toThrow(ApiClient.OFFLINE_WRITE_MESSAGE)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses sign-in rather than letting it fail as a network error', async () => {
    setOnline(false)
    await expect(ApiClient.login('a@b.test', 'pw')).rejects.toThrow(
      ApiClient.OFFLINE_WRITE_MESSAGE
    )
  })

  it.each(['PUT', 'PATCH', 'DELETE'] as const)('refuses %s', async (method) => {
    setOnline(false)
    await expect(
      ApiClient.makeAuthenticatedRequest('http://backend.test/api/anything', { method })
    ).rejects.toThrow(ApiClient.OFFLINE_WRITE_MESSAGE)
  })

  it('still allows reads, which the service worker answers from cache', async () => {
    setOnline(false)
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))

    await expect(
      ApiClient.makeAuthenticatedRequest('http://backend.test/api/opportunities')
    ).resolves.toBeInstanceOf(Response)
    expect(fetchSpy).toHaveBeenCalledOnce()
  })
})

describe('write guard while online', () => {
  it('does not interfere with writes', async () => {
    setOnline(true)
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))

    await expect(
      ApiClient.makeAuthenticatedRequest('http://backend.test/api/anything', { method: 'POST' })
    ).resolves.toBeInstanceOf(Response)
    expect(fetchSpy).toHaveBeenCalledOnce()
  })
})
