// All configuration remains available. The quick review asks only for an
// interlocutor and offers optional commercial details, never account access.
export const quickContactFields = ["contactName", "contactEmail"];
export const quickCommercialFields = ["ticket", "minimumBudget", "monthlyCapacity"];
export const quickFields = [...quickContactFields, ...quickCommercialFields];
export const onboardingDraftKey=hostname=>["localhost","127.0.0.1"].includes(hostname)?"focus-productora-review-draft":"focus-productora-draft";

export function customerPatch(patch) {
  const result = { ...patch };
  if (!String(result.contactEmail || "").trim()) result.contactEmail = result.businessEmail || "";
  // The single contact is reused only where no different person was supplied.
  if (!String(result.ownerName || "").trim() && result.contactName) result.ownerName = result.contactName;
  return result;
}

export function customerError() {
  return "No hemos podido preparar tu configuración. Tu avance sigue guardado. Inténtalo de nuevo o continúa manualmente.";
}
