import { createClient } from "@/utils/supabase/server";

export async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      sessionClaims: null,
      redirectToSignIn: ({ returnBackUrl }: { returnBackUrl?: string }) => {
        // Handled by middleware mostly, but if called, just return false or a redirect url
      }
    };
  }

  return {
    userId: user.id,
    sessionClaims: {
      publicMetadata: user.user_metadata
    }
  };
}

export async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    fullName: user.user_metadata?.full_name || "User",
    firstName: user.user_metadata?.full_name?.split(" ")[0] || "User",
    primaryEmailAddress: {
      emailAddress: user.email,
    },
    imageUrl: user.user_metadata?.avatar_url || "",
    publicMetadata: user.user_metadata,
  };
}

export async function clerkClient() {
  // Mock clerkClient used for fetching users
  const supabase = await createClient();
  
  return {
    users: {
      getUser: async (userId: string) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();
          
        return {
          id: userId,
          firstName: profile?.full_name?.split(" ")[0] || "User",
          lastName: profile?.full_name?.split(" ").slice(1).join(" ") || "",
          emailAddresses: [{ emailAddress: profile?.email || "" }],
          createdAt: new Date(profile?.created_at || Date.now()).getTime(),
          publicMetadata: {
            role: profile?.role || "user",
            ...profile
          }
        };
      },
      getUserList: async () => {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
          
        return {
          data: (profiles || []).map((p: any) => ({
            id: p.user_id,
            firstName: p.full_name?.split(" ")[0] || "User",
            lastName: p.full_name?.split(" ").slice(1).join(" ") || "",
            emailAddresses: [{ emailAddress: p.email || "" }],
            createdAt: new Date(p.created_at || Date.now()).getTime(),
            publicMetadata: {
              role: p.role || "user",
              ...p
            }
          }))
        };
      }
    }
  };
}
