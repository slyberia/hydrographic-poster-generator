import { redirect } from "next/navigation";

export default function LegacyDroneGuidePage() {
  redirect("/workspace/drone/console");
}
