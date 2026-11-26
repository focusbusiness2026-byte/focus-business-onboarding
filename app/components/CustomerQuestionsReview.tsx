"use client";
import {useState} from "react";
import LeadQuestionsEditor,{type LeadQuestion} from "./LeadQuestionsEditor";
import {jsonList} from "../../lib/assistant-config";
import {customerQuestionLanguage} from "../../lib/customer-journey.mjs";
type Values=Record<string,string|string[]|boolean>;
export default function CustomerQuestionsReview({values,onChange}:{values:Values;onChange:(field:string,value:string)=>void}){
  const [approved,setApproved]=useState(false);
  const questions=jsonList<LeadQuestion>(String(values.leadQuestionConfig||""));
  if(!questions.length)return null;
  return <details className="assistant-details"><summary>Ver y editar las preguntas de captación</summary><LeadQuestionsEditor questions={questions} onChange={next=>onChange("leadQuestionConfig",JSON.stringify(next.map((question,index)=>({...question,id:String(index+1)}))))} context={values} language={customerQuestionLanguage(values)} onLanguage={language=>onChange("leadQuestionLanguage",language)} approved={approved} onApprove={setApproved}/></details>;
}
