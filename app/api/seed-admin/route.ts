import { NextResponse } from "next/server"
import { seedAdminUser } from "@/lib/seed-admin"

export async function GET() {
  try {
    await seedAdminUser()
    return NextResponse.json({ success: true, message: "Admin user seeded successfully" })
  } catch (error) {
    console.error("Error seeding admin user:", error)
    return NextResponse.json({ success: false, message: "Failed to seed admin user" }, { status: 500 })
  }
}
