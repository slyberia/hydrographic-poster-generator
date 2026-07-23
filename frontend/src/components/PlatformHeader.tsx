import Link from "next/link";

type PlatformRoute = "platform" | "poster" | "drone";

const NAV_ITEMS: Array<{ href: string; label: string; route: PlatformRoute }> = [
  { href: "/poster", label: "Posters", route: "poster" },
  { href: "/drone", label: "Drone Zoning", route: "drone" },
];

type PlatformHeaderProps = {
  current?: PlatformRoute;
};

export default function PlatformHeader({
  current = "platform",
}: PlatformHeaderProps) {
  return (
    <header className="poster-header poster-header--public">
      <div className="poster-header__inner">
        <Link className="poster-header__brand" href="/">
          Hydro Platform
        </Link>
        <nav className="poster-header__nav" aria-label="Hydro Platform">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.route}
              href={item.href}
              aria-current={current === item.route ? "page" : undefined}
              className="poster-header__link"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
