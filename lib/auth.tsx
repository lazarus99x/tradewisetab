"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function useUser() {
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser()
      .then(({ data, error }) => {
        if (error) {
          console.warn("Supabase auth error:", error.message);
        }
        if (data?.user) {
          setUser({
            id: data.user.id,
            fullName: data.user.user_metadata?.full_name || "User",
            firstName: data.user.user_metadata?.full_name?.split(" ")[0] || "User",
            primaryEmailAddress: {
              emailAddress: data.user.email,
            },
            imageUrl: data.user.user_metadata?.avatar_url || "",
            publicMetadata: data.user.user_metadata,
          });
        }
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to fetch user:", err);
        setIsLoaded(true);
      });
  }, []);

  return { user, isLoaded, isSignedIn: !!user };
}

export function useClerk() {
  const supabase = createClient();

  return {
    signOut: async (callback?: () => void) => {
      await supabase.auth.signOut();
      if (callback && typeof callback === "function") {
        callback();
      } else {
        window.location.href = "/";
      }
    },
    openSignIn: (options?: any) => {
      window.location.href = "/sign-in";
    },
    openSignUp: (options?: any) => {
      window.location.href = "/sign-up";
    }
  };
}
