import type { Metadata } from "next";
import DroneOverview from "@/components/drone/DroneOverview";
import "@/app/executive-overview/executive-overview.css";

export const metadata: Metadata = {
  title: "Drone Zoning Decision Support",
  description:
    "A Region 4 pilot for examining drone zoning constraints, model sensitivity, and location-level guidance.",
};

export default function DroneLandingPage() {
  return <DroneOverview />;
}
