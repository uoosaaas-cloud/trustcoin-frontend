"use client";

import { useEffect } from "react";
import { ADMIN_ROUTES } from "@/lib/adminPaths";

/** Sends leftover `/admin` URLs to the live admin login. */
export function LegacyAdminRedirect() {
  useEffect(() => {
    window.location.replace(ADMIN_ROUTES.login);
  }, []);

  return null;
}
