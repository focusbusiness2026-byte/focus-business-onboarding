/** Owner-private sandbox bridge and durable state. Never active in production mode. */
type PrivateEnv = { DB: D1Database; SANDBOX_AUTH_SECRET?: string; SANDBOX_OWNER_EMAIL?: string };
const PROSPECTION = "https://focus-prospeccion-sandbox-20261108.onrender.com";
const buckets = new Set(["SandboxCells", "FICampaigns", "SourceCopy"]);
const json = (value: unknown, status=200) => Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
const hex = (bytes:ArrayBuffer) => Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,"0")).join("");

export async function sandboxPrivate(request:Request,env:PrivateEnv):Promise<Response> {
  const url=new URL(request.url);
  if(url.pathname==="/sandbox-access") {
    if(request.method!=="GET") return json({error:"Método no permitido"},405);
    if(!request.headers.get("oai-authenticated-user-id") || !env.SANDBOX_OWNER_EMAIL || request.headers.get("oai-authenticated-user-email")?.toLowerCase()!==env.SANDBOX_OWNER_EMAIL.toLowerCase()) return json({error:"Solo la cuenta propietaria puede abrir esta copia"},403);
    if(!env.SANDBOX_AUTH_SECRET || env.SANDBOX_AUTH_SECRET.length<32) return json({error:"Acceso privado pendiente de configuración"},503);
    const claims={aud:PROSPECTION,sub:"sandbox-owner",tenant:"three-dots",exp:Math.floor(Date.now()/1000)+60,nonce:crypto.randomUUID()};
    const raw=btoa(JSON.stringify(claims)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.SANDBOX_AUTH_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(raw));
    const sig=btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
    return new Response(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Focus Intelligence · Acceso privado</title><style>body{margin:0;background:#07111e;color:#f3f1ec;font:16px/1.6 system-ui}main{max-width:640px;margin:10vh auto;padding:32px}small{color:#d9af3c;letter-spacing:3px}h1{font:48px Georgia}button{background:#d9af3c;color:#07111e;padding:16px 28px;border:0;border-radius:28px;font:600 16px system-ui;cursor:pointer}p{color:#b3bec9}</style><main><small>COPIA PRIVADA · THREE DOTS STUDIO</small><h1>Focus Intelligence</h1><p>Prospectos reales, investigación y mensajes con OpenAI en un entorno separado. No cambia los datos de producción ni envía mensajes a terceros.</p><form method="post" action="${PROSPECTION}/sandbox/session"><input type="hidden" name="token" value="${raw}.${sig}"><button>Entrar a la copia privada →</button></form><p>Este acceso de un solo uso caduca en un minuto. Si caduca, recarga esta página.</p></main></html>`,{headers:{"Content-Type":"text/html;charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer","Content-Security-Policy":`default-src 'none'; style-src 'unsafe-inline'; form-action ${PROSPECTION}; base-uri 'none'; frame-ancestors 'none'`}});
  }
  // Sites dispatch authenticates owner browsers and service callers before
  // the Worker. The Site must remain owner-private; never enable this on a
  // public Site. State is shared only within this isolated single-account copy.
  const bucket=decodeURIComponent(url.pathname.split("/").at(-1)||"");
  if(!buckets.has(bucket)) return json({error:"Almacenamiento no autorizado"},404);
  if(request.method==="GET") {
    const row=await env.DB.prepare("SELECT value,sha256,revision FROM sandbox_runtime_state WHERE bucket=?").bind(bucket).first();
    return json(row?{found:true,...row}:{found:false,revision:0});
  }
  if(request.method!=="PUT") return json({error:"Método no permitido"},405);
  if(request.headers.get("origin") && request.headers.get("origin")!==url.origin) return json({error:"Origen no autorizado"},403);
  if(Number(request.headers.get("content-length")||0)>6_000_000) return json({error:"Estado demasiado grande"},413);
  const body=await request.json() as {value?:unknown;revision?:unknown};
  if(typeof body.value!=="string" || new TextEncoder().encode(body.value).length>4_000_000 || !Number.isSafeInteger(body.revision) || Number(body.revision)<0) return json({error:"Estado inválido"},422);
  const hash=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(body.value)));
  const row=await env.DB.prepare("INSERT INTO sandbox_runtime_state(bucket,value,sha256,revision,updated_at) SELECT ?,?,?,1,? WHERE ?=0 ON CONFLICT(bucket) DO UPDATE SET value=excluded.value,sha256=excluded.sha256,revision=sandbox_runtime_state.revision+1,updated_at=excluded.updated_at WHERE sandbox_runtime_state.revision=? RETURNING revision")
    .bind(bucket,body.value,hash,new Date().toISOString(),body.revision,body.revision).first<{revision:number}>();
  // UPDATE separately when a row already exists: INSERT SELECT WHERE 0 has
  // no conflicting row, so an explicit compare-and-swap update is required.
  if(row) return json({ok:true,revision:row.revision,sha256:hash});
  if(Number(body.revision)>0) {
    const changed=await env.DB.prepare("UPDATE sandbox_runtime_state SET value=?,sha256=?,revision=revision+1,updated_at=? WHERE bucket=? AND revision=? RETURNING revision")
      .bind(body.value,hash,new Date().toISOString(),bucket,body.revision).first<{revision:number}>();
    if(changed) return json({ok:true,revision:changed.revision,sha256:hash});
  }
  return json({error:"El estado cambió; recarga antes de escribir"},409);
}
