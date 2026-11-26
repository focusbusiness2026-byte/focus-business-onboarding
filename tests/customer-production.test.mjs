import assert from "node:assert/strict";
import test from "node:test";
import {answerContextHelp} from "../scripts/context-help.mjs";
import {once} from "node:events";
import {readFile} from "node:fs/promises";
import {customerPatch,customerError} from "../lib/customer-journey.mjs";
import {proxyAssistant} from "../lib/assistant-proxy.mjs";
import {createAssistantService} from "../scripts/assistant-service.mjs";

test("a single contact is reused without overwriting another assigned person or approving consent",()=>{
  const input={contactName:"Cliente",businessEmail:"contacto@example.com",accuracy:false,terms:false,ghlPreparationAuthorization:false};
  assert.deepEqual(customerPatch(input),{...input,contactEmail:input.businessEmail,ownerName:"Cliente"});
  assert.equal(customerPatch({...input,ownerName:"Otra persona"}).ownerName,"Otra persona");
});

test("customer screens omit technical provider labels and retain explicit manual editing",async()=>{
  for(const file of ["OnboardingAssistant","FullQuestionnaire","SixStepPlan","ContextHelp","FullConfigurationSummary"]){
    const source=await readFile(new URL(`../app/components/${file}.tsx`,import.meta.url),"utf8");
    assert.doesNotMatch(source,/ChatGPT|OpenAI|\bGPT\b|analizando datos|tokens en este/i,file);
    assert.doesNotMatch(source,/Ã|Â·|â€¦/,file);
    if(file==="FullConfigurationSummary")assert.doesNotMatch(source,/con respuesta|section\.answered|section\.pending/);
  }
  assert.doesNotMatch(customerError(),/API|GPT|servidor local/i);
});

test("production proxy fails closed, blocks foreign origins, caps requests and hides private upstream errors",async()=>{
  const env={ASSISTANT_SERVICE_URL:"https://private.example",ASSISTANT_SERVICE_TOKEN:"private-value"};
  const request=(body="{}",origin="https://onboarding.example")=>new Request("https://onboarding.example/api/onboarding/assistant",{method:"POST",headers:{"Content-Type":"application/json",origin},body});
  assert.equal((await proxyAssistant(request(),{env:{}})).status,503);
  assert.equal((await proxyAssistant(request("{}","https://foreign.example"),{env})).status,403);
  assert.equal((await proxyAssistant(request("x".repeat(60001)),{env})).status,413);
  const response=await proxyAssistant(request(),{env,call:async()=>new Response("private-value exception",{status:500})});
  assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private-value|exception/);
  await proxyAssistant(request(),{env,call:async(url,options)=>{assert.equal(String(url),"https://private.example/api/onboarding/assistant");assert.equal(options.headers.Authorization,"Bearer private-value");return Response.json({ok:true});}});
});

test("production service requires authentication, limits consumption, routes actions and never writes onboarding records",async(t)=>{
  const token="a".repeat(40);let calls=0;
  const service=createAssistantService({env:{ASSISTANT_SERVICE_TOKEN:token},analyze:async website=>{calls++;return{ok:true,website};},pending:async()=>({ok:true,options:[]})});
  service.listen(0,"127.0.0.1");await once(service,"listening");t.after(()=>{service.closeAllConnections();service.close();});
  const base=`http://127.0.0.1:${service.address().port}`;
  const send=(path,auth=token,body={website:"https://example.com"})=>fetch(base+path,{method:"POST",headers:{Authorization:`Bearer ${auth}`,"Content-Type":"application/json","X-Assistant-Client":"test"},body:JSON.stringify(body)});
  assert.equal((await send("/api/onboarding/assistant","wrong")).status,401);
  assert.equal((await send("/api/onboarding")).status,404);
  assert.equal((await send("/api/onboarding/assistant",token,{action:"pending_options",fields:["ticket"]})).status,200);
  for(let i=0;i<9;i++)assert.equal((await send("/api/onboarding/assistant")).status,200);
  assert.equal((await send("/api/onboarding/assistant")).status,429);
  assert.equal(calls,9);
});


test("help answers informational questions without proposing unsolicited edits and removes unchanged updates",async()=>{
  const dependencies={env:{OPENAI_API_KEY:"test"},call:async()=>Response.json({output:[{content:[{type:"output_text",text:JSON.stringify({answer:"Los accesos se coordinan después.",updates:[{field:"responseTime",label:"Respuesta",value:"En 4 horas"}]})}]}]})};
  const context={values:{responseTime:"En 4 horas"}};
  const faq=await answerContextHelp({message:"¿Tengo que completar los accesos y la telefonía para terminar?",context},dependencies);
  assert.deepEqual(faq.updates,[]);
  const unchanged=await answerContextHelp({message:"Cambia la respuesta a En 4 horas",context},dependencies);
  assert.deepEqual(unchanged.updates,[]);
  const changed=await answerContextHelp({message:"Cambia la respuesta a En 4 horas",context:{values:{responseTime:"En 24 horas"}}},dependencies);
  assert.equal(changed.updates[0].field,"responseTime");
});
