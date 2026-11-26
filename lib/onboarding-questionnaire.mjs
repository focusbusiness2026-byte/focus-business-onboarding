import catalog from "./onboarding-questions.json" with {type:"json"};

/** @typedef {string|string[]|boolean} Answer */
/** @typedef {{field?:string,values?:string[],notValues?:string[],someNot?:string[],answered?:boolean,any?:Condition[]}} Condition */
/** @typedef {{field:string,section:number,question:string,type:string,options:string[],otherField?:string,otherLabel?:string,placeholder?:string,hint?:string,inputType?:string,maxSelections?:number,dynamicOptions?:string,when?:Condition}} Question */
/** @type {Question[]} */
export const questionnaire=catalog.questions;
export const questionnaireSections=catalog.sections;
export const reviewCoveredFields=catalog.reviewCoveredFields;
export const manualConfirmations=catalog.manualConfirmations;
export const questionnaireVersion=catalog.version;
const textStored=new Set(["decisionMaker","minimumBudget","contactRole","schedule","radarGoal"]);
export const selectedValues=value=>Array.isArray(value)?value.map(String):typeof value==="string"&&value.trim()?[value]:[];
const pending=value=>/^(?:pendiente(?: de definir| de decidir)?|no lo s[eé]|definir despu[eé]s)$/i.test(String(value).trim());
const other=value=>/^Otr[oa]\b/i.test(String(value));

/** Preserve the current company's manual draft; never import another company's answers. */
export function seedQuestionnaireAnswers(currentData,website,saved={}) {
  const identity=value=>{try{const url=new URL(String(value));return url.origin.toLowerCase()+url.pathname.replace(/\/$/,"");}catch{return "";}};
  const current=identity(currentData.website),target=identity(website);
  if(!current||current!==target)return {...saved};
  const fields=new Set(questionnaire.flatMap(q=>[q.field,q.otherField].filter(Boolean)));
  return {...Object.fromEntries(Object.entries(currentData).filter(([field,value])=>fields.has(field)&&(typeof value==="string"||Array.isArray(value)))),...saved};
}

/** @param {Condition|undefined} condition @param {Record<string,Answer>} values */
export function matchesCondition(condition,values,visited=new Set()) {
  if(!condition)return true;
  if(condition.any)return condition.any.some(item=>matchesCondition(item,values));
  const parent=questionnaire.find(question=>question.field===condition.field);
  if(parent?.when&&!visited.has(parent.field)){const next=new Set(visited);next.add(parent.field);if(!matchesCondition(parent.when,values,next))return false;}
  const selected=selectedValues(values[condition.field||""]);
  if(condition.answered&&!selected.length)return false;
  if(condition.values&&!selected.some(value=>condition.values.includes(value)))return false;
  if(condition.notValues&&(!selected.length||selected.some(value=>condition.notValues.includes(value))))return false;
  if(condition.someNot&&!selected.some(value=>!condition.someNot.includes(value)))return false;
  return true;
}

/** AI adapts a known question; it cannot drop any field from the original form. */
export function completeQuestionnaire(adaptations=[]) {
  const byField=new Map(adaptations.filter(q=>q&&typeof q.field==="string").map(q=>[q.field,q]));
  return questionnaire.map(question=>{
    const adaptation=byField.get(question.field);
    // Preserve the form's vocabulary. Custom services can be stored through its existing Otro field.
    const extra=["mainService","services"].includes(question.field)&&Array.isArray(adaptation?.options)?adaptation.options.filter(option=>typeof option==="string"&&!pending(option)&&option.length<160):[];
    return {...question,options:[...new Set([...question.options,...extra])]};
  });
}

/** @param {Question} question @param {Record<string,Answer>} values */
export function questionOptions(question,values) {
  if(question.dynamicOptions!=="regions")return question.options;
  return [...new Set([...selectedValues(values.targetCountries).flatMap(country=>catalog.regionsByCountry[country]||[]),"Otro"])];
}

/** @param {Question} question @param {Record<string,Answer>} values */
export function hasQuestionAnswer(question,values) {
  const selected=selectedValues(values[question.field]).filter(value=>value.trim()&&!pending(value));
  if(!selected.length)return false;
  if(question.otherField&&selected.every(other)&&!String(values[question.otherField]||"").trim())return false;
  return true;
}

/** @param {Question[]} questions @param {Record<string,Answer>} values */
export function questionnaireCoverage(questions,values) {
  return questionnaireSections.map(section=>{
    const visible=questions.filter(q=>q.section===section.id&&matchesCondition(q.when,values));
    const answered=visible.filter(q=>hasQuestionAnswer(q,values)).length;
    return {...section,total:visible.length,answered,pending:visible.length-answered};
  });
}

/** Normalize every answer into the existing form, including arrays and conditional resets. */
export function questionnairePatch(values,questions=completeQuestionnaire()) {
  const patch={};
  for(const question of questions) {
    const {field,otherField}=question;
    if(!matchesCondition(question.when,values)) {
      patch[field]=question.type==="multi"?[]:"";
      if(otherField)patch[otherField]="";
      continue;
    }
    if(!Object.hasOwn(values,field)&&!(otherField&&Object.hasOwn(values,otherField)))continue;
    const raw=selectedValues(values[field]).filter(value=>!pending(value));
    const detail=String(values[otherField||""]||"").trim();
    if(question.type==="multi") {
      const listed=questionOptions(questionnaire.find(item=>item.field===field)||question,values);
      const custom=otherField&&question.dynamicOptions!=="regions"?raw.filter(value=>!listed.includes(value)&&!other(value)):[];
      const known=raw.filter(value=>(!otherField||listed.includes(value))&&!other(value));
      const extra=[...custom,...(raw.some(other)&&detail?[detail]:[])];
      patch[field]=[...new Set([...known,...(extra.length?["Otro"]:[])])].slice(0,question.maxSelections||50);
      if(otherField)patch[otherField]=extra.join(", ");
    } else {
      const value=raw[0]||"";
      patch[field]=textStored.has(field)&&other(value)?detail:value;
      if(otherField)patch[otherField]=other(value)?detail:"";
    }
  }
  // Regions must remain inside the selected countries; explicit custom regions use Otro.
  if(Array.isArray(patch.targetRegions)){
    const valid=new Set(selectedValues(patch.targetCountries).flatMap(country=>catalog.regionsByCountry[country]||[]));
    patch.targetRegions=patch.targetRegions.filter(region=>region==="Otro"||valid.has(region));
    if(!patch.targetRegions.includes("Otro"))patch.targetRegionsOther="";
  }
  if(values.subdomainSetup!=="Dominio nuevo")for(const field of ["domainOption1Status","domainOption2Status","domainOption3Status"])patch[field]="";
  return patch;
}
