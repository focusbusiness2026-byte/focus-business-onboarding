import {questionnaire,questionnaireSections,questionOptions,selectedValues} from "./onboarding-questionnaire.mjs";

// These facts require the company's own answer, even when a website mentions a person or tool.
const privateFacts=new Set(["ownerName","driveAssetsUrl","contactName","contactRole","initialTeamRoles","launchDate","approvalOwner","monthlyCapacity","toolsInUse","salesCycle","whatsappBusinessAccount","whatsappDisplayNumber","whatsappCostAcceptance","callingNumberChoice","callingDisplayNumber","callRecording","callRecordingNotice","existingDomainAccess","existingDomainMeeting","adAccess","adMeeting","metaBusinessAccess","metaPageAccess","metaAdsAccess","metaPaymentStatus","ticket","minimumBudget"]);
const publicFacts=new Set(["portfolioHighlights","contactEmail"]);
const optionalFacts=new Set(["landingVslUrl","domainOption1","domainOption2","domainOption3","existingDomainName"]);
export const proposalFields=questionnaire.filter(q=>!privateFacts.has(q.field)&&!publicFacts.has(q.field)&&!optionalFacts.has(q.field)).map(q=>q.field);
export const pendingFields=[...privateFacts];
const unsafe=value=>/\bsk-[a-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:api[_ -]?key|access[_ -]?token|password|contrase(?:ña|na))\s*[:=]\s*\S+/i.test(value);
const normalized=value=>String(value||"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
export const stepTitles=["Empresa y marca","Oferta y cliente ideal","Captación y proceso comercial","Equipo, agenda y dominios","Automatización e integraciones","Revisión y lanzamiento"];
export function decodeStepPlans(value){
  if(Array.isArray(value))return value;
  if(!value||typeof value!=="object")return [];
  return Object.entries(value).map(([section,plan])=>({section:Number(section),summary:plan?.summary,decisions:plan?.decisions&&typeof plan.decisions==="object"&&!Array.isArray(plan.decisions)?Object.entries(plan.decisions).map(([field,decision])=>({...decision,field})):[]}));
}

/** Produce one decision for every catalog field, regardless of how many the model returned. */
export function normalizeStepPlans(plans=[],pages=[],questions=questionnaire) {
  plans=decodeStepPlans(plans);
  const sources=new Map(pages.map(page=>[page.url,normalized(page.text)]));
  const candidates=new Map();
  for(const plan of Array.isArray(plans)?plans:[])for(const decision of Array.isArray(plan?.decisions)?plan.decisions:[]){
    const question=questions.find(q=>q.field===decision?.field&&q.section===plan.section);
    if(question&&!candidates.has(question.field))candidates.set(question.field,decision);
  }
  const accepted={};
  const decisions=new Map();
  for(const question of questions){
    const raw=candidates.get(question.field);
    let values=Array.isArray(raw?.values)?raw.values.filter(value=>typeof value==="string"&&value.trim()&&!unsafe(value)).map(value=>value.trim().slice(0,3000)):[];
    let status=["found","suggested"].includes(raw?.status)?raw.status:"pending";
    let reason=typeof raw?.reason==="string"&&!unsafe(raw.reason)?raw.reason.slice(0,550):"Necesitamos tu criterio para completar este dato.";
    let sourceUrl=sources.has(raw?.sourceUrl)?raw.sourceUrl:"";
    let otherValue=typeof raw?.otherValue==="string"&&!unsafe(raw.otherValue)?raw.otherValue.trim().slice(0,1000):"";
    if(question.type!=="multi")values=values.slice(0,1);
    if(privateFacts.has(question.field)){
      values=[];otherValue="";status="pending";sourceUrl="";
      reason="Este dato es interno de tu empresa. Confírmalo personalmente; no se deduce de la web.";
    }
    if(status==="found"&&(!publicFacts.has(question.field)||!sourceUrl||!values.every(value=>sources.get(sourceUrl).includes(normalized(value)))))status="suggested";
    if(status==="pending")values=[];
    if(["single","multi"].includes(question.type)){
      // Regions are validated after countries; custom services use the existing Otro mapping.
      if(question.dynamicOptions!=="regions")values=values.filter(value=>question.options.includes(value));
      if(question.maxSelections)values=values.slice(0,question.maxSelections);
      if(question.otherField&&values.some(value=>/^Otr[oa]\b/i.test(value))&&!otherValue)values=values.filter(value=>!/^Otr[oa]\b/i.test(value));
    }
    if(question.field==="contactEmail"&&values.some(value=>!/^\S+@\S+\.\S+$/.test(value)||!sourceUrl||!sources.get(sourceUrl).includes(normalized(value)))){values=[];status="pending";}
    if(question.field==="desiredDomain"&&values.some(value=>!/^[a-z0-9][a-z0-9-]*\.focusbusinesslab\.es$/i.test(value))){values=[];status="pending";}
    if(question.field==="adPlatforms"&&values.length>1)values=values.filter(value=>value!=="No gestionamos anuncios");
    if(!values.length)status="pending";
    accepted[question.field]=question.type==="multi"?values:values[0]||"";
    decisions.set(question.field,{field:question.field,values,status,reason,sourceUrl,otherValue});
  }
  for(const question of questions.filter(q=>q.dynamicOptions==="regions")){
    const decision=decisions.get(question.field),allowed=questionOptions(question,accepted);
    decision.values=decision.values.filter(value=>allowed.includes(value));
    if(!decision.values.length)decision.status="pending";
  }
  return questionnaireSections.map(section=>{
    const model=(Array.isArray(plans)?plans:[]).find(plan=>plan.section===section.id);
    return {section:section.id,title:stepTitles[section.id],summary:typeof model?.summary==="string"&&!unsafe(model.summary)?model.summary.slice(0,1000):section.description,decisions:questions.filter(q=>q.section===section.id).map(q=>decisions.get(q.field))};
  });
}

/** Blank pending answers deliberately, so an explicit reset cannot retain stale demo data. */
export function stepPlanAnswers(plans=[]) {
  const byField=new Map(plans.flatMap(plan=>plan.decisions||[]).map(decision=>[decision.field,decision]));
  /** @type {Record<string,string|string[]>} */
  const result={};
  for(const question of questionnaire){
    const decision=byField.get(question.field),values=decision?.status!=="pending"?selectedValues(decision?.values):[];
    result[question.field]=question.type==="multi"?values:values[0]||"";
    if(question.otherField)result[question.otherField]=decision?.otherValue||"";
  }
  return result;
}
