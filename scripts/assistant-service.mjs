// Production Node service. Only the trusted application proxy may call it.
import {createServer} from "node:http";
import {timingSafeEqual} from "node:crypto";
import {pathToFileURL} from "node:url";
import {analyzeWebsite,normalizeWebsite,fetchPublic,extractPage,ReviewError} from "./onboarding-assistant.mjs";
import {resolveOfficialLogo,getLogoAsset} from "./assistant-assets.mjs";
import {answerContextHelp,generateLeadQuestions} from "./context-help.mjs";
import {generatePendingOptions} from "./pending-options.mjs";

export function createAssistantService({env=process.env,analyze=analyzeWebsite,help=answerContextHelp,questions=generateLeadQuestions,pending=generatePendingOptions,asset=getLogoAsset,now=Date.now}={}) {
  if(!env.ASSISTANT_SERVICE_TOKEN||env.ASSISTANT_SERVICE_TOKEN.length<32)throw new Error("Configure a private service token of at least 32 characters.");
  let busy=false;
  const usage=new Map();
  const token=Buffer.from(`Bearer ${env.ASSISTANT_SERVICE_TOKEN}`);
  return createServer(async(req,res)=>{
    res.setHeader("Cache-Control","no-store");res.setHeader("X-Content-Type-Options","nosniff");
    const send=(status,body)=>{res.statusCode=status;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(body));};
    const supplied=Buffer.from(String(req.headers.authorization||""));
    if(supplied.length!==token.length||!timingSafeEqual(supplied,token))return send(401,{ok:false});
    const url=new URL(req.url||"/","http://service");
    if(req.method==="GET"&&url.pathname.startsWith("/api/onboarding/assets/")){
      const file=await asset(url.pathname.split("/").pop());if(!file)return send(404,{ok:false,error:"Logo no disponible."});
      res.setHeader("Content-Type",file.mime);res.setHeader("Content-Security-Policy","default-src 'none'; style-src 'unsafe-inline'; sandbox");res.end(file.bytes);return;
    }
    if(req.method==="GET"&&url.pathname==="/api/onboarding/assistant")return send(200,{ok:true,available:Boolean(env.OPENAI_API_KEY)});
    if(!["/api/onboarding/assistant","/api/onboarding/assistant/logo"].includes(url.pathname))return send(404,{ok:false});
    if(req.method!=="POST"&&!(req.method==="GET"&&url.pathname.endsWith("/logo")))return send(405,{ok:false});
    if(req.method==="POST"&&!String(req.headers["content-type"]||"").startsWith("application/json"))return send(415,{ok:false});
    if(busy)return send(429,{ok:false,error:"Hay una solicitud en curso. Inténtalo en unos instantes."});
    busy=true;
    try{
      let body="";for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>60000)throw new ReviewError("La solicitud es demasiado grande.",413);}
      let input={};try{if(body)input=JSON.parse(body);}catch{throw new ReviewError("La solicitud no es válida.");}
      if(!input||typeof input!=="object"||Array.isArray(input))throw new ReviewError("La solicitud no es válida.");
      const time=now();for(const [id,item] of usage)if(time-item.start>=3600000)usage.delete(id);
      const client=String(req.headers["x-assistant-client"]||"unknown").slice(0,128);
      const cost=input.action?1:3;
      for(const [id,limit] of [[client,30],["__global__",300]]){
        const item=usage.get(id)||{start:time,count:0};
        if(item.count+cost>limit)throw new ReviewError("Has alcanzado el límite de consultas. Tu avance sigue guardado; inténtalo más tarde.",429);
      }
      for(const id of [client,"__global__"]){const item=usage.get(id)||{start:time,count:0};item.count+=cost;usage.set(id,item);}
      if(url.pathname.endsWith("/logo")){
        const website=normalizeWebsite(url.searchParams.get("website")).href;
        let logo=await resolveOfficialLogo(website,[],null);
        if(!logo){const home=await fetchPublic(website);logo=await resolveOfficialLogo(website,[extractPage(home)],image=>fetchPublic(image,0,{image:true}));}
        return send(200,{ok:true,logo});
      }
      const dependencies={env};
      if(input.action==="help")return send(200,await help(input,dependencies));
      if(input.action==="lead_questions")return send(200,await questions(input,dependencies));
      if(input.action==="pending_options")return send(200,await pending(input,dependencies));
      if(input.action)throw new ReviewError("La solicitud no es válida.");
      return send(200,await analyze(input.website,dependencies));
    }catch(error){return send(error instanceof ReviewError?error.status:503,{ok:false,error:"No hemos podido completar tu solicitud. Tu avance sigue guardado; inténtalo de nuevo."});}
    finally{busy=false;}
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const server=createAssistantService();
  server.requestTimeout=310000;server.headersTimeout=15000;
  server.listen(Number(process.env.PORT||8140),process.env.HOST||"127.0.0.1");
  for(const signal of ["SIGTERM","SIGINT"])process.on(signal,()=>server.close(()=>process.exit(0)));
}
