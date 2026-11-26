import test from "node:test";
import assert from "node:assert/strict";
import {normalizeStepPlans,stepPlanAnswers} from "../lib/onboarding-plan.mjs";
import {questionnaire,questionnairePatch} from "../lib/onboarding-questionnaire.mjs";
const url="https://studio.example/";
const pages=[{url,text:"Estudio visual. hola@studio.example. Proyecto editorial publicado."}];
const decision=(field,values,status="suggested",sourceUrl="")=>({field,values,status,sourceUrl,reason:"Propuesta para revisar",otherValue:""});
const plans=entries=>Array.from({length:6},(_,section)=>({section,summary:`Plan del paso ${section+1}`,decisions:entries.filter(item=>questionnaire.find(q=>q.field===item.field)?.section===section)}));
test("all six steps have a decision for every original configuration question",()=>{
  const result=normalizeStepPlans(plans([decision("mainService",["Fotografía"]),decision("campaignObjective",["Captar leads cualificados"]),decision("meetingDuration",["30 minutos"]),decision("workflowAutomations",["Nuevo lead"])]),pages);
  assert.equal(result.length,6);assert.equal(result.flatMap(p=>p.decisions).length,89);
  const answers=stepPlanAnswers(result);
  assert.deepEqual(answers.mainService,["Fotografía"]);assert.equal(answers.campaignObjective,"Captar leads cualificados");assert.equal(answers.meetingDuration,"30 minutos");assert.deepEqual(answers.workflowAutomations,["Nuevo lead"]);
  assert.equal(answers.launchDate,"");assert.equal(answers.approvalOwner,"");
});
test("AI cannot invent internal facts, prices, permissions, current tools or consents",()=>{
  const result=normalizeStepPlans(plans([decision("ownerName",["Nombre inventado"],"found",url),decision("ticket",["1.000–3.000 €"],"found",url),decision("toolsInUse",["Google Calendar"],"found",url),decision("metaBusinessAccess",["Acceso enviado"],"found",url),decision("launchDate",["2026-12-15"]),decision("accuracy",["true"])]),pages);
  const answers=stepPlanAnswers(result);
  for(const field of ["ownerName","ticket","metaBusinessAccess","launchDate"])assert.equal(answers[field],"");
  assert.deepEqual(answers.toolsInUse,[]);assert.ok(!Object.hasOwn(answers,"accuracy"));
});
test("public contact needs literal evidence and commercial targeting stays a proposal",()=>{
  const result=normalizeStepPlans(plans([decision("contactEmail",["invented@studio.example"],"found",url),decision("audience",["B2B"],"found",url),decision("portfolioHighlights",["Proyecto editorial publicado."],"found",url)]),pages);
  assert.equal(stepPlanAnswers(result).contactEmail,"");
  assert.equal(result[1].decisions.find(d=>d.field==="audience").status,"suggested");
  assert.equal(result[1].decisions.find(d=>d.field==="portfolioHighlights").status,"found");
  assert.equal(stepPlanAnswers(normalizeStepPlans(plans([decision("contactEmail",["hola@studio.example"],"found",url)]),pages)).contactEmail,"hola@studio.example");
});
test("proposals preserve valid options, custom details, maximum sectors and country boundaries",()=>{
  const custom=decision("mainService",["Otro"]);custom.otherValue="Visualización de producto";
  const result=normalizeStepPlans(plans([custom,decision("sectors",["Tecnología","Moda","Salud","Industria"]),decision("targetCountries",["España"]),decision("targetRegions",["Comunidad de Madrid","Algarve"]),decision("campaignConversion",["Acción inventada"])]),pages);
  const answers=stepPlanAnswers(result),patch=questionnairePatch(answers);
  assert.deepEqual(patch.mainService,["Otro"]);assert.equal(patch.mainServiceOther,"Visualización de producto");
  assert.equal(patch.sectors.length,3);assert.deepEqual(patch.targetRegions,["Comunidad de Madrid"]);assert.equal(answers.campaignConversion,"");
});
test("inactive branches cannot survive applying a six-step configuration",()=>{
  const result=normalizeStepPlans(plans([decision("landingVslChoice",["No"]),decision("landingVslUrl",["https://studio.example/video"]),decision("subdomainSetup",["Subdominio de Focus Business"]),decision("desiredDomain",["studio.focusbusinesslab.es"]),decision("whatsappSetup",["No"]),decision("callingSetup",["No"])]),pages);
  const patch=questionnairePatch(stepPlanAnswers(result));
  assert.equal(patch.landingVslUrl,"");assert.equal(patch.domainOption1,"");assert.equal(patch.desiredDomain,"studio.focusbusinesslab.es");assert.equal(patch.whatsappDisplayNumber,"");assert.equal(patch.callRecording,"");
});
