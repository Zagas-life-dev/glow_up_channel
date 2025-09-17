import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, agree } = await req.json();

  // Check if email already exists
  const { data: existing, error: selectError } = await supabase
    .from("newsletter_signups")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  if (existing) {
    // Email already present, just return success
    return NextResponse.json({ message: "Already subscribed" }, { status: 200 });
  }

  // Insert new signup
  const { error: insertError } = await supabase
    .from("newsletter_signups")
    .insert([
      {
        first_name: firstName,
        last_name: lastName,
        email,
        agreed: agree,
      },
    ]);

  if (insertError) {
    // If error is unique violation (duplicate email), treat as already subscribed
    if (
      insertError.code === "23505" ||
      (insertError.message && insertError.message.toLowerCase().includes("duplicate"))
    ) {
      return NextResponse.json({ message: "Already subscribed" }, { status: 200 });
    }
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }

  return NextResponse.json({ message: "Subscribed" }, { status: 200 });
}