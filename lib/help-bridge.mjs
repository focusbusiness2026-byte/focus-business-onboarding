const productionParents=new Set(["https://prospeccion.focusbusinesslab.es","https://focus-prospeccion-fb.onrender.com"]);
export const trustedProspectionParent=origin=>productionParents.has(origin)||/^http:\/\/(?:localhost|127\.0\.0\.1):8133$/.test(origin);
