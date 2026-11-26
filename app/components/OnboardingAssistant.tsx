"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback,useEffect, useRef, useState } from "react";
import ConfigurationReview from "./ConfigurationReview";
import LeadQuestionsEditor, { type LeadQuestion } from "./LeadQuestionsEditor";
import ContextHelp, { type HelpUpdate } from "./ContextHelp";
import FullQuestionnaire, {type PendingOption} from "./FullQuestionnaire";
import SixStepPlan, {type StepPlan} from "./SixStepPlan";
import {stepPlanAnswers} from "../../lib/onboarding-plan.mjs";
import {completeQuestionnaire,questionnaireCoverage,matchesCondition,hasQuestionAnswer,questionnairePatch,questionnaireVersion,seedQuestionnaireAnswers} from "../../lib/onboarding-questionnaire.mjs";
import {customerPatch,customerError} from "../../lib/customer-journey.mjs";
import { normalizeReviewValues, normalizePatch, reviewGroups, jsonList } from "../../lib/assistant-config";

type FormState = Record<string, string | string[] | boolean>;
type Field = { key: string; label: string; value: string; status: "found" | "suggested"; evidence: string; sourceUrl: string };
type Question = { field: string; question: string; type: "single" | "multi" | "text"; options: string[] };
type Analysis = { website: string; summary: string; fields: Field[]; questions: Question[]; stepPlans?:StepPlan[];pendingOptions?:PendingOption[];pendingOptionsContext?:string;leadQuestions: LeadQuestion[]; logo?: { url: string; note: string }; priceEntries?: unknown[]; warnings: string[]; sources: string[]; model: string; usage: { inputTokens: number; outputTokens: number } };
type Saved = { analysis: Analysis; values: Record<string, string>; answers: Record<string, string | string[]>; notes: string; approved?: string[] };
const storageKey = (website: string) => `focus-assistant-v1:${new URL(website).host}${new URL(website).pathname.replace(/\/$/, "")}`;
const readSaved = (key: string): Saved | null => { try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value?.analysis?.fields && value?.analysis?.questions ? value : null; } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Review remains usable without browser storage. */ } };

