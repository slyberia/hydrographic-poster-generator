import Link from "next/link";

export function DroneMark({ className = "" }: { className?: string }) {
  return <span className={`hps-product-mark ${className}`.trim()} aria-hidden="true" />;
}

export default function DroneIdentity({ className = "" }: { className?: string }) {
  return (
    <Link className={`hps-product-identity ${className}`.trim()} href="/workspace/drone">
      <DroneMark />
      <span>
        Drone Zoning
        <small>Region 4 pilot</small>
      </span>
    </Link>
  );
}
