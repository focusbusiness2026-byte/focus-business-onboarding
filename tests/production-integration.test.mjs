import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {durableAssistantAsset} from "../lib/assistant-asset-cache.mjs";
import {connectedReviewSubmission,testCompany} from "../scripts/connected-review.mjs";
const testEmail="review+onboarding-kuro@example.com";

test("a logo survives loss of the Node service once read through durable storage",async()=>{
  const bytes=new TextEncoder().encode("verified image");
  const id=createHash("sha256").update(bytes).digest("hex").slice(0,24)+".png";
  const objects=new Map();let requests=0;
  const bucket={get:async key=>objects.get(key),put:async(key,body,metadata)=>objects.set(key,{body,httpMetadata:metadata.httpMetadata})};
  const request=new Request(`https://onboarding.example/api/onboarding/assets/${id}`);
  const proxy=async()=>{requests++;return new Response(bytes,{headers:{"Content-Type":"image/png"}});};
  assert.equal((await durableAssistantAsset(request,{bucket,proxy})).status,200);
  assert.equal((await durableAssistantAsset(request,{bucket,proxy:async()=>{throw Error("service restarted");}})).status,200);
  assert.equal(requests,1);
});

test("logo storage rejects oversized and mismatched content before persisting",async()=>{
  let writes=0;const bucket={get:async()=>null,put:async()=>writes++};
  const request=new Request("https://onboarding.example/api/onboarding/assets/aaaaaaaaaaaaaaaaaaaaaaaa.png");
  const result=await durableAssistantAsset(request,{bucket,proxy:async()=>new Response("wrong bytes",{headers:{"Content-Type":"image/png"}})});
  assert.equal(result.status,502);assert.equal(writes,0);
});

test("connected review cannot send a real Kuro record, its public email or another company",async()=>{
  let requests=0;const dependencies={env:{FOCUS_CONNECTED_REVIEW:"true",FOCUS_CONNECTED_REVIEW_EMAIL:testEmail},call:async(url,options)=>{requests++;assert.equal(url,"https://onboarding.focusbusinesslab.es/api/onboarding");assert.equal(options.headers.Origin,"https://onboarding.focusbusinesslab.es");return Response.json({ok:true});}};
  assert.equal(await connectedReviewSubmission({},{env:{}}),null);
  for(const onboarding of [{companyName:"Küro Digital Studio",contactEmail:testEmail},{companyName:testCompany,contactEmail:"hola@kurodigitalstudio.com"},{companyName:testCompany,contactEmail:testEmail,businessEmail:testEmail,website:"https://kurodigitalstudio.com/"}])assert.equal((await connectedReviewSubmission({onboarding},dependencies)).status,403);
  assert.equal(requests,0);
  assert.equal((await connectedReviewSubmission({onboarding:{companyName:testCompany,contactEmail:testEmail,businessEmail:testEmail,website:""}},dependencies)).status,200);
  assert.equal(requests,1);
});
