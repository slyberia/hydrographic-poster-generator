import Link from "next/link";

type PosterRoute = "home" | "studio" | "about" | "docs";

type PosterHeaderProps = {
  current: PosterRoute;
  variant?: "public" | "workspace";
};

const NAV_ITEMS: Array<{ href: string; label: string; route: PosterRoute }> = [
  { href: "/", label: "Home", route: "home" },
  { href: "/studio", label: "Studio", route: "studio" },
  { href: "/about", label: "About", route: "about" },
  { href: "/docs", label: "Docs", route: "docs" },
];

export default function PosterHeader({
  current,
  variant = "public",
}: PosterHeaderProps) {
  return (
    <header className={`poster-header poster-header--${variant}`}>
      <div className="poster-header__inner">
        {variant === "workspace" ? (
          <h1>
            <Link className="poster-header__brand" href="/">
              Hydro Poster
            </Link>
          </h1>
        ) : (
          <Link className="poster-header__brand" href="/">
            Hydro Poster
          </Link>
        )}
        <nav className="poster-header__nav" aria-label="Hydro Poster">
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
