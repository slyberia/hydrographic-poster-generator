import Link from "next/link";
import HpsLockup from "@/components/brand/HpsLockup";
import DroneIdentity from "@/components/brand/DroneIdentity";

type DronePublicHeaderProps = {
  active: "home" | "start" | "explore" | "dashboard";
};

export default function DronePublicHeader({ active }: DronePublicHeaderProps) {
  return (
    <header className="drone-public-header hps-theme hps-theme--drone">
      <div className="drone-public-identities">
        <HpsLockup className="drone-public-hps" />
        <span className="drone-public-divider" aria-hidden="true" />
        <DroneIdentity className="drone-public-brand" />
      </div>
      <nav aria-label="Drone product navigation">
        <Link href="/">Platform</Link>
        <Link href="/drone" aria-current={active === "home" ? "page" : undefined}>
          Home
        </Link>
        <Link href="/drone/start" aria-current={active === "start" ? "page" : undefined}>
          Choose a view
        </Link>
        <Link
          href="/drone/explore"
          aria-current={active === "explore" ? "page" : undefined}
        >
          Explorer
        </Link>
        <Link
          href="/drone/dashboard"
          aria-current={active === "dashboard" ? "page" : undefined}
        >
          Dashboard
        </Link>
        <Link href="/drone/console" className="drone-header-action">
          Planning Console
        </Link>
      </nav>
    </header>
  );
}
