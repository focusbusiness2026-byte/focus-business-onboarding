import { toSheetRecord } from "../lib/onboarding";

export type SandboxEnv = { DB: D1Database; FOCUS_SANDBOX?: string };
const PROSPECTION = "https://focus-prospeccion-sandbox-20261108.onrender.com";
const RADAR = "https://focus-radar-sandbox-20261108.onrender.com";
const PORTAL = "https://focus-business-sandbox-20261108.moisses.chatgpt.site";
const fakeEmail = (value: unknown) => /^[^\s@]+@[^\s@]+\.test$/.test(String(value || ""));
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control":"no-store", "X-Focus-Environment":"sandbox" } });

async function records(env: SandboxEnv) {
  const rows = await env.DB.prepare("SELECT id, submitted_at, status, payload_json FROM onboarding_submissions ORDER BY submitted_at DESC LIMIT 200").all<{id:string;submitted_at:string;status:string;payload_json:string}>();
  const saved = rows.results.map(row => toSheetRecord({ id:row.id, submittedAt:row.submitted_at, status:row.status, payload:JSON.parse(row.payload_json) }));
  const samples = [1,2].map(n => toSheetRecord({ id:`SANDBOX-${n}`, submittedAt:new Date().toISOString(), status:"Pruebas", payload:{companyName:`Estudio ficticio ${n}`,contactEmail:`cliente${n}@example.test`,website:`https://estudio${n}.example.test`,activity:"Productora audiovisual",description:"Ficha ficticia para revisión visual"} }));
  return [...samples,...saved].map(row=>({...row,"Google Sheets":"Copia aislada; sin conexión con la hoja real"}));
}

export async function sandboxApi(request: Request, env: SandboxEnv): Promise<Response> {
  const url = new URL(request.url), path = url.pathname;
  if (request.method !== "GET" && request.headers.get("origin") && request.headers.get("origin") !== url.origin) return json({ok:false,error:"Origen no autorizado"},403);
  if (path === "/api/sandbox/config") return json({environment:"sandbox",portal:PORTAL,prospection:PROSPECTION+"/portal",radar:RADAR,paidServices:false});
  if (path === "/api/auth/introspect") return json({ok:true,email:"admin@sandbox.example.test",role:"Administrador",prospectionAccess:true,radarAccess:true});
  if (path === "/api/auth/logout") return json({ok:true,redirect:"/"});
  if (path === "/api/portal") {
    if (request.method === "DELETE") {
      const body = await request.json() as {id?:string};
      if (["SANDBOX-1","SANDBOX-2"].includes(String(body.id))) return json({ok:false,error:"Las dos fichas de ejemplo son fijas. Crea otra ficha ficticia para probar su eliminación."},403);
      if (!String(body.id).startsWith("SANDBOX-")) return json({ok:false,error:"Solo registros ficticios"},422);
      await env.DB.prepare("DELETE FROM onboarding_submissions WHERE id = ?").bind(body.id).run();
      return json({ok:true,id:body.id});
    }
    return json({ok:true,email:"admin@sandbox.example.test",role:"Administrador",records:await records(env)});
  }
  if (path === "/api/onboarding/quick" && request.method === "GET") return json({ok:true,public:true});
  if (["/api/onboarding", "/api/onboarding/quick"].includes(path) && request.method === "POST") {
    const raw = await request.json() as Record<string,unknown>;
    const body = (raw.onboarding || raw) as Record<string,unknown>;
    const email = String(body.contactEmail || body.email || "").toLowerCase().trim();
    if (!fakeEmail(email) || !String(body.companyName || "").trim()) return json({ok:false,error:"Usa una empresa ficticia y un correo terminado en .test. No introduzcas datos de clientes reales."},422);
    if (JSON.stringify(body).length > 50000) return json({ok:false,error:"Formulario demasiado grande"},413);
    if (/(-----BEGIN.*PRIVATE KEY|\bsk-[a-zA-Z0-9]{16})/.test(JSON.stringify(body))) return json({ok:false,error:"No introduzcas secretos"},422);
    const prior = await env.DB.prepare("SELECT id FROM onboarding_submissions WHERE contact_email = ? LIMIT 1").bind(email).first<{id:string}>();
    const id = prior?.id || `SANDBOX-${crypto.randomUUID()}`;
    const submittedAt = new Date().toISOString();
    const payload = {...body,contactEmail:email,contactName:body.contactName || `${body.firstName||""} ${body.lastName||""}`.trim()};
    // This DB belongs to the newly created Site. No Apps Script, mail or real quota path is used.
    await env.DB.prepare("INSERT INTO onboarding_submissions (id,submitted_at,status,company_name,contact_email,payload_json) VALUES (?,?,'Pruebas',?,?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,submitted_at=excluded.submitted_at")
      .bind(id,submittedAt,String(body.companyName),email,JSON.stringify(payload)).run();
    let synced = false;
    try {
      const response = await fetch(PROSPECTION+"/sandbox/onboarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,id}),signal:AbortSignal.timeout(10000)});
      synced = response.ok;
    } catch { /* Saving remains confirmed; retrying the form is idempotent. */ }
    return json({ok:true,message:"Ficha ficticia guardada en la copia. No se ha enviado ningún correo.",saved:{confirmed:true,id,deduplicated:!!prior,submittedAt},sheets:{configured:false},prospection:{configured:true,notified:synced},viralRadar:{configured:false,notified:false},account:{email,accessReady:true,accessLinkSent:false},downstream:{externalSearchStarted:false},sandbox:true});
  }
  if (path === "/api/auth/request-link") {
    const body = await request.json() as {email?:string};
    if (!fakeEmail(body.email)) return json({ok:false,error:"En pruebas utiliza un correo terminado en .test"},422);
    return json({ok:true,message:"Modo de pruebas: no se envían correos. Accede al portal o a las herramientas desde la barra superior."});
  }
  if (path === "/api/admin/short-invitations") {
    const body = await request.json() as {email?:string};
    if (!fakeEmail(body.email)) return json({ok:false,error:"Usa un correo de pruebas terminado en .test"},422);
    return json({ok:true,url:PORTAL+"/alta-herramientas",sandbox:true});
  }
  if (path === "/api/radar-quota") return json({ok:true,assigned:50,used:0,remaining:50,sandbox:true});
  return json({ok:false,error:"Operación externa desactivada en la copia de pruebas."},403);
}
