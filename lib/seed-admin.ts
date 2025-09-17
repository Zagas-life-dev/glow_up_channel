import { createServerSupabaseClient } from "./supabase"

export async function seedAdminUser() {
  const supabase = createServerSupabaseClient()

  // Check if admin user exists in auth
  const { data: existingUser } = await supabase.auth.admin.getUserByEmail("glowup@glowupchannel.com")

  if (!existingUser?.user) {
    // Create the admin user in auth
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: "glowup@glowupchannel.com",
      password: "ADglow/min2025_@glowUP",
      email_confirm: true,
    })

    if (createError) {
      console.error("Error creating admin user:", createError)
      return
    }

    // Add user to admin_users table
    if (newUser?.user) {
      const { error: insertError } = await supabase.from("admin_users").insert({
        id: newUser.user.id,
        email: "glowup@glowupchannel.com",
        full_name: "Glow Up Admin",
      })

      if (insertError) {
        console.error("Error adding user to admin_users table:", insertError)
      }
    }
  } else {
    // Check if user exists in admin_users table
    const { data: adminUser } = await supabase.from("admin_users").select().eq("id", existingUser.user.id).single()

    if (!adminUser) {
      // Add to admin_users table
      const { error: insertError } = await supabase.from("admin_users").insert({
        id: existingUser.user.id,
        email: "glowup@glowupchannel.com",
        full_name: "Glow Up Admin",
      })

      if (insertError) {
        console.error("Error adding user to admin_users table:", insertError)
      }
    }
  }
}
