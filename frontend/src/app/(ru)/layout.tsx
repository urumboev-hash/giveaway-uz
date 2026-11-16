import SiteShell from "@/components/SiteShell";
import { siteMetadata, siteViewport } from "@/lib/meta";
import "../globals.css";

export const metadata = siteMetadata("ru");
export const viewport = siteViewport;

export default function RuLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell lang="ru">{children}</SiteShell>;
}
