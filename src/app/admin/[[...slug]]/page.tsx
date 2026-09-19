import { LegacyAdminRedirect } from "./LegacyAdminRedirect";

/** Pre-render legacy `/admin` paths for static export. */
export function generateStaticParams() {
  return [{ slug: [] as string[] }, { slug: ["login"] }, { slug: ["dashboard"] }];
}

/**
 * Old `/admin` bookmarks used to 404. Send them to the secret admin login.
 */
export default function LegacyAdminRedirectPage() {
  return <LegacyAdminRedirect />;
}
