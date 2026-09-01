import Link from "next/link";
import HpsLockup from "@/components/brand/HpsLockup";

type PlatformRoute = "platform" | "poster" | "docs" | "workspace";
const NAV_ITEMS: Array<{ href: string; label: string; route: PlatformRoute }> = [
  { href: "/poster", label: "Poster Generator", route: "poster" },
  { href: "/documentation", label: "Documentation", route: "docs" },
];
type PlatformHeaderProps = { current?: PlatformRoute };

export default function PlatformHeader({ current = "platform" }: PlatformHeaderProps) {
  return (
    <header className="hps-brandbar hps-theme hps-theme--platform">
      <div className="hps-brandbar__inner">
        <HpsLockup className="hps-brandbar__lockup" priority />
      </div>
      <nav className="hps-portal__nav" aria-label="HPS Geospatial">
        <div className="hps-portal__nav-inner">
          {NAV_ITEMS.map((item) => (
            <Link key={item.route} href={item.href} aria-current={current === item.route ? "page" : undefined}>{item.label}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
