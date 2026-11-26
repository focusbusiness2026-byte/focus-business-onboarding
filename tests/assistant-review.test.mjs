import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWebsite, isPublicAddress, collectWebsite, analyzeWebsite, validateAnalysis, localReviewPlugin, extractPage } from "../scripts/onboarding-assistant.mjs";
import {questionnaire} from "../lib/onboarding-questionnaire.mjs";

test("public website validation rejects private, credential-bearing and unusual-port addresses", () => {
  assert.equal(normalizeWebsite("example.com").href, "https://example.com/");
  for (const url of ["http://localhost/", "http://127.1", "http://2130706433", "http://169.254.169.254/", "http://10.0.0.1", "http://[::1]", "http://[::ffff:127.0.0.1]", "https://foo.local", "https://user:pass@example.com", "https://example.com:8080", "file:///etc/passwd"]) assert.throws(() => normalizeWebsite(url), undefined, url);
  for (const address of ["172.16.1.1", "100.64.0.1", "192.168.1.1", "::1", "fc00::1", "fe80::1"]) assert.equal(isPublicAddress(address), false);
  assert.equal(isPublicAddress("8.8.8.8"), true);
});

const sample = { summary:"Ficha de prueba", fields:[{key:"companyName",label:"Empresa",value:"Estudio",status:"found",sourceUrl:"https://example.com/",evidence:"Nombre publicado"},{key:"contactName",label:"Responsable",value:"Inventado",status:"found",sourceUrl:"https://example.com/",evidence:""}], questions:["mainService","minimumBudget","sectors","targetCountries","radarGoal"].map(field => ({field,question:`Confirmar ${field}`,type:"single",options:["Sí","Otro"]})), leadQuestions:[{question:"¿Qué servicio necesitas?",type:"Selección única",options:["Vídeo","Otro"]}],warnings:[] };
sample.stepPlans=Array.from({length:6},(_,section)=>({section,summary:"Paso analizado",decisions:questionnaire.filter(q=>q.section===section).map(q=>({field:q.field,values:[],status:"pending",reason:"Dato interno por confirmar",sourceUrl:"",otherValue:""}))}));
test("unsupported personal data is dropped and unsupported provenance becomes a suggestion", () => {
  const copy=structuredClone(sample); copy.fields[0].sourceUrl="https://unread.example/";
  const result=validateAnalysis(copy,[{url:"https://example.com/"}]);
  assert.equal(result.fields.length,1); assert.equal(result.fields[0].status,"suggested"); assert.equal(result.fields[0].sourceUrl,"");
  assert.throws(()=>validateAnalysis({...sample,questions:[sample.questions[0]]},[]));
});
test("generated descriptions and brand palettes remain proposals even when the model labels them found", () => {
  const copy=structuredClone(sample);copy.fields=[{key:"description",label:"Descripción",value:"Resumen",status:"found",sourceUrl:"https://example.com/",evidence:"Síntesis"},{key:"primaryLanguage",label:"Idioma",value:"English",status:"found",sourceUrl:"https://example.com/",evidence:"Idioma"}];
  const result=validateAnalysis(copy,[{url:"https://example.com/"}]);assert.equal(result.fields[0].status,"suggested");assert.equal(result.fields[1].value,"Inglés");
  const colors=extractPage({url:"https://example.com/",body:'<div style="--framer-link-text-color:rgb(0, 153, 255);color:#fff;background:#000">Logo</div><span style="color:#cc0808;background:rgba(255,255,255,0.2)"></span>'}).colorCandidates;
  assert.deepEqual(colors,["#FFFFFF","#000000","#CC0808"]);
});
test("AI adaptations preserve the whole onboarding instead of truncating to eight questions", () => {
  const copy=structuredClone(sample);copy.questions=["mainService","ticket","minimumBudget","targetClientTypes","sectors","targetCountries","campaignObjective","prospectExclusions","radarGoal"].map(field=>({field,question:field,type:"single",options:["Sí","Otro"]}));
  const result=validateAnalysis(copy,[{url:"https://example.com/"}]);assert.equal(result.questions.length,89);assert.ok(result.questions.some(q=>q.field==="landingVslChoice"));assert.ok(result.questions.some(q=>q.field==="toolsToConnect"));assert.equal(result.fields[0].value,"Estudio");
});
test("six-step analysis rejects duplicate steps and missing field decisions",()=>{
  const duplicate=structuredClone(sample);duplicate.stepPlans[5].section=0;
  assert.throws(()=>validateAnalysis(duplicate,[{url:"https://example.com/"}]),/seis pasos/);
  const partial=structuredClone(sample);partial.stepPlans[2].decisions.pop();
  assert.throws(()=>validateAnalysis(partial,[{url:"https://example.com/"}]),/Faltaron campos/);
  const keyed=structuredClone(sample);keyed.stepPlans=Object.fromEntries(keyed.stepPlans.map(plan=>[String(plan.section),{summary:plan.summary,decisions:Object.fromEntries(plan.decisions.map(({field,...decision})=>[field,decision]))}]));
  assert.equal(validateAnalysis(keyed,[{url:"https://example.com/"}]).stepPlans.flatMap(plan=>plan.decisions).length,89);
});
test("website collection is bounded and follows only relevant same-origin pages", async () => {
  const called=[];
  const links=["about","services","contact","works/grid","works/one","works/two"].map(path=>`<a href="/${path}">${path}</a>`).join("");
  const result=await collectWebsite("example.com",async url=>{ called.push(url); return {url,body:`<html><p>${"public company information ".repeat(12)}</p>${url.endsWith("example.com/") ? links+'<a href="https://other.com/services">External</a>' : ""}</html>`}; });
  assert.equal(called.length,5); assert.equal(result.pages.length,5); assert.ok(called.every(url=>new URL(url).hostname==="example.com"));
});
test("analysis calls the provider with store disabled, validates output and never returns its key", async () => {
  let requests=0;
  const result=await analyzeWebsite("https://example.com",{env:{OPENAI_API_KEY:"private-test-value",OPENAI_MODEL:"test-model"},read:async url=>({url,body:`<p>${"public content ".repeat(20)}</p>`}),call:async (_url,init)=>{requests++;const body=JSON.parse(init.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify(sample)}]}],usage:{input_tokens:10,output_tokens:20}});}});
  assert.equal(requests,1); assert.equal(result.provider,"openai"); assert.doesNotMatch(JSON.stringify(result),/private-test-value/); assert.equal(result.usage.inputTokens,10);
});
test("missing credentials and provider errors are actionable and do not leak provider payloads", async () => {
  await assert.rejects(analyzeWebsite("example.com",{env:{}}),/conexión con OpenAI/);
  await assert.rejects(analyzeWebsite("example.com",{env:{OPENAI_API_KEY:"private-test-value"},read:async url=>({url,body:`<p>${"public content ".repeat(20)}</p>`}),call:async()=>new Response("private provider details",{status:429})}),error=>error.status===429 && !error.message.includes("private provider details"));
});
test("a login-only page offers manual completion without invoking the provider", async () => {
  let called=false;
  await assert.rejects(analyzeWebsite("example.com",{env:{OPENAI_API_KEY:"test"},read:async url=>({url,body:'<h1>Sign in</h1><input type="password">'}),call:async()=>{called=true;throw new Error("must not call");}}),/requiere iniciar sesión/);
  assert.equal(called,false);
});
test("a rejected startup credential does not crawl websites or invoke the model", async () => {
  await assert.rejects(analyzeWebsite("example.com",{env:{OPENAI_API_KEY:"test",FOCUS_OPENAI_AUTHENTICATED:"false"},read:()=>assert.fail("must not crawl"),call:()=>assert.fail("must not call")}),/configuración privada/);
});
test("review middleware blocks existing API writes and cross-origin requests before integrations run", async () => {
  const previous=process.env.FOCUS_LOCAL_REVIEW; process.env.FOCUS_LOCAL_REVIEW="true";
  let middleware;localReviewPlugin().configureServer({middlewares:{use(fn){middleware=fn;}}});
  async function request(url,origin) { let response; await middleware({url,method:"POST",headers:{host:"127.0.0.1:8130",origin}}, {setHeader(){},end(body){response={status:this.statusCode,body:JSON.parse(body)};}},()=>assert.fail("must not reach real integration"));return response; }
  assert.equal((await request("/api/onboarding","http://127.0.0.1:8130")).status,403);
  assert.equal((await request("/api/auth/request-link","http://127.0.0.1:8130")).status,403);
  assert.equal((await request("/api/onboarding/assistant","https://evil.example")).status,403);
  if (previous === undefined) delete process.env.FOCUS_LOCAL_REVIEW; else process.env.FOCUS_LOCAL_REVIEW=previous;
});
