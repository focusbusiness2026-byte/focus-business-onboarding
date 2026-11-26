import assert from "node:assert/strict";
import test from "node:test";
import {normalizeReviewValues,normalizePatch,jsonList} from "../lib/assistant-config.ts";
import {allowedHelpFields,answerContextHelp,generateLeadQuestions,sanitizeHelpContext} from "../scripts/context-help.mjs";
import {extractPage} from "../scripts/onboarding-assistant.mjs";
import {cacheLogo,getLogoAsset} from "../scripts/assistant-assets.mjs";
import {trustedProspectionParent} from "../lib/help-bridge.mjs";

const provider=result=>({env:{OPENAI_API_KEY:"test-only"},call:async(_url,init)=>{const body=JSON.parse(init.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify(result)}]}]});}});

test("embedded help accepts only the exact production portals and explicit local review",()=>{
  for(const origin of ["https://prospeccion.focusbusinesslab.es","https://focus-prospeccion-fb.onrender.com","http://localhost:8133"])assert.equal(trustedProspectionParent(origin),true);
  for(const origin of ["https://prospeccion.focusbusinesslab.es.evil.example","http://prospeccion.focusbusinesslab.es","https://untrusted.example","http://localhost:8134","null"])assert.equal(trustedProspectionParent(origin),false);
});

test("Kuro context proposes an actual activity and additional communication language without legal data",()=>{
  const values=normalizeReviewValues({activity:"Otro",description:"Creative digital studio",primaryLanguage:"Inglés",location:"Madrid y Barcelona",legalName:"Must disappear",companySocialLinks:"https://linkedin.com/company/example https://instagram.com/example"});
  assert.equal(values.activity,"Estudio creativo y digital");assert.equal(values.legalName,undefined);
  assert.deepEqual(jsonList(values.communicationLanguages),["Inglés","Español"]);
  assert.deepEqual(jsonList(values.socialProfiles).map(p=>p.network),["Instagram","LinkedIn"]);
  const patch=normalizePatch({...values,primaryLanguage:"Español",otherLanguages:"Euskera, Inglés"});
  assert.deepEqual(patch.additionalLanguages,["Inglés","Euskera"]);
});
test("malformed structured chat edits cannot break social or price rendering",()=>{
  const values=normalizeReviewValues({activity:"Agencia creativa",socialProfiles:'[null,{},"bad",{"network":"Instagram","url":"https://instagram.com/example"}]',communicationLanguages:'[null,{},"Español"]',servicePrices:'[null,{},"bad"]'});
  assert.equal(jsonList(values.socialProfiles).length,1);assert.deepEqual(jsonList(values.servicePrices),[]);assert.deepEqual(jsonList(values.communicationLanguages),["Español"]);
});
test("help excludes permissions, consents, legal identity and account administration",async()=>{
  const fields=await allowedHelpFields("onboarding");assert.ok(fields.includes("description"));
  for(const name of ["terms","accuracy","legalName","teamSize","billingEmail","ghlPreparationAuthorization"])assert.ok(!fields.includes(name));
  assert.deepEqual(sanitizeHelpContext({password:"private",company:"Example",nested:{token:"private",city:"Madrid"}}),{company:"Example",nested:{city:"Madrid"}});
});

test("customer help does not confuse onboarding autosave with internal prospecting drafts",async()=>{
  const dependencies=provider({answer:"Edita guide_answer y exporta JSON.",updates:[]});
  const call=dependencies.call;
  dependencies.call=async(url,init)=>{const prompt=JSON.parse(init.body).instructions;assert.match(prompt,/avance se guarda automáticamente/);assert.doesNotMatch(prompt,/versión guiada presenta preguntas/);return call(url,init);};
  const result=await answerContextHelp({scope:"onboarding",message:"¿Puedo revisar antes de enviar?"},dependencies);
  assert.doesNotMatch(result.answer,/guide_|JSON/);assert.match(result.answer,/automáticamente/);assert.deepEqual(result.updates,[]);
});
test("prospection help may propose only fields editable in the selected page",async()=>{
  const result=await answerContextHelp({scope:"prospection",message:"Barcelona",context:{contextId:"account-1",editableFields:{target_city:{type:"string"}}}},provider({answer:"Revisa la ciudad.",updates:[{field:"target_city",label:"Ciudad",value:"Barcelona"},{field:"sectors",label:"Sectores",value:'["Salud"]'},{field:"enabled",label:"Activar",value:"true"}]}));
  assert.deepEqual(result.updates.map(u=>u.field),["target_city"]);
});
test("translation preserves optional questions and translates existing options",async()=>{
  const original=[{question:"Servicio",options:["Vídeo","Otro"],required:false}];
  const result=await generateLeadQuestions({count:1,translate:true,language:"Inglés",questions:original},provider({questions:[{question:"Service?",type:"Selección única",options:["Video","Other"],required:true}]}));
  assert.equal(result.questions.length,1);assert.equal(result.questions[0].required,false);assert.deepEqual(result.questions[0].options,["Video","Other"]);
});
test("missing provider questions preserve the old form instead of returning partial replacements",async()=>{
  await assert.rejects(generateLeadQuestions({count:8},provider({questions:[]})),/Conservamos las anteriores/);
});
test("logo extraction excludes portfolio brands and cached downloads reject path traversal",async()=>{
  const page=extractPage({url:"https://example.com/",body:'<header><img alt="Company logo" src="/official.png"></header><section><img alt="Client brand logo" src="/client.png"></section>'});
  assert.deepEqual(page.logoCandidates,["https://example.com/official.png"]);
  const logo=await cacheLogo(Buffer.from("test-logo"),"image/png","https://example.com/official.png","Test fixture");
  const asset=await getLogoAsset(logo.url.split("/").pop());assert.equal(asset.bytes.toString(),"test-logo");assert.equal(await getLogoAsset("../secret"),null);
});

 test("translation that adds options is rejected without replacing the current form",async()=>{
  await assert.rejects(generateLeadQuestions({count:1,translate:true,questions:[{question:"Servicio",type:"Selección única",options:["Vídeo","Otro"]}]},provider({questions:[{question:"Service",type:"Selección única",options:["Video","Other","Extra"],required:true}]})),/alteró las opciones/);
});
