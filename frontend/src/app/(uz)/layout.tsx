import SiteShell from "@/components/SiteShell";
import { siteMetadata, siteViewport } from "@/lib/meta";
import "../globals.css";

export const metadata = siteMetadata("uz");
export const viewport = siteViewport;

export default function UzLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell lang="uz">{children}</SiteShell>;
}
