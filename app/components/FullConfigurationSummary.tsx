"use client";
import {completeQuestionnaire,questionnaireCoverage,matchesCondition,hasQuestionAnswer} from "../../lib/onboarding-questionnaire.mjs";
import {stepTitles} from "../../lib/onboarding-plan.mjs";
import {jsonList,type ServicePrice} from "../../lib/assistant-config";
export default function FullConfigurationSummary({values,onEdit}:{values:Record<string,string|string[]|boolean>;onEdit:(section:number)=>void}){
  const questions=completeQuestionnaire(),coverage=questionnaireCoverage(questions,values);
  return <section aria-label="Revisión completa de los seis pasos" className="questionnaire-review">
    <h2>Revisa la configuración de los seis pasos</h2>
    <p className="config-hint">Comprueba tu ficha. Los detalles adicionales y los accesos los coordinaremos contigo antes de poner los servicios en marcha.</p>
    {coverage.map(section=><details key={section.id} className="assistant-details"><summary>Paso {section.id+1} · {stepTitles[section.id]}</summary>
      <button type="button" className="assistant-link" onClick={()=>onEdit(section.id)}>Editar paso {section.id+1}</button>
      <dl className="assistant-answer-summary">{questions.filter(q=>q.section===section.id&&matchesCondition(q.when,values)).map(q=><div key={q.field}><dt>{q.question}</dt><dd>{hasQuestionAnswer(q,values)?Array.isArray(values[q.field])?(values[q.field] as string[]).join(", "):String(values[q.field]):"Lo coordinaremos contigo"}{q.otherField&&values[q.otherField]?` · ${values[q.otherField]}`:""}</dd></div>)}</dl>
      {section.id===1&&<div><h3>Precios relevantes</h3>{jsonList<ServicePrice>(values.servicePrices).length?jsonList<ServicePrice>(values.servicePrices).map((price,index)=><p key={index}>{price.service}: {price.amount} {price.currency} · {price.basis}</p>):<p>Pendientes de confirmar con la empresa.</p>}</div>}
    </details>)}
  </section>;
}
