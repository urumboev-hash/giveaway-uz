"use client";

import { useEffect } from "react";
import { trackVisit } from "@/lib/track";

export default function VisitTracker({ lang }: { lang: string }) {
  useEffect(() => {
    if (location.pathname.startsWith("/stats")) return;
    trackVisit(lang);
  }, [lang]);
  return null;
}
