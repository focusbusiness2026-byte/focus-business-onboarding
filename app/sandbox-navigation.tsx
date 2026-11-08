"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- The isolated copy uses document navigation to avoid Vinext RSC transition failures. */
import { useEffect, useState } from "react";

export default function SandboxNavigation() {
  const [config,setConfig]=useState<{portal:string;prospection:string;radar:string}|null>(null);
  useEffect(()=>{void fetch("/api/sandbox/config").then(r=>r.ok?r.json():null).then(data=>{if(data?.environment==="sandbox")setConfig(data);}).catch(()=>undefined);},[]);
  useEffect(()=>{
    if(!config)return;
    const fix=()=>document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(link=>{
      link.href=link.href.replace("https://prospeccion.focusbusinesslab.es/portal",config.prospection).replace("https://radar.focusbusinesslab.es",config.radar).replace("https://onboarding.focusbusinesslab.es",config.portal);
    });
    const navigate=(event:MouseEvent)=>{
      if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const link=(event.target as Element)?.closest<HTMLAnchorElement>('a[href]');
      if(!link||link.target==='_blank'||link.hasAttribute('download'))return;
      const destination=new URL(link.href);
      if(destination.origin!==location.origin||destination.pathname===location.pathname&&destination.hash)return;
      event.preventDefault();event.stopImmediatePropagation();location.assign(destination.href);
    };
    fix();document.addEventListener('click',navigate,true);const observer=new MutationObserver(fix);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.removeEventListener('click',navigate,true);};
  },[config]);
  if(!config)return null;
  return <nav aria-label="Entorno de pruebas" style={{position:"sticky",top:0,zIndex:5000,background:"#d9af3c",color:"#07111e",padding:"9px 16px",font:"600 13px sans-serif",display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}><strong>COPIA DE PRUEBAS · Solo datos ficticios .test</strong><a href="/">Formulario</a><a href="/portal">Portal</a><a href={config.prospection}>Prospección</a><a href={config.radar}>Radar</a></nav>;
}
