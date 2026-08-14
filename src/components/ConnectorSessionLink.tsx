"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function ConnectorSessionLink() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.user));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session?.user));
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return signedIn ? (
    <div className="notice good connector-session-notice">
      <p>You are signed in to Localized.life.</p>
      <Link className="button primary compact-button" href="/account">
        Open your account
      </Link>
    </div>
  ) : null;
}
