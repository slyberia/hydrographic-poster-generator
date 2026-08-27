import type { Metadata } from "next";

import PublicExplorer from "@/components/drone/PublicExplorer";

export const metadata: Metadata = {
  title: "Published Map — Drone Zoning Workspace",
  description:
    "Viewer-authorized access to the published Region 4 drone-zoning guidance, classifications, primary reasons, and plain-language guidance.",
};

export default function DroneExplorePage() {
  return <PublicExplorer />;
}
