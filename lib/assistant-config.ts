export type AssistantValues = Record<string, string>;
export type SocialProfile = { network: string; url: string; customName?: string };
export type ServicePrice = { service: string; amount: string; currency: string; basis: string; sourceUrl?: string };
export const activityOptions = ["Productora audiovisual", "Estudio creativo y digital", "Agencia creativa", "Estudio de animación y motion", "Estudio de fotografía", "Eventos y streaming", "Otro"];
export const languageOptions = ["Español", "Inglés", "Catalán", "Portugués", "Francés", "Alemán", "Italiano", "Otro"];
export const networks = ["Instagram", "LinkedIn", "Facebook", "TikTok", "YouTube", "Vimeo", "Behance", "X", "Otra"];
export const reviewGroups = ["company", "contact", "languages", "social", "brand", "prices"] as const;
export type ReviewGroup = typeof reviewGroups[number];
export function jsonList<T>(raw: unknown): T[] { try { const parsed=JSON.parse(String(raw || "[]")); return Array.isArray(parsed) ? parsed.filter(item=>typeof item==="string" || (item && typeof item==="object" && !Array.isArray(item))) : []; } catch { return []; } }
export function parseSocialProfiles(raw: string): SocialProfile[] {
  const urls = [...new Set((raw.match(/https?:\/\/[^\s;,<>]+/g) || []).map(u=>u.replace(/[).]+$/, "")))];
  return urls.flatMap(url=>{try{const host=new URL(url).hostname.toLowerCase();const network=/instagram/.test(host)?"Instagram":/linkedin/.test(host)?"LinkedIn":/facebook|fb\./.test(host)?"Facebook":/tiktok/.test(host)?"TikTok":/youtu/.test(host)?"YouTube":/vimeo/.test(host)?"Vimeo":/behance/.test(host)?"Behance":/(^|\.)(x|twitter)\.com$/.test(host)?"X":"Otra";return [{network,url}];}catch{return [];}}).sort((a,b)=>networks.indexOf(a.network)-networks.indexOf(b.network));
}
export function normalizeReviewValues(raw: AssistantValues): AssistantValues {
  const next={...raw};
  next.websiteLanguage=next.websiteLanguage || next.primaryLanguage || "";
  for(const key of ["legalName","legalAddress","legalCity","legalCountry","billingLegalName","billingTaxId","billingAddress","billingEmail"]) delete next[key];
  if(!activityOptions.includes(next.activity)) { next.activityOther=next.activityOther || next.activity;next.activity="Otro"; }
  if(/estudio (?:digital|creativo)|digital studio|creative studio/i.test(next.description || "") && (!next.activityOther || next.activity==="Productora audiovisual") && ["Otro","Productora audiovisual"].includes(next.activity)) next.activity="Estudio creativo y digital";
  next.socialProfiles=JSON.stringify(next.socialProfiles ? jsonList<SocialProfile>(next.socialProfiles).filter(p=>typeof p.network==="string"&&typeof p.url==="string").sort((a,b)=>(networks.indexOf(a.network)<0?99:networks.indexOf(a.network))-(networks.indexOf(b.network)<0?99:networks.indexOf(b.network))) : parseSocialProfiles(next.companySocialLinks || ""));
  if(!next.communicationLanguages) {
    const detected=next.primaryLanguage || "Español";
    next.communicationLanguages=JSON.stringify([...new Set([detected,...(/madrid|barcelona|spain|españa/i.test(next.location || "") && detected!=="Español" ? ["Español"] : [])])]);
  }
  next.communicationLanguages=JSON.stringify(jsonList<string>(next.communicationLanguages).filter(l=>typeof l==="string"));
  next.servicePrices=JSON.stringify(jsonList<ServicePrice>(next.servicePrices).filter(p=>[p.service,p.amount,p.currency,p.basis].every(v=>typeof v==="string")));
  return next;
}
export function serializeSocialProfiles(profiles: SocialProfile[]) { return profiles.filter(p=>p.url.trim()).map(p=>`${p.network==="Otra"&&p.customName?p.customName:p.network}: ${p.url.trim()}`).join("\n"); }
export function normalizePatch(values: AssistantValues) {
  const languages=[...new Set([...jsonList<string>(values.communicationLanguages).filter(l=>typeof l==="string"),...(values.otherLanguages||"").split(",").map(l=>l.trim()).filter(Boolean)])];
  return {...values, companySocialLinks:serializeSocialProfiles(jsonList<SocialProfile>(values.socialProfiles)), primaryLanguage:values.primaryLanguage || languages[0] || "", additionalLanguages:languages.filter(l=>l!==values.primaryLanguage), servicePrices:values.servicePrices || "[]"};
}
