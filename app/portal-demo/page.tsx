import { redirect } from "next/navigation";

// Legacy address retained only so existing bookmarks reach the real portal.
export default function LegacyPortalRoute() {
  redirect("/portal");
}
