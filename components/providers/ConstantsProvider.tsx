"use client";

import { useEffect } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useConstants } from "@/lib/store";
import { constantsToMap } from "@/lib/chemistry";

export function ConstantsProvider({ children }: { children: React.ReactNode }) {
  const setConstants = useConstants((s) => s.setConstants);
  const loaded = useConstants((s) => s.loaded);

  useEffect(() => {
    if (loaded) return;
    const supabase = createBrowserSupabase();
    (async () => {
      const { data, error } = await supabase
        .from("atomic_constants")
        .select("symbol, value");
      if (error || !data) return;
      setConstants(constantsToMap(data));
    })();
  }, [loaded, setConstants]);

  return <>{children}</>;
}
