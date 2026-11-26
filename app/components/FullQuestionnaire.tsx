"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {completeQuestionnaire,questionnaireSections,questionnaireCoverage,questionOptions,matchesCondition,selectedValues,hasQuestionAnswer} from "../../lib/onboarding-questionnaire.mjs";
import {pendingOptionsContext,fallbackPendingOptions,normalizePendingOptions,pendingOptionReason} from "../../lib/pending-options.mjs";
import type {StepPlan} from "./SixStepPlan";
import {quickFields,quickCommercialFields} from "../../lib/customer-journey.mjs";
export type PendingOption=ReturnType<typeof normalizePendingOptions>;

type Values=Record<string,string|string[]|boolean>;
type Question=ReturnType<typeof completeQuestionnaire>[number];
export default function FullQuestionnaire({adaptations,plans=[],reviewed=[],onReview,context={},pendingOptions=[],pendingOptionsContext:optionsContext="",onOptions,values,section,onSection,onChange,onBack,onFinish,onQuickFinish,initialAdvanced=false}:{adaptations:unknown[];plans?:StepPlan[];reviewed?:string[];onReview?:(section:number)=>void;context?:Record<string,unknown>;pendingOptions?:PendingOption[];pendingOptionsContext?:string;onOptions?:(options:PendingOption[],contextKey:string)=>void;values:Values;section:number;onSection:(section:number)=>void;onChange:(field:string,value:string|string[])=>void;onBack:()=>void;onFinish:()=>void;onQuickFinish?:()=>void;initialAdvanced?:boolean}) {
  const questions=useMemo(()=>completeQuestionnaire(adaptations),[adaptations]);
  const [advanced,setAdvanced]=useState(initialAdvanced);
  const [commercial,setCommercial]=useState(false);
  const [error,setError]=useState("");
  const [optionsError,setOptionsError]=useState("");
  const [optionsLoading,setOptionsLoading]=useState(false);
  const [retryOptions,setRetryOptions]=useState(0);
  const [textChoices,setTextChoices]=useState<Record<string,string>>({});
  const optionsBusy=useRef(false),alive=useRef(true);
  const contextKey=JSON.stringify(pendingOptionsContext({...context,targetCountries:values.targetCountries}));
  const followUps=optionsContext===contextKey?pendingOptions:[];
  const missingKey=JSON.stringify(questions.filter(q=>(advanced||commercial&&quickCommercialFields.includes(q.field))&&matchesCondition(q.when,values)&&!hasQuestionAnswer(q,values)&&!followUps.some(item=>item.field===q.field)).map(q=>q.field));
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{
    const fields=JSON.parse(missingKey) as string[];
    if(!onOptions||!fields.length||optionsBusy.current||optionsError)return;
    optionsBusy.current=true;setOptionsLoading(true);setOptionsError("");
    void fetch("/api/onboarding/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pending_options",context:JSON.parse(contextKey),fields}),signal:AbortSignal.timeout(130000)}).then(async response=>{const result=await response.json() as {ok?:boolean;error?:string;options:PendingOption[]};if(!response.ok||!result.ok)throw new Error(result.error||"No se pudieron preparar las opciones.");if(alive.current)onOptions(result.options,contextKey);}).catch(()=>{if(alive.current)setOptionsError("No se pudieron preparar las opciones. Puedes escribir tu respuesta o continuar.");}).finally(()=>{optionsBusy.current=false;if(alive.current)setOptionsLoading(false);});
  },[missingKey,contextKey,retryOptions,onOptions,optionsLoading,optionsError]);
  const coverage=questionnaireCoverage(questions,values),current=coverage[section];
  const visible=questions.filter(question=>matchesCondition(question.when,values)&&(advanced?question.section===section:quickFields.includes(question.field)&&(!quickCommercialFields.includes(question.field)||commercial)));
  function change(field:string,value:string|string[]){
    setError("");onChange(field,value);
    if(field==="targetCountries"){
      const regionQuestion=questions.find(q=>q.field==="targetRegions");
      const valid=regionQuestion?questionOptions(regionQuestion,{...values,targetCountries:value}):[];
      const regions=selectedValues(values.targetRegions).filter(region=>valid.includes(region));onChange("targetRegions",regions);
      if(!regions.includes("Otro"))onChange("targetRegionsOther","");
    }
  }
  function update(question:Question,value:string){
    change(question.field,value);
    if(question.otherField&&!/^Otr[oa]\b/i.test(value))onChange(question.otherField,"");
  }
  function next(){
    if(!advanced&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.contactEmail||""))){setError("Indica un correo de contacto válido para recibir tu acceso.");return;}
    const missing=visible.find(q=>q.otherField&&selectedValues(values[q.field]).some(value=>/^Otr[oa]\b/i.test(value)&&!/pendiente/i.test(value))&&!String(values[q.otherField]||"").trim());
    if(missing){setError(`Especifica la otra opción en «${missing.question}» o deja esa pregunta pendiente.`);return;}
    onReview?.(section);
    if(!advanced)(onQuickFinish||onFinish)();else if(section<questionnaireSections.length-1)onSection(section+1);else onFinish();
  }
  return <div className="full-questionnaire">
    <p className="assistant-intro">{advanced?"Puedes ajustar cualquier detalle. Lo que no sepas ahora lo coordinaremos contigo.":"Indícanos con quién hablaremos. El resto de la configuración ya está preparado y podrás ajustarlo cuando quieras."}</p>
    <button type="button" className="assistant-link" onClick={()=>setAdvanced(value=>!value)}>{advanced?"Volver a la revisión rápida":"Personalizar los seis pasos"}</button>
    {advanced&&<><nav className="questionnaire-sections" aria-label="Bloques del cuestionario completo">{coverage.map(item=><button type="button" key={item.id} aria-current={section===item.id?"step":undefined} onClick={()=>{setError("");onSection(item.id);}}><span>{item.id+1}. {item.title}</span><small>{reviewed.includes(`step-${item.id}`)?"Revisado":"Personalizar"}</small></button>)}</nav><h3>{current.title}</h3><p className="config-hint">{current.description}</p></>}
    {optionsLoading&&advanced&&<p className="config-hint" role="status">Preparando opciones…</p>}
    {optionsError&&<p className="notice error" role="alert">{optionsError} <button type="button" className="assistant-link" onClick={()=>{setOptionsError("");setRetryOptions(value=>value+1);}}>Reintentar opciones</button></p>}
    {visible.map(question=>{
      const raw=values[question.field],selected=selectedValues(raw),options=questionOptions(question,values),value=typeof raw==="string"?raw:"";
      const showOther=question.otherField&&selected.some(value=>/^Otr[oa]\b/i.test(value));
      const decision=plans.find(plan=>plan.section===section)?.decisions.find(item=>item.field===question.field);
      const sameProposal=decision&&selected.length===decision.values.length&&selected.every(item=>decision.values.includes(item));
      const followUp=followUps.find(item=>item.field===question.field);
      const choices=followUp?.options||fallbackPendingOptions(question);
      const suggestions=followUp?choices.filter(option=>option.mode==="value"&&options.includes(option.value)):[];
      const otherOptions=options.filter(option=>!suggestions.some(item=>item.value===option));
      const choiceId=(option:typeof choices[number])=>JSON.stringify(option);
      return <section className="questionnaire-question" key={question.field} data-question-field={question.field}>
        {advanced&&decision&&sameProposal&&decision.status==="suggested"&&<p className="plan-field-note suggested"><strong>Sugerido · puedes cambiarlo</strong></p>}
        {advanced&&followUp&&<p className="config-hint">{pendingOptionReason(followUp.reason)}</p>}
        {question.type==="text"&&(!selected.length||followUp)&&(advanced||!/[Nn]ame|[Ee]mail/.test(question.field))&&<label className="config-control"><span>Opciones para {question.question}</span><select value={textChoices[question.field]||(value?"__manual__":"")} onChange={event=>{const id=event.target.value;setTextChoices(previous=>({...previous,[question.field]:id}));const choice=choices.find(option=>choiceId(option)===id);if(choice?.mode==="value")change(question.field,choice.value);else if(choice?.mode==="later")change(question.field,"");}}><option value="">Elegir una opción (opcional)</option><option value="__manual__">Escribir mi respuesta</option>{choices.map(option=><option key={choiceId(option)} value={choiceId(option)}>{option.label}</option>)}</select></label>}
        <label className="config-control"><span>{!advanced&&question.field==="contactName"?"Nombre de contacto (opcional)":!advanced&&question.field==="contactEmail"?"Correo para recibir tu acceso":question.question}</span>
          {question.type==="multi"?<select value="" aria-label={`Añadir opción: ${question.question}`} onChange={event=>{const option=event.target.value;if(option&&!selected.includes(option))change(question.field,[...selected,option]);}}><option value="">Selecciona una o varias opciones…</option>{suggestions.length>0&&<optgroup label={`Sugeridas para ${String(context.companyName||"tu empresa")}`}>{suggestions.map(option=><option key={option.value} value={option.value} disabled={selected.includes(option.value)||Boolean(question.maxSelections&&selected.length>=question.maxSelections)}>{option.label}</option>)}</optgroup>}{otherOptions.map(option=><option key={option} value={option} disabled={selected.includes(option)||Boolean(question.maxSelections&&selected.length>=question.maxSelections)}>{option}</option>)}</select>
            :question.type==="single"?<select value={value} onChange={event=>update(question,event.target.value)}><option value="">Pendiente de confirmar</option>{suggestions.length>0&&<optgroup label={`Sugeridas para ${String(context.companyName||"tu empresa")}`}>{suggestions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>}{[...new Set([...(value&&!options.includes(value)?[value]:[]),...otherOptions])].map(option=><option key={option}>{option}</option>)}</select>
            :question.inputType==="textarea"?<textarea rows={3} value={value} placeholder={question.placeholder} onChange={event=>{setTextChoices(previous=>({...previous,[question.field]:"__manual__"}));change(question.field,event.target.value);}} />
            :<input type={["email","url","tel"].includes(question.inputType||"")?question.inputType:"text"} autoComplete={/Name$/.test(question.field)?"name":/Email$/.test(question.field)?"email":/Number$/.test(question.field)?"tel":"on"} list={question.inputType==="font"?`fonts-${question.field}`:undefined} value={value} placeholder={question.placeholder} onChange={event=>{setTextChoices(previous=>({...previous,[question.field]:"__manual__"}));change(question.field,event.target.value);}} />}
        </label>
        {question.inputType==="font"&&<datalist id={`fonts-${question.field}`}><option>No sé cuál elegir</option>{options.map(font=><option key={font}>{font}</option>)}</datalist>}
        {question.type==="multi"&&<><p className="config-hint">{selected.length?`${selected.length} seleccionadas.`:"Sin preferencias confirmadas."}{question.maxSelections?` Máximo ${question.maxSelections}.`:" Puedes añadir varias."}</p><div className="questionnaire-selected">{selected.map(option=><button type="button" className="secondary" key={option} aria-label={`Quitar ${option} de ${question.question}`} onClick={()=>{const next=selected.filter(value=>value!==option);change(question.field,next);if(question.otherField&&/^Otr[oa]\b/i.test(option))onChange(question.otherField,"");}}>{option}<span aria-hidden="true"> ×</span></button>)}</div></>}
        {showOther&&<label className="config-control"><span>{question.otherLabel||"Especifica la otra opción"}</span><input value={String(values[question.otherField!]||"")} onChange={event=>change(question.otherField!,event.target.value)} /></label>}
        {question.hint&&<p className="config-hint">{question.hint}</p>}
        {question.dynamicOptions==="regions"&&!selectedValues(values.targetCountries).length&&<p className="config-hint">Elige los países objetivo para ver sus regiones, o utiliza Otro.</p>}
      </section>;
    })}
    {!advanced&&<button type="button" className="assistant-link" aria-expanded={commercial} onClick={()=>setCommercial(value=>!value)}>{commercial?"Ocultar preferencias comerciales":"Añadir precios y capacidad (opcional)"}</button>}
    {advanced&&section===5&&<p className="purpose-note">Antes de terminar, revisarás y aceptarás las confirmaciones finales.</p>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    <div className="assistant-actions"><button className="secondary" type="button" onClick={()=>advanced&&section?onSection(section-1):onBack()}>Anterior</button><button className="primary" type="button" onClick={next}>{!advanced||section===5?"Continuar":"Guardar y continuar"}</button></div>
  </div>;
}

