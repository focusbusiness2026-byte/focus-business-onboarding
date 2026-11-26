"use client";

import {normalizeStepPlans} from "../../lib/onboarding-plan.mjs";

export type StepPlan=ReturnType<typeof normalizeStepPlans>[number];
export default function SixStepPlan({plans,reviewed,onReview,onReset,onUndo}:{plans:StepPlan[];values:Record<string,string|string[]|boolean>;reviewed:string[];onReview:(section:number)=>void;onReset?:()=>void;onUndo?:()=>void}){
  return <section className="six-step-plan" aria-label="Análisis de los seis pasos">
    <h3>Los seis pasos de tu configuración</h3>
    <p className="config-hint">La propuesta prepara el formulario completo. Puedes editarla y aprobar cada paso. Los datos internos y las autorizaciones necesitan tu confirmación.</p>
    <div className="six-step-plan-list">{plans.map(plan=>{
      return <section className="six-step-plan-card" key={plan.section}>
        <div><h4>Paso {plan.section+1} · {plan.title}</h4><span>{reviewed.includes(`step-${plan.section}`)?"Revisado":"Preparado para revisar"}</span></div>
        <p>{plan.summary}</p>
        <button type="button" className="secondary" onClick={()=>onReview(plan.section)}>Revisar paso {plan.section+1}</button>
      </section>;
    })}</div>
    {onReset&&<><p className="config-hint">Conservamos tus respuestas anteriores. Si quieres empezar con las propuestas de este análisis, restablece la configuración sugerida y revisa los datos pendientes.</p><button type="button" className="secondary" onClick={onReset}>Restablecer preferencias sugeridas</button></>}
    {onUndo&&<button type="button" className="assistant-link" onClick={onUndo}>Recuperar mis respuestas anteriores</button>}
  </section>;
}
