// All configuration remains available. The quick review asks only for an
// interlocutor and offers optional commercial details, never account access.
export const quickContactFields = ["contactName", "contactEmail"];
export const quickCommercialFields = ["ticket", "minimumBudget", "monthlyCapacity"];
export const quickFields = [...quickContactFields, ...quickCommercialFields];
export const onboardingDraftKey=hostname=>["localhost","127.0.0.1"].includes(hostname)?"focus-productora-review-draft":"focus-productora-draft";
// Initial questions are generated in Spanish. A website's language does not
// translate them; preserve a language explicitly chosen in the question editor.
export const customerQuestionLanguage=values=>String(values.leadQuestionLanguage||"Español");

export function customerPatch(patch) {
  const result = { ...patch };
  result.leadQuestionLanguage=customerQuestionLanguage(result);
  if (!String(result.contactEmail || "").trim()) result.contactEmail = result.businessEmail || "";
  // The single contact is reused only where no different person was supplied.
  if (!String(result.ownerName || "").trim() && result.contactName) result.ownerName = result.contactName;
  return result;
}

export function customerError() {
  return "No hemos podido preparar tu configuración. Tu avance sigue guardado. Inténtalo de nuevo o continúa manualmente.";
}
