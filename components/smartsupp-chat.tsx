"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SmartsuppChat() {
  const pathname = usePathname();

  useEffect(() => {
    // Skip admin pages
    if (pathname?.startsWith("/admin")) return;

    // Prevent duplicate loads
    if (document.getElementById("smartsupp-script")) return;

    const key = "a06a54bdb18c4a74e2956f9a7e4d4bbaca96c42e";

    // Initialize smartsupp
    (window as any)._smartsupp = (window as any)._smartsupp || {};
    (window as any)._smartsupp.key = key;

    // Load the script
    const script = document.createElement("script");
    script.id = "smartsupp-script";
    script.type = "text/javascript";
    script.charset = "utf-8";
    script.async = true;
    script.src = "https://www.smartsuppchat.com/loader.js?";
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      const existing = document.getElementById("smartsupp-script");
      if (existing) existing.remove();
    };
  }, [pathname]);

  return null;
}
