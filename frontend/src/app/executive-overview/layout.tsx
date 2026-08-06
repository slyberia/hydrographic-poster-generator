import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drone Zoning Executive Overview | HPS Geospatial",
  description: "Executive overview of the Guyana Drone Zoning decision-support platform.",
};

export default function ExecutiveOverviewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
