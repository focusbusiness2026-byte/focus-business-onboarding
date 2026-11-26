"use client";
import {useEffect,useState} from "react";
import ContextHelp, {type HelpUpdate} from "../components/ContextHelp";
export default function ProspectionHelpFrame() {
  const [context,setContext]=useState<Record<string,unknown>>({page:"prospection",contextId:"",values:{}});
  const [origin,setOrigin]=useState("");
  useEffect(()=>{
    function receive(event:MessageEvent) {if(event.source!==window.parent||!/^http:\/\/(?:localhost|127\.0\.0\.1):8133$/.test(event.origin)||event.data?.type!=="focus-help-context")return;setContext(event.data.context||{});setOrigin(event.origin);}
    window.addEventListener("message",receive);
    try{const trusted=new URL(document.referrer).origin;if(/^http:\/\/(?:localhost|127\.0\.0\.1):8133$/.test(trusted))window.parent.postMessage({type:"focus-help-ready"},trusted);}catch{/* Opened directly. */}
    return()=>window.removeEventListener("message",receive);
  },[]);
  function send(type:string,updates?:HelpUpdate[]) {if(origin)window.parent.postMessage({type,updates,contextId:context.contextId},origin);}
  return <div className="help-embedded-page"><ContextHelp key={String(context.contextId||"empty")} open={true} scope="prospection" onClose={()=>send("focus-help-close")} getContext={()=>context} onApply={updates=>send("focus-help-apply",updates)}/></div>;
}
