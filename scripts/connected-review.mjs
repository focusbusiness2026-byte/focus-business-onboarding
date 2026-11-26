// Explicit, narrowly scoped bridge for the owner's authorized integration test.
// It uses the existing production API (and its D1 authentication store), so an
// emailed access link is tested against the same system that created the token.
export const testCompany="Küro Digital Studio — prueba técnica Focus";
export async function connectedReviewSubmission(input,{env=process.env,call=fetch}={}){
  if(env.FOCUS_CONNECTED_REVIEW!=="true")return null;
  const testEmail=env.FOCUS_CONNECTED_REVIEW_EMAIL;
  const payload=input?.onboarding;
  if(!testEmail||!payload||payload.companyName!==testCompany||payload.contactEmail!==testEmail||payload.businessEmail!==testEmail||String(payload.website||"").trim())return {status:403,body:{ok:false,error:"Esta prueba solo admite la ficha técnica y el correo de Focus autorizados."}};
  const result=await call("https://onboarding.focusbusinesslab.es/api/onboarding",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://onboarding.focusbusinesslab.es"},body:JSON.stringify(input),signal:AbortSignal.timeout(90000),redirect:"error"});
  return {status:result.status,body:await result.json()};
}
