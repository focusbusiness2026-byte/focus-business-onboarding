import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";
import PortalClient from "./portal-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const user = await getChatGPTUser();
  if (!user) {
    return <main className="access"><section className="access-card"><Link className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></Link><p className="eyebrow">PORTAL DE CONFIGURACIÓN</p><h1>Accede con tu correo</h1><p className="intro">Identifícate con ChatGPT para consultar las productoras registradas. El acceso al contenido queda limitado a los correos autorizados por Focus Business.</p><a className="primary access-button" href={chatGPTSignInPath("/portal")}>Continuar con ChatGPT →</a><p className="access-note">¿Aún no hay registros? <Link href="/">Abre el formulario público</Link> para enviar la primera configuración.</p></section></main>;
  }
  return <PortalClient user={{ email: user.email, name: user.displayName }} />;
}
