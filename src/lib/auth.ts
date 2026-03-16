import { supabase } from "./supabase";

const TOKEN_KEY = "momentum_auth_token";
const USERNAME_KEY = "momentum_username";

export interface AppUser {
  id: string;
  username: string;
}

/**
 * Ensures the user exists in localStorage and Supabase.
 * Uses a dummy token generated on first use.
 */
export async function signIn(username: string): Promise<AppUser | null> {
  // Generate a dummy token if we don't have one
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }

  localStorage.setItem(USERNAME_KEY, username);

  // Check if user exists by username (might fail if RLS blocks read before insert, but we enabled wide open)
  const { data: existingUser, error: findError } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (existingUser) {
    if (existingUser.token !== token) {
      await supabase.from("users").update({ token }).eq("id", existingUser.id);
    }
    return existingUser as AppUser;
  } else {
    // If we're here, user doesn't exist or RLS blocked reading them.
    // Try to insert
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([{ username, token }])
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("Error creating user:", JSON.stringify(insertError, null, 2));

      // If it's a unique constraint violation, try fetching one more time
      if (insertError.code === '23505') {
        const { data: fallbackUser } = await supabase.from("users").select("*").eq("username", username).single();
        if (fallbackUser) return fallbackUser as AppUser;
      }
      return null;
    }
    return newUser as AppUser;
  }
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);

  if (!token || !username) return null;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("token", token)
    .eq("username", username)
    .single();

  return user as AppUser;
}

export function signOut() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}
