import {questionOptions} from "./onboarding-questionnaire.mjs";
const unsafe=value=>/\bsk-[a-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:api[_ -]?key|access[_ -]?token|password|contrase(?:ña|na))\s*[:=]\s*\S+/i.test(String(value));
const publicKeys=["companyName","website","activity","description","location","servicesOther","businessEmail","contactPhone","targetCountries"];
export function pendingOptionReason(raw){
  const text=typeof raw==="string"&&!unsafe(raw)?raw.slice(0,600):"";
  return !text||/\bclientes?\s+(?:como|tales como|entre ellos)\b|\b(?:el sitio|la web)\s+(?:muestra|indica|tiene|publica|presenta)|según (?:el sitio|la web)/i.test(text)?"Elige la opción que encaje con tu negocio o completa el dato real. Las opciones no confirman información interna.":text;
}
export function pendingOptionsContext(raw={}){
  return Object.fromEntries(publicKeys.flatMap(key=>{
    const value=raw[key];
    if(Array.isArray(value))return [[key,value.filter(v=>typeof v==="string"&&!unsafe(v)).slice(0,20).map(v=>v.slice(0,200))]];
    return typeof value==="string"&&!unsafe(value)?[[key,value.slice(0,1800)]]:[];
  }));
}
export function fallbackPendingOptions(question){
  return question.type==="text"?[
    {label:"Indicar este dato ahora",value:"",mode:"write"},
    {label:"Lo confirmaré con mi equipo",value:"",mode:"later"}
  ]:[...question.options.slice(0,3).map(value=>({label:value,value,mode:"value"})),{label:"Lo confirmaré más adelante",value:"",mode:"later"}];
}
export function normalizePendingOptions(question,raw,context={}){
  const personal=new Set(["ownerName","contactName","approvalOwner"]);
  const urls=new Set(["driveAssetsUrl","landingVslUrl"]);
  const options=[],known=questionOptions(question,context);
  for(const option of Array.isArray(raw?.options)?raw.options:[]){
    if(!option||typeof option.label!=="string"||!option.label.trim()||unsafe(option.label)||typeof option.value!=="string"||unsafe(option.value)||!["value","write","later"].includes(option.mode))continue;
    const label=option.label.trim().slice(0,200),value=option.value.trim().slice(0,1500),mode=option.mode;
    if(mode==="value"){
      if(!value||personal.has(question.field)||urls.has(question.field))continue;
      if(question.type!=="text"&&!known.includes(value))continue;
      if(question.field==="contactEmail"&&value!==context.businessEmail)continue;
      if(["whatsappDisplayNumber","callingDisplayNumber"].includes(question.field)&&(!context.contactPhone||value.replace(/\D/g,"")!==String(context.contactPhone).replace(/\D/g,"")))continue;
    }
    if(mode==="write"&&question.type!=="text")continue;
    if(!options.some(item=>item.label===label))options.push({label,value:mode==="value"?value:"",mode});
    if(options.length===5)break;
  }
  if(question.type==="text"&&!options.some(option=>option.mode==="write"))options.push(fallbackPendingOptions(question)[0]);
  if(!options.some(option=>option.mode==="later"))options.push({label:"Lo confirmaré más adelante",value:"",mode:"later"});
  if(!options.some(option=>option.mode!=="later"))options.unshift(...fallbackPendingOptions(question).filter(option=>option.mode!=="later"));
  const safe=text=>typeof text==="string"&&!unsafe(text)?text.slice(0,600):"";
  return {field:question.field,question:safe(raw?.question)||question.question,reason:pendingOptionReason(raw?.reason),options};
}
