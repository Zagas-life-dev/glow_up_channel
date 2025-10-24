import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, agree } = await req.json();

  try {
    // Forward to backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/newsletter/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        agree
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Failed to subscribe" }, { status: response.status });
    }

    return NextResponse.json({ message: data.message || "Subscribed" }, { status: 200 });
  } catch (error) {
    console.error('Newsletter signup error:', error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}