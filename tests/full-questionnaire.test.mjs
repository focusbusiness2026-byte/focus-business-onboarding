import assert from "node:assert/strict";
import test from "node:test";
import {readFile} from "node:fs/promises";
import {auditOnboardingFields} from "../scripts/audit-onboarding-fields.mjs";
import {questionnaire,completeQuestionnaire,reviewCoveredFields,manualConfirmations,questionnairePatch,matchesCondition,questionnaireCoverage,seedQuestionnaireAnswers} from "../lib/onboarding-questionnaire.mjs";

test("every original onboarding control is covered by review, questionnaire or manual confirmations",async()=>{
  const controls=await auditOnboardingFields();
  const fields=new Set([...reviewCoveredFields,...manualConfirmations,...questionnaire.flatMap(q=>[q.field,q.otherField].filter(Boolean))]);
  assert.ok(controls.length>=100);
  assert.deepEqual(controls.filter(control=>!fields.has(control.field)).map(control=>control.field),[]);
  assert.equal(new Set(questionnaire.map(q=>q.field)).size,questionnaire.length);
  assert.equal(new Set(questionnaire.map(q=>q.section)).size,6);
  for(const field of ["domainOption1","domainOption2","domainOption3","exceptions","additionalLeadQuestions"])assert.ok(fields.has(field));
});
test("a short saved AI analysis expands to the complete questionnaire with business wording",()=>{
  const result=completeQuestionnaire([{field:"mainService",question:"What do you want to buy?",type:"single",options:["Creative direction","Otro"]}]);
  assert.equal(result.length,89);
  assert.match(result.find(q=>q.field==="mainService").question,/prospección/);
  assert.equal(result.find(q=>q.field==="mainService").type,"multi");
  assert.ok(result.find(q=>q.field==="mainService").options.includes("Creative direction"));
});
test("all blocks transfer typed values to the existing form and custom services use Otro",()=>{
  const questions=completeQuestionnaire([{field:"mainService",options:["Creative direction"]}]);
  const values={mainService:["Creative direction"],priceModel:"Retainer mensual",toolsToConnect:["Google Calendar"],emailAutomations:["Confirmación de cita"],leadFields:["Nombre","Email"],whatsappSetup:"No",callingSetup:"No",landingCopyOwner:"En conjunto",initialTeamRoles:"Persona de prueba — comercial",bookingName:"Primera reunión",launchDate:"2026-12-15",approvalOwner:"Responsable de prueba",subdomainSetup:"Dominio nuevo",domainOption1:"ejemplo.test",terms:true,accuracy:true,ghlPreparationAuthorization:true};
  const patch=questionnairePatch(values,questions);
  assert.deepEqual(patch.mainService,["Otro"]);assert.equal(patch.mainServiceOther,"Creative direction");
  assert.deepEqual(patch.toolsToConnect,["Google Calendar"]);assert.deepEqual(patch.emailAutomations,["Confirmación de cita"]);assert.deepEqual(patch.leadFields,["Nombre","Email"]);
  for(const field of ["priceModel","landingCopyOwner","initialTeamRoles","bookingName","launchDate","approvalOwner","domainOption1"])assert.equal(patch[field],values[field]);
  for(const field of manualConfirmations)assert.ok(!Object.hasOwn(patch,field));
});
test("turning off a channel removes its stale conditional settings",()=>{
  const values={whatsappSetup:"No",callingSetup:"No",whatsappBusinessAccount:"Cuenta activa",callingNumberChoice:"Comprar número",callRecording:"Sí, cuando sea legal y esté informado",callRecordingNotice:"Informaremos",adPlatforms:["No gestionamos anuncios"],metaAdsAccess:"Acceso enviado",landingVslChoice:"No",landingVslUrl:"https://example.com/video"};
  const patch=questionnairePatch(values);
  for(const field of ["whatsappBusinessAccount","callingNumberChoice","callRecording","callRecordingNotice","metaAdsAccess","landingVslUrl"])assert.equal(patch[field],"");
  const question=questionnaire.find(q=>q.field==="callRecordingNotice");assert.equal(matchesCondition(question.when,values),false);
});
test("country changes do not transfer regions from an old country",()=>{
  const patch=questionnairePatch({targetCountries:["Portugal"],targetRegions:["Comunidad de Madrid","Algarve"],targetRegionsOther:"old custom"});
  assert.deepEqual(patch.targetRegions,["Algarve"]);assert.equal(patch.targetRegionsOther,"");
});
test("unset preferences remain pending, with conditional questions separated from completion",()=>{
  const coverage=questionnaireCoverage(completeQuestionnaire(),{});
  assert.ok(coverage.every(section=>section.answered===0));
  assert.ok(coverage.reduce((sum,s)=>sum+s.total,0)<89);
  const patch=questionnairePatch({});assert.ok(!patch.targetCity);assert.ok(!patch.monthlyCapacity);assert.ok(!patch.workflowAutomations);
});
test("removed legal identity and team-size fields are never reintroduced by AI",()=>{
  const questions=completeQuestionnaire([{field:"legalName",options:["Invented"]},{field:"teamSize",options:["10"]}]);
  assert.ok(!questions.some(q=>/^(legal|billing|teamSize)/.test(q.field)));
});
test("final confirmations stay in the original step and remain human choices",async()=>{
  const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
  assert.match(page,/goToStep\(patch\.assistantQuestionnaireVersion \? 5 : 0\)/);
  for(const field of manualConfirmations)assert.match(page,new RegExp(`setValue\\("${field}", e.target.checked\\)`));
});

 test("returning to the assistant preserves the same company's manual answers without sharing accounts",()=>{
  const current={website:"https://example.com/",bookingName:"Primera reunión",emailAutomations:["Confirmación de cita"],terms:true,legalName:"Omitir"};
  const same=seedQuestionnaireAnswers(current,"https://example.com",{bookingName:"Reunión editada"});
  assert.equal(same.bookingName,"Reunión editada");assert.deepEqual(same.emailAutomations,["Confirmación de cita"]);assert.ok(!Object.hasOwn(same,"terms"));assert.ok(!Object.hasOwn(same,"legalName"));
  assert.deepEqual(seedQuestionnaireAnswers(current,"https://other.example/",{bookingName:"Otra empresa"}),{bookingName:"Otra empresa"});
});
