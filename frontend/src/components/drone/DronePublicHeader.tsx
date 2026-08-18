import Link from "next/link";
import HpsLockup from "@/components/brand/HpsLockup";
import DroneIdentity from "@/components/brand/DroneIdentity";

type DronePublicHeaderProps = {
  active: "home" | "start" | "explore" | "dashboard";
};

const PUBLIC_NAV = [
  { href: "/drone", label: "Overview", active: "home" },
  { href: "/drone/explore", label: "Public map", active: "explore" },
  { href: "/drone/dashboard", label: "Pilot status", active: "dashboard" },
] as const;

export default function DronePublicHeader({ active }: DronePublicHeaderProps) {
  return (
    <header className="drone-public-header hps-theme hps-theme--drone">
      <div className="drone-public-identities">
        <HpsLockup className="drone-public-hps" priority />
        <span className="drone-public-divider" aria-hidden="true" />
        <DroneIdentity className="drone-public-brand" />
      </div>
      <nav aria-label="Drone product navigation">
        <Link href="/">Platform</Link>
        {PUBLIC_NAV.map((item) => (
          <Link
            href={item.href}
            aria-current={active === item.active ? "page" : undefined}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/drone/console"
          className="drone-header-action"
          aria-label="Open the internal Planning Console"
          title="Authorized internal workspace"
        >
          Planning Console
        </Link>
      </nav>
    </header>
  );
}