export default function OnboardingAssistant({ onApply, onManual, currentData, onHelpPatch }: { onApply: (patch: FormState) => void; onManual: () => void; currentData: FormState; onHelpPatch: (patch: FormState) => void }) {
  const [open, setOpen] = useState(false);
  const [helpOpen,setHelpOpen]=useState(false);
  const [approved,setApproved]=useState<string[]>([]);
  const [stage, setStage] = useState<"url" | "loading" | "review" | "questions" | "finish">("url");
  const [website, setWebsite] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [answersBeforeProposal,setAnswersBeforeProposal]=useState<Record<string,string|string[]>|null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [advancedQuestions,setAdvancedQuestions]=useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [applied, setApplied] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const receivePendingOptions=useCallback((options:PendingOption[],contextKey:string)=>setAnalysis(previous=>previous&&JSON.parse(contextKey).website===previous.website?{...previous,pendingOptionsContext:contextKey,pendingOptions:[...(previous.pendingOptionsContext===contextKey?previous.pendingOptions||[]:[]).filter(item=>!options.some(option=>option.field===item.field)),...options]}:previous),[]);
  useEffect(() => {
    const timer = window.setTimeout(() => { try { const previous = JSON.parse(localStorage.getItem("focus-assistant-history") || "[]"); if (Array.isArray(previous)) setHistory(previous.filter(v => typeof v === "string").slice(0, 8)); } catch { /* Empty history. */ } }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (open) { dialog.current?.showModal(); title.current?.focus(); } else dialog.current?.close(); }, [open]);
  useEffect(() => { if (open) title.current?.focus(); }, [stage, questionIndex, open]);
  useEffect(() => { if (analysis) save(storageKey(analysis.website), { analysis, values, answers, notes, approved }); }, [analysis, values, answers, notes, approved]);

  function restore(url: string) {
    try {
      const saved = readSaved(storageKey(url));
      if (!saved) return false;
      setAnalysis(saved.analysis); setValues(normalizeReviewValues({...saved.values,websiteLanguage:saved.analysis.fields.find(field=>field.key==="primaryLanguage")?.value||saved.values.websiteLanguage||""})); setApproved(saved.approved || []); setAnswers({...stepPlanAnswers(saved.analysis.stepPlans||[]),...seedQuestionnaireAnswers(currentData,saved.analysis.website,saved.answers)}); setNotes(saved.notes); setWebsite(saved.analysis.website); setError(""); setQuestionIndex(0); setStage("review");
      void fetch(`/api/onboarding/assistant/logo?website=${encodeURIComponent(url)}`).then(response=>response.json() as Promise<{logo?:{url:string;note:string}}>).then(result=>{const logo=result.logo;if(logo){setAnalysis(a=>a?.website===saved.analysis.website?{...a,logo}:a);setValues(previous=>previous.website===saved.analysis.website?({...previous,logoUrl:!previous.logoUrl || previous.logoUrl.startsWith("/api/onboarding/assets/")?logo.url:previous.logoUrl}):previous);}}).catch(()=>{});
      return true;
    } catch { return false; }
  }
  async function analyze() {
    setError(""); setStage("loading");
    try {
      const response = await fetch("/api/onboarding/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ website }), signal: AbortSignal.timeout(300000) });
      const result = await response.json() as Analysis & {ok?:boolean;error?:string};
      if (!response.ok || !result.ok) throw new Error(result.error || "No pudimos analizar la web.");
      const previous = readSaved(storageKey(result.website));
      const baseline=previous?normalizeReviewValues({...Object.fromEntries(previous.analysis.fields.map(field=>[field.key,field.value])),...(previous.analysis.logo?{logoUrl:previous.analysis.logo.url}:{}),...(previous.analysis.priceEntries?.length?{servicePrices:JSON.stringify(previous.analysis.priceEntries)}:{}),website:previous.analysis.website}):{};
      const edits = previous ? Object.fromEntries(Object.entries(previous.values).filter(([key,value]) => value !== baseline[key])) : {};
      setAnalysis(previous&&(previous.values.leadQuestionsEdited==="true"||previous.approved?.includes("leadQuestions"))?{...result,leadQuestions:previous.analysis.leadQuestions}:result); setValues(normalizeReviewValues({ ...Object.fromEntries(result.fields.map((field: Field) => [field.key, field.value])), ...(result.logo?{logoUrl:result.logo.url}:{}), ...(result.priceEntries?.length?{servicePrices:JSON.stringify(result.priceEntries)}:{}), ...edits, website: result.website,websiteLanguage:result.fields.find((field:Field)=>field.key==="primaryLanguage")?.value||"" })); setApproved([]);
      setAnswers({...stepPlanAnswers(result.stepPlans||[]),...seedQuestionnaireAnswers(currentData,result.website,previous?.answers || {})}); setAnswersBeforeProposal(null);setNotes(previous?.notes || ""); setQuestionIndex(0); setStage("review");
      const nextHistory = [result.website, ...history.filter(url => storageKey(url) !== storageKey(result.website))].slice(0, 8);
      setHistory(nextHistory); save("focus-assistant-history", nextHistory);
    } catch { setError(customerError()); setStage("url"); }
  }
  function apply() {
    if (!analysis) return;
    const patch: FormState = { ...normalizePatch(values),...questionnairePatch({...values,...answers},completeQuestionnaire(analysis.questions)),assistantQuestionnaireVersion:questionnaireVersion, assistantWebsite: analysis.website, assistantSources: JSON.stringify(analysis.sources), assistantNotes: notes };

    patch.leadQuestionConfig = JSON.stringify(analysis.leadQuestions.map((q, i) => ({ ...q, id: String(i + 1) })));
    const radarGoal = String(patch.radarGoal || "");
    if (notes || radarGoal) patch.prospectPreferences = [String(patch.prospectPreferences||""),notes, radarGoal ? `Objetivo de Radar: ${radarGoal}` : ""].filter(Boolean).join("\n");
    onApply(customerPatch(patch)); setApplied(values.companyName || "tu empresa"); setOpen(false);
  }
  function applyHelp(updates: HelpUpdate[]) {
    const patch:FormState={};
    for(const update of updates){
      if(["accuracy","terms","ghlPreparationAuthorization","legalName","billingLegalName"].includes(update.field))continue;
      if(!["socialProfiles","communicationLanguages","servicePrices","leadQuestionConfig"].includes(update.field) && (Array.isArray(currentData[update.field]) || ["mainService","services","sectors","targetCountries","targetClientTypes","additionalLanguages"].includes(update.field) || update.value.trim().startsWith("["))){try{const value=JSON.parse(update.value);patch[update.field]=Array.isArray(value)?value.map(String):[String(value)];}catch{patch[update.field]=update.value.split(/[,\n]+/).map(v=>v.trim()).filter(Boolean);}}
      else patch[update.field]=update.value;
    }
    if(open&&analysis){
      setValues(previous=>normalizeReviewValues({...previous,...Object.fromEntries(Object.entries(patch).filter(([,v])=>typeof v==="string"))} as Record<string,string>));
      for(const [key,value] of Object.entries(patch))if(completeQuestionnaire(analysis.questions).some(q=>q.field===key||q.otherField===key))setAnswers(previous=>({...previous,[key]:typeof value==="boolean"?String(value):value}));
      if(typeof patch.leadQuestionConfig==="string"){const questions=jsonList<LeadQuestion>(patch.leadQuestionConfig);setAnalysis(previous=>previous?{...previous,leadQuestions:questions.filter(q=>typeof q.question==="string"&&Array.isArray(q.options)&&q.options.every(o=>typeof o==="string")&&["Selección única","Selección múltiple"].includes(q.type))}:previous);}
      setApproved([]);
    }else onHelpPatch(patch);
  }
  const allQuestions=completeQuestionnaire(analysis?.questions||[]);
  const allAnswers={...values,...answers};
  const coverage=questionnaireCoverage(allQuestions,allAnswers);
  return <>
    <button type="button" className="context-help-trigger" onClick={()=>setHelpOpen(true)}>Ayuda y ajustes</button>
    <ContextHelp key={String((open&&analysis?analysis.website:currentData.website)||"draft")} open={helpOpen} onClose={()=>setHelpOpen(false)} getContext={()=>({page:"onboarding",contextId:String((open&&analysis?analysis.website:currentData.website)||"draft"),company:open&&analysis?values.companyName:currentData.companyName,values:open&&analysis?{...values,...answers}:currentData})} onApply={applyHelp}/>
    <section className="assistant-entry" aria-label="Configura tu empresa desde su web">
      <div><p className="eyebrow">TU WEB ES EL PUNTO DE PARTIDA</p><h2>Menos campos.<br />Más fácil empezar.</h2><p>Preparamos tu ficha desde la web de tu empresa. Tú revisas los datos y nos cuentas qué quieres conseguir.</p></div>
      <div className="assistant-entry-actions"><button type="button" className="primary" onClick={() => setOpen(true)}>Configurar con mi web</button>{currentData.website&&<button type="button" className="secondary" onClick={()=>{const url=String(currentData.assistantWebsite||currentData.website);if(restore(url)){setStage("review");setQuestionIndex(0);}else{setWebsite(url);setStage("url");}setOpen(true);}}>Revisar mi configuración</button>}<button type="button" className="assistant-link" onClick={onManual}>Completar manualmente</button><small>Descripción, marca y servicios. Siempre editables.</small></div>
    </section>

    {applied && <div className="assistant-applied" role="status"><strong>Ficha de {applied} preparada.</strong><span>Solo queda revisar el resumen y las confirmaciones finales.</span><button type="button" className="assistant-link" onClick={() => { setStage("url"); setWebsite(""); setError(""); setOpen(true); }}>Configurar otra empresa</button></div>}
    <dialog ref={dialog} className="assistant-dialog" onCancel={() => setOpen(false)} aria-labelledby="assistant-title">
      <div className="assistant-shell">
        <div className="assistant-top"><a className="brand" href="#assistant-title" onClick={e => e.preventDefault()}><i>F</i><span>FOCUS<small>BUSINESS</small></span></a><button type="button" className="assistant-link" onClick={()=>setHelpOpen(true)}>Ayuda y ajustes</button><button type="button" className="assistant-close" aria-label="Cerrar asistente" onClick={() => setOpen(false)}>×</button></div>
        <div className="assistant-body">
          <p className="eyebrow">CONFIGURACIÓN INICIAL</p>
          <h2 id="assistant-title" tabIndex={-1} ref={title}>{stage === "url" ? "Empecemos por tu web." : stage === "loading" ? "Preparando tu configuración." : stage === "review" ? "Esto es lo que encontramos." : stage === "questions" ? "¿Con quién hablamos?" : "Todo preparado para empezar."}</h2>
          {stage === "url" && <><p className="assistant-intro">Comparte la web de tu empresa. Prepararemos los datos de tu negocio, marca y servicios para que solo tengas que revisarlos.</p><form onSubmit={e => { e.preventDefault(); void analyze(); }}><label className="input"><span>Sitio web de tu empresa</span><input name="assistantWebsite" type="text" inputMode="url" autoComplete="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://tuempresa.com" required /></label>{error && <div className="notice error" role="alert">{error}</div>}<div className="assistant-actions"><button className="primary" disabled={!website.trim()} type="submit">Preparar mi configuración</button><button type="button" className="assistant-link" onClick={() => { setOpen(false); onManual(); }}>Continuar manualmente</button></div></form>{analysis && <button type="button" className="assistant-link" onClick={() => setStage("review")}>Retomar la configuración de {analysis.fields.find(f => f.key === "companyName")?.value || analysis.website}</button>}{history.length > 0 && <div className="assistant-history"><p>Retomar una ficha guardada</p>{history.map(url => <button type="button" key={url} onClick={() => restore(url)}>{new URL(url).hostname}</button>)}</div>}<p className="assistant-footnote">¿Tu web es privada o todavía no está lista? Puedes continuar manualmente.</p></>}
          {stage === "loading" && <div className="assistant-loading" role="status" aria-live="polite"><div className="assistant-orbit"><span>F</span></div><p>Preparando tu configuración…</p><small>Puede tardar unos minutos. Puedes dejar esta ventana abierta.</small></div>}
          {stage === "review" && analysis && <><p className="assistant-intro">Hemos preparado tu ficha y una propuesta inicial. Revisa lo esencial; podrás cambiar cualquier detalle después.</p><div className="customer-company"><div className="customer-company-heading">{/^https?:\/\//i.test(values.logoUrl||"")||/^\/api\/onboarding\/assets\/[a-f0-9]{24}\.(?:png|jpg|webp|gif|svg)$/.test(values.logoUrl||"")?<img src={values.logoUrl} alt={`Logo de ${values.companyName||"tu empresa"}`} referrerPolicy="no-referrer"/>:null}<div><h3>{values.companyName}</h3><p>{values.activity}</p></div></div><p>{values.description}</p><dl className="customer-company-facts"><div><dt>Contacto</dt><dd>{values.businessEmail||"Por añadir"}<br/>{values.contactPhone}</dd></div><div><dt>Ubicación</dt><dd>{values.location}</dd></div><div><dt>Idiomas</dt><dd>{[...new Set([values.primaryLanguage,...jsonList<string>(values.communicationLanguages)])].filter(Boolean).join(" · ")}</dd></div></dl><p className="config-hint">Los servicios, el público y las preferencias están preparados como punto de partida. Tú decides los ajustes.</p></div><details className="assistant-details"><summary>Revisar los seis pasos</summary><SixStepPlan plans={analysis.stepPlans||[]} values={allAnswers} reviewed={approved} onReview={section=>{setQuestionIndex(section);setAdvancedQuestions(true);setStage("questions");}} onReset={analysis.stepPlans?.length?()=>{setAnswersBeforeProposal(answers);setAnswers(stepPlanAnswers(analysis.stepPlans));setApproved(previous=>previous.filter(item=>!item.startsWith("step-")));}:undefined} onUndo={answersBeforeProposal?()=>{setAnswers(answersBeforeProposal);setAnswersBeforeProposal(null);}:undefined}/></details>{!analysis.stepPlans?.length&&<p className="notice">Vuelve a preparar esta ficha para actualizar todas sus preferencias.</p>}<details className="assistant-details"><summary>Editar empresa, contacto, marca y precios</summary><ConfigurationReview values={values} onChange={(key,value)=>setValues(previous=>({...previous,[key]:value}))} approved={approved} onApprove={(group,yes)=>setApproved(previous=>yes?[...new Set([...previous,group])]:previous.filter(item=>item!==group))} services={analysis.questions.find(q=>q.field==="mainService")?.options.filter(item=>!/^Otro|pendiente/i.test(item))||[]} logoNote={analysis.logo?.note}/></details>{analysis.warnings.length>0&&<details className="assistant-details"><summary>Observaciones para revisar</summary><ul>{analysis.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul></details>}<div className="assistant-actions"><button type="button" className="secondary" onClick={()=>setStage("url")}>Cambiar sitio web</button><button type="button" className="primary" onClick={()=>{setApproved(previous=>[...new Set([...previous,...reviewGroups])]);setQuestionIndex(0);setAdvancedQuestions(false);setStage("questions");}}>Continuar</button></div></>}
          {stage === "questions" && analysis && <FullQuestionnaire onQuickFinish={apply} initialAdvanced={advancedQuestions} context={{...Object.fromEntries(analysis.fields.map(field=>[field.key,field.value])),companyName:values.companyName,website:analysis.website}} pendingOptions={analysis.pendingOptions||[]} pendingOptionsContext={analysis.pendingOptionsContext||""} onOptions={receivePendingOptions} adaptations={analysis.questions} plans={analysis.stepPlans||[]} reviewed={approved} onReview={section=>setApproved(previous=>[...new Set([...previous,`step-${section}`])])} values={allAnswers} section={questionIndex} onSection={setQuestionIndex} onChange={(field,value)=>{setAnswers(previous=>({...previous,[field]:value}));setApproved(previous=>previous.filter(item=>item!==`step-${questionIndex}`));}} onBack={()=>setStage("review")} onFinish={()=>setStage("finish")}/>}
          {stage === "finish" && analysis && <><p className="assistant-intro">Tu ficha está preparada. Puedes añadir una indicación o revisar las preguntas que recibirán tus futuros clientes.</p><div className="questionnaire-review">{coverage.map(section=><details className="assistant-details" key={section.id}><summary>{section.title}</summary><button type="button" className="assistant-link" onClick={()=>{setQuestionIndex(section.id);setStage("questions");}}>Editar este bloque</button><dl className="assistant-answer-summary">{allQuestions.filter(q=>q.section===section.id&&matchesCondition(q.when,allAnswers)).map(q=><div key={q.field}><dt>{q.question}</dt><dd>{hasQuestionAnswer(q,allAnswers)?Array.isArray(allAnswers[q.field])?(allAnswers[q.field] as string[]).join(", "):String(allAnswers[q.field]):"Lo coordinaremos contigo"}{q.otherField&&allAnswers[q.otherField]?` · ${allAnswers[q.otherField]}`:""}</dd></div>)}</dl></details>)}</div><label className="input"><span>¿Quieres añadir algo más? (opcional)</span><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Prioridades, exclusiones, matices de marca o cualquier detalle que quieras tener en cuenta." /></label><details className="assistant-details"><summary>Ver y editar las preguntas de captación</summary><LeadQuestionsEditor questions={analysis.leadQuestions} onChange={questions=>{setAnalysis(previous=>previous?{...previous,leadQuestions:questions}:previous);setValues(previous=>({...previous,leadQuestionsEdited:"true"}));}} context={{...values,answers}} language={values.leadQuestionLanguage || (jsonList<string>(values.communicationLanguages).includes("Español")?"Español":values.primaryLanguage || "Español")} onLanguage={language=>setValues(previous=>({...previous,leadQuestionLanguage:language}))} approved={approved.includes("leadQuestions")} onApprove={yes=>setApproved(previous=>yes?[...new Set([...previous,"leadQuestions"])]:previous.filter(group=>group!=="leadQuestions"))}/></details><div className="assistant-actions"><button type="button" className="secondary" onClick={() => {setQuestionIndex(0);setAdvancedQuestions(true);setStage("questions");}}>Personalizar configuración</button><button type="button" className="primary" onClick={apply}>Revisar y terminar</button></div></>}
        </div>
      </div>
    </dialog>
  </>;
}



