export default function NumberBadge({ children }: { children: string }) {
  return <span className="hps-number-badge" aria-hidden="true">{children}</span>;
}
