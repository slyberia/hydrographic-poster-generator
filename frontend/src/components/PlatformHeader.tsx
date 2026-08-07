import Image from "next/image";
import Link from "next/link";

type PlatformRoute = "platform" | "poster" | "drone" | "executive" | "docs";
const NAV_ITEMS: Array<{ href: string; label: string; route: PlatformRoute }> = [
  { href: "/poster", label: "Poster Generator", route: "poster" },
  { href: "/drone", label: "Drone Zoning", route: "drone" },
  { href: "/executive-overview", label: "Executive Overview", route: "executive" },
  { href: "/docs", label: "Documentation", route: "docs" },
];
type PlatformHeaderProps = { current?: PlatformRoute };

export default function PlatformHeader({ current = "platform" }: PlatformHeaderProps) {
  return (
    <header className="hps-brandbar">
      <div className="hps-brandbar__inner">
        <Link className="hps-brandbar__lockup" href="/" aria-label="HPS Geospatial home">
          <Image src="/hps/hps-lockup-horizontal.svg" alt="HPS Geospatial" width={420} height={78} priority />
        </Link>
        <div className="hps-brandbar__product" aria-label="Drone Zoning, Region 4 pilot">
          <span className="hps-brandbar__product-mark" aria-hidden="true" />
          <span>Drone Zoning<small>Region 4 pilot</small></span>
        </div>
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
