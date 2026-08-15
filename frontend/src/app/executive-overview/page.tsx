import { permanentRedirect } from "next/navigation";

export default function LegacyExecutiveOverviewPage() {
  permanentRedirect("/drone");
}
