import Link from "next/link";

type DronePublicHeaderProps = {
  active: "home" | "methodology";
};

export default function DronePublicHeader({ active }: DronePublicHeaderProps) {
  return (
    <header className="drone-public-header">
      <Link href="/drone" className="drone-public-brand">
        <span aria-hidden="true" className="drone-brand-mark" />
        <span>
          Drone Zoning
          <small>Region 4 pilot</small>
        </span>
      </Link>
      <nav aria-label="Drone product navigation">
        <Link href="/">Platform</Link>
        <Link href="/drone" aria-current={active === "home" ? "page" : undefined}>
          Overview
        </Link>
        <Link
          href="/drone/methodology"
          aria-current={active === "methodology" ? "page" : undefined}
        >
          Methodology
        </Link>
        <Link href="/drone/console" className="drone-header-action">
          Planning Console
        </Link>
      </nav>
    </header>
  );
}
