"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SandboxNavigation() {
  const [config,setConfig]=useState<{portal:string;prospection:string;radar:string}|null>(null);
  useEffect(()=>{void fetch("/api/sandbox/config").then(r=>r.ok?r.json():null).then(data=>{if(data?.environment==="sandbox")setConfig(data);}).catch(()=>undefined);},[]);
  useEffect(()=>{
    if(!config)return;
    const fix=()=>document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(link=>{
      link.href=link.href.replace("https://prospeccion.focusbusinesslab.es/portal",config.prospection).replace("https://radar.focusbusinesslab.es",config.radar).replace("https://onboarding.focusbusinesslab.es",config.portal);
    });
    fix();const observer=new MutationObserver(fix);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
  },[config]);
  if(!config)return null;
  return <nav aria-label="Entorno de pruebas" style={{position:"sticky",top:0,zIndex:5000,background:"#d9af3c",color:"#07111e",padding:"9px 16px",font:"600 13px sans-serif",display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}><strong>COPIA DE PRUEBAS · Solo datos ficticios .test</strong><Link href="/">Formulario</Link><Link href="/portal">Portal</Link><a href={config.prospection}>Prospección</a><a href={config.radar}>Radar</a></nav>;
}
