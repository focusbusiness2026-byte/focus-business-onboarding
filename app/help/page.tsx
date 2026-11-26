"use client";
import {useEffect,useState} from "react";
import ContextHelp, {type HelpUpdate} from "../components/ContextHelp";
import {trustedProspectionParent} from "../../lib/help-bridge.mjs";
export default function ProspectionHelpFrame() {
  const [context,setContext]=useState<Record<string,unknown>>({page:"prospection",contextId:"",values:{}});
  const [origin,setOrigin]=useState("");
  useEffect(()=>{
    function receive(event:MessageEvent) {if(event.source!==window.parent||!trustedProspectionParent(event.origin)||event.data?.type!=="focus-help-context"||!event.data.context||typeof event.data.context!=="object"||Array.isArray(event.data.context))return;setContext(event.data.context);setOrigin(event.origin);}
    window.addEventListener("message",receive);
    try{const trusted=new URL(document.referrer).origin;if(trustedProspectionParent(trusted))window.parent.postMessage({type:"focus-help-ready"},trusted);}catch{/* Opened directly. */}
    return()=>window.removeEventListener("message",receive);
  },[]);
  function send(type:string,updates?:HelpUpdate[]) {if(origin)window.parent.postMessage({type,updates,contextId:context.contextId},origin);}
  return <div className="help-embedded-page"><ContextHelp key={String(context.contextId||"empty")} open={true} scope="prospection" onClose={()=>send("focus-help-close")} getContext={()=>context} onApply={updates=>send("focus-help-apply",updates)}/></div>;
}
