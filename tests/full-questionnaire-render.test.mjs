import assert from "node:assert/strict";
import test from "node:test";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import ts from "typescript";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {questionnaire} from "../lib/onboarding-questionnaire.mjs";
import {pendingOptionsContext} from "../lib/pending-options.mjs";

const component=Promise.resolve().then(async()=>{
  const source=await readFile(new URL("../app/components/FullQuestionnaire.tsx",import.meta.url),"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText.replaceAll('../../lib/onboarding-questionnaire.mjs','../lib/onboarding-questionnaire.mjs').replaceAll('../../lib/pending-options.mjs','../lib/pending-options.mjs').replaceAll('../../lib/customer-journey.mjs','../lib/customer-journey.mjs');
  const output=new URL("../outputs/full-questionnaire-render.mjs",import.meta.url);
  await mkdir(new URL("../outputs/",import.meta.url),{recursive:true});await writeFile(output,compiled);
  return (await import(output.href)).default;
});
const noop=()=>{};
const settings={landingVslChoice:"Sí, ya tenemos el vídeo",adPlatforms:["Meta Ads"],whatsappSetup:"Sí, conectar WhatsApp Business",callingSetup:"Sí, llamadas entrantes y salientes",callRecording:"Sí, cuando sea legal y esté informado"};

test("all 89 questions actually render across the six blocks and their valid branches",async()=>{
  const Component=await component,rendered=new Set();
  for(const subdomainSetup of ["Subdominio de Focus Business","Dominio nuevo","Dominio existente"]){
    for(let section=0;section<6;section++){
      const html=renderToStaticMarkup(React.createElement(Component,{initialAdvanced:true,adaptations:[],values:{...settings,subdomainSetup},section,onSection:noop,onChange:noop,onBack:noop,onFinish:noop}));
      for(const match of html.matchAll(/data-question-field="([^"]+)"/g))rendered.add(match[1]);
      assert.match(html,/Volver a la revisión rápida/);
    }
  }
  assert.deepEqual(questionnaire.filter(q=>!rendered.has(q.field)).map(q=>q.field),[]);
});
test("turning channels off removes their editors while leaving the parent decisions visible",async()=>{
  const Component=await component;
  const html=renderToStaticMarkup(React.createElement(Component,{initialAdvanced:true,adaptations:[],values:{whatsappSetup:"No",callingSetup:"No",adPlatforms:["No gestionamos anuncios"],callRecording:"Sí, cuando sea legal y esté informado"},section:4,onSection:noop,onChange:noop,onBack:noop,onFinish:noop}));
  assert.match(html,/data-question-field="whatsappSetup"/);assert.match(html,/data-question-field="callingSetup"/);
  for(const field of ["whatsappBusinessAccount","callRecordingNotice","metaAdsAccess"])assert.doesNotMatch(html,new RegExp(`data-question-field="${field}"`));
});
test("missing names get a contextual dropdown without silently filling the name",async()=>{
  const Component=await component,context={companyName:"Kuro",website:"https://kuro.example/"};
  const html=renderToStaticMarkup(React.createElement(Component,{initialAdvanced:true,adaptations:[],context,pendingOptionsContext:JSON.stringify(pendingOptionsContext(context)),pendingOptions:[{field:"ownerName",question:"¿Quién coordinará Kuro?",reason:"El estudio necesita un interlocutor",options:[{label:"Indicar dirección creativa",value:"",mode:"write"},{label:"Confirmar después",value:"",mode:"later"}]}],values:{},section:0,onSection:noop,onChange:noop,onBack:noop,onFinish:noop}));
  assert.match(html,/Opciones para Persona de contacto/);assert.match(html,/Indicar dirección creativa/);assert.match(html,/autoComplete="name"/);
  assert.doesNotMatch(html,/value="Indicar dirección creativa"/);assert.doesNotMatch(html,/Sugeridas para/);
});



test("customer quick review renders just one contact and keeps technical fields out of the main flow",async()=>{
  const Component=await component;
  const html=renderToStaticMarkup(React.createElement(Component,{adaptations:[],values:{},section:0,onSection:noop,onChange:noop,onBack:noop,onFinish:noop}));
  assert.deepEqual([...html.matchAll(/data-question-field="([^"]+)"/g)].map(match=>match[1]),["contactName","contactEmail"]);
  assert.doesNotMatch(html,/GPT|ChatGPT|OpenAI|tokens|analizando|89 preguntas|24 preguntas/i);
  assert.match(html,/Personalizar los seis pasos/);
  assert.match(html,/autoComplete="name"/);
  assert.match(html,/autoComplete="email"/);
});
