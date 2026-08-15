import Image from "next/image";
import Link from "next/link";

export default function HpsLockup({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link
      className={`hps-lockup ${className}`.trim()}
      href="/"
      aria-label="HPS Geospatial home"
    >
      <Image
        src="/hps/hps-lockup-horizontal.svg"
        alt="HPS Geospatial — Spatial Systems · Decision Support"
        width={620}
        height={130}
        priority={priority}
      />
    </Link>
  );
}
