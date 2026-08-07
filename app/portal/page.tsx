import PortalClient from "./portal-client";
import { getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const user = await getChatGPTUser();
  return <PortalClient user={user ? { email: user.email, name: user.displayName } : null} />;
}
