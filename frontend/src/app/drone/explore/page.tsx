import type { Metadata } from "next";

import PublicExplorer from "@/components/drone/PublicExplorer";

export const metadata: Metadata = {
  title: "Public Explorer — Drone Zoning",
  description:
    "Check a location against the published Region 4 drone-zoning guidance: see its classification, the primary reasons, and plain-language guidance. Planning support, not flight authorization.",
};

export default function DroneExplorePage() {
  return <PublicExplorer />;
}
