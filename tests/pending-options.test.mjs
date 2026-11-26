import test from "node:test";
import assert from "node:assert/strict";
import {questionnaire} from "../lib/onboarding-questionnaire.mjs";
import {pendingOptionsContext,normalizePendingOptions} from "../lib/pending-options.mjs";
import {generatePendingOptions} from "../scripts/pending-options.mjs";
const question=field=>questionnaire.find(q=>q.field===field);
const option=(label,value="",mode="value")=>({label,value,mode});
test("pending options receive public business context without private answers or credentials",()=>{
  const context=pendingOptionsContext({companyName:"Kuro",description:"Estudio creativo",businessEmail:"hola@example.com",ownerName:"Persona privada",driveAssetsUrl:"https://drive.google.com/private",terms:true,token:"secret",servicesOther:"password=secret"});
  assert.equal(context.companyName,"Kuro");assert.equal(context.businessEmail,"hola@example.com");
  for(const field of ["ownerName","driveAssetsUrl","terms","token","servicesOther"])assert.ok(!Object.hasOwn(context,field));
});
test("names and private URLs offer manual entry without inventing a responsible person or link",()=>{
  for(const field of ["ownerName","contactName","approvalOwner","driveAssetsUrl","landingVslUrl"]){
    const result=normalizePendingOptions(question(field),{question:"Confirma este dato",options:[option("Inventado","Nombre inventado"),option("Indicar responsable creativo","","write")]});
    assert.ok(!result.options.some(o=>o.mode==="value"));assert.ok(result.options.some(o=>o.mode==="write"));assert.ok(result.options.some(o=>o.mode==="later"));
  }
});
test("phone and email options can reuse published contacts but cannot introduce invented ones",()=>{
  const context={contactPhone:"+34 600 000 000",businessEmail:"hola@example.com"};
  const phone=normalizePendingOptions(question("whatsappDisplayNumber"),{options:[option("Usar el teléfono publicado y confirmarlo","+34 600 000 000"),option("Inventado","+34 999 999 999")]},context);
  assert.equal(phone.options.filter(o=>o.mode==="value").length,1);assert.equal(phone.options.find(o=>o.mode==="value").value,context.contactPhone);
  const email=normalizePendingOptions(question("contactEmail"),{options:[option("Correo publicado","hola@example.com"),option("Correo inventado","otro@example.com")]},context);
  assert.deepEqual(email.options.filter(o=>o.mode==="value").map(o=>o.value),["hola@example.com"]);
});
test("native dropdown choices preserve catalog values and deferring never fabricates an answer",()=>{
  const result=normalizePendingOptions(question("monthlyCapacity"),{options:[option("Equipo para uno o dos proyectos","1 proyecto"),option("500 proyectos","500 proyectos"),option("Confirmar con el equipo","inventa", "later")]});
  assert.equal(result.options[0].value,"1 proyecto");assert.ok(!result.options.some(o=>o.value==="500 proyectos"));assert.equal(result.options.find(o=>o.mode==="later").value,"");
  assert.ok(!Object.hasOwn(pendingOptionsContext({portfolioHighlights:"Nike, Loewe (conceptual)"}),"portfolioHighlights"));
  const misleading=normalizePendingOptions(question("monthlyCapacity"),{reason:"Entregas para clientes como Nike o Loewe.",options:[option("Un proyecto","1 proyecto")]});
  assert.doesNotMatch(misleading.reason,/Nike|Loewe/);
});
test("GPT supplies an option set for every requested missing field without applying answers",async()=>{
  const fields=["ownerName","monthlyCapacity","launchDate"];
  const result=await generatePendingOptions({fields,context:{companyName:"Kuro",description:"Dirección creativa para marcas",ownerName:"No transmitir"}},{env:{OPENAI_API_KEY:"test-only"},call:async(_url,init)=>{
    const body=JSON.parse(init.body);assert.equal(body.store,false);assert.deepEqual(body.text.format.schema.required,fields);assert.doesNotMatch(body.input,/No transmitir/);assert.match(body.instructions,/NUNCA inventes su nombre/);
    const output=Object.fromEntries(fields.map(field=>[field,{question:`Opciones para ${field}`,reason:"Contexto del estudio creativo",options:[option("Indicarlo ahora","","write"),option("Después","","later"),option("Opción de prueba","1 proyecto")]}]));
    return Response.json({output:[{content:[{type:"output_text",text:JSON.stringify(output)}]}]});
  }});
  assert.deepEqual(result.options.map(o=>o.field),fields);assert.ok(!Object.hasOwn(result,"answers"));assert.ok(!Object.hasOwn(result,"updates"));
});
