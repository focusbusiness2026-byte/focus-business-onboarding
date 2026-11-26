const message="No hemos podido completar tu solicitud. Tu avance sigue guardado; inténtalo de nuevo.";
const failure=(status,reason="unavailable")=>Response.json({ok:false,error:message},{status,headers:{"Cache-Control":"no-store","X-Assistant-Status":reason}});
export async function proxyAssistant(request,{env=process.env,call=fetch.bind(globalThis)}={}){
  if(!env.ASSISTANT_SERVICE_URL||!env.ASSISTANT_SERVICE_TOKEN){console.warn("onboarding-assistant: configuration unavailable");return failure(503,"configuration");}
  const incoming=new URL(request.url);
  if(!/^\/api\/onboarding\/(?:assistant(?:\/logo)?|assets\/[a-f0-9]{24}\.(?:png|jpg|webp|gif|svg))$/.test(incoming.pathname))return failure(404);
  if(!["GET","POST"].includes(request.method))return failure(405);
  if(request.headers.get("sec-fetch-site")==="cross-site")return failure(403);
  const origin=request.headers.get("origin");
  if(origin&&origin!==incoming.origin)return failure(403);
  if(request.method==="POST"&&!request.headers.get("content-type")?.startsWith("application/json"))return failure(415);
  try{
    const backend=new URL(env.ASSISTANT_SERVICE_URL);
    if(backend.username||backend.password||backend.search||backend.hash)return failure(503,"configuration");
    if(backend.protocol!=="https:"&&!(backend.protocol==="http:"&&["127.0.0.1","localhost"].includes(backend.hostname)))return failure(503,"configuration");
    const target=new URL(incoming.pathname+incoming.search,backend.origin);
    let body;
    if(request.method==="POST"){
      const reader=request.body?.getReader();const decoder=new TextDecoder();let size=0;body="";
      if(reader){while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>60000){await reader.cancel();return failure(413);}body+=decoder.decode(part.value,{stream:true});}body+=decoder.decode();}
    }
    const upstream=await call(target.href,{method:request.method,headers:{Authorization:`Bearer ${env.ASSISTANT_SERVICE_TOKEN}`,"Content-Type":"application/json","X-Assistant-Client":request.headers.get("cf-connecting-ip")||"unknown"},body,redirect:"error",signal:AbortSignal.timeout(300000)});
    // Never return an upstream exception, stack trace or private configuration.
    if(!upstream.ok){console.warn(`onboarding-assistant: upstream status ${upstream.status}`);return failure([400,403,404,413,415,429].includes(upstream.status)?upstream.status:503,`upstream-${upstream.status}`);}
    const headers={"Content-Type":upstream.headers.get("content-type")||"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
    if(incoming.pathname.includes("/assets/"))headers["Content-Security-Policy"]="default-src 'none'; style-src 'unsafe-inline'; sandbox";
    return new Response(upstream.body,{status:upstream.status,headers});
  }catch(error){const detail=String(error?.message||"");const reason=error?.name==="TimeoutError"?"timeout":/illegal invocation/i.test(detail)?"call-context":/signal|abort/i.test(detail)?"request-signal":/url/i.test(detail)?"request-url":error instanceof TypeError?"connection-type":"connection";console.warn(`onboarding-assistant: ${reason}`);return failure(503,reason);}
}
