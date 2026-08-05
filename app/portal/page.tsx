import { requireChatGPTUser } from "../chatgpt-auth";
import PortalClient from "./portal-client";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const user = await requireChatGPTUser("/portal");
  return <PortalClient user={{ email: user.email, name: user.displayName }} />;
}
