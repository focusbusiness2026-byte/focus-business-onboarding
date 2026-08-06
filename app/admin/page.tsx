import { redirect } from "next/navigation";

// Legacy internal route: all operational access now lives in the portal.
export default function LegacyAdminRoute() {
  redirect("/portal");
}
