import {proxyAssistant} from "./assistant-proxy.mjs";
const contentTypes=new Set(["image/png","image/jpeg","image/webp","image/gif","image/svg+xml"]);
const headers=mime=>({"Content-Type":mime,"Cache-Control":"public, max-age=86400, immutable","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; sandbox"});
/** @param {Request} request @param {{bucket?: R2Bucket, proxy?: typeof proxyAssistant}} options */
export async function durableAssistantAsset(request,{bucket,proxy=proxyAssistant}={}){
  const id=new URL(request.url).pathname.split("/").pop();
  if(request.method!=="GET"||!/^[a-f0-9]{24}\.(?:png|jpg|webp|gif|svg)$/.test(id))return new Response(null,{status:404});
  try{
    const cached=await bucket?.get(`brand-logos/${id}`);
    if(cached&&contentTypes.has(cached.httpMetadata?.contentType))return new Response(cached.body,{headers:headers(cached.httpMetadata.contentType)});
    const result=await proxy(request);
    if(!result.ok)return result;
    const mime=result.headers.get("content-type")?.split(";")[0];
    if(!contentTypes.has(mime))return new Response(null,{status:502});
    const bytes=await result.arrayBuffer();
    if(bytes.byteLength>1500000)return new Response(null,{status:502});
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),byte=>byte.toString(16).padStart(2,"0")).join("");
    if(!id.startsWith(digest.slice(0,24)))return new Response(null,{status:502});
    // Persist files only. Onboarding records remain exclusively in Google Sheets.
    await bucket?.put(`brand-logos/${id}`,bytes,{httpMetadata:{contentType:mime}});
    return new Response(bytes,{headers:headers(mime)});
  }catch{return new Response(null,{status:503,headers:{"Cache-Control":"no-store"}});}
}
