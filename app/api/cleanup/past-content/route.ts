import { NextResponse } from 'next/server';

/**
 * Proxies POST to the backend cleanup endpoint.
 * Triggered by the frontend (e.g. app layout) to run past-content cleanup
 * (expired events, opportunities, jobs from live + inactive collections).
 */
export async function POST() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json(
      { success: false, message: 'Backend URL not configured' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/api/cleanup/past-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 404) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Cleanup endpoint not found on the API server. The backend must mount the cleanup route on startup (see latest-glowup-channel/CLEANUP_API.md and registerCleanupOnSpinUp).',
        },
        { status: 404 }
      );
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('Cleanup past-content proxy error:', e);
    return NextResponse.json(
      { success: false, message: 'Cleanup request failed' },
      { status: 502 }
    );
  }
}
