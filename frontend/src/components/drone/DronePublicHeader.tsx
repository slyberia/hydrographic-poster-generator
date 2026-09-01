import Link from "next/link";
import HpsLockup from "@/components/brand/HpsLockup";
import DroneIdentity from "@/components/brand/DroneIdentity";
import WorkspaceSignOutButton from "@/components/drone/WorkspaceSignOutButton";

type DronePublicHeaderProps = {
  active: "home" | "start" | "explore" | "dashboard";
};

const PUBLIC_NAV = [
  { href: "/workspace/drone", label: "Overview", active: "home" },
  { href: "/workspace/drone/map", label: "Published map", active: "explore" },
  { href: "/workspace/drone/dashboard", label: "Pilot status", active: "dashboard" },
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
        <Link href="/workspace">Workspace</Link>
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
          href="/workspace/drone/console"
          className="drone-header-action"
          aria-label="Open the Planning Console"
          title="Authorized internal workspace"
        >
          Planning Console
        </Link>
        <WorkspaceSignOutButton />
      </nav>
    </header>
  );
}
