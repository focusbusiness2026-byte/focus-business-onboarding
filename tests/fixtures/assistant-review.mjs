// Explicit QA fixture: never a fallback for an unsuccessful real analysis.
export const reviewFixture = {
  ok:true,provider:"simulated",model:"Simulación de QA",usage:{inputTokens:0,outputTokens:0},website:"https://example.com/",summary:"Empresa ficticia para comprobar el recorrido del asistente. Esta ficha no procede de una llamada a OpenAI.",
  fields:[
    {key:"companyName",label:"Nombre comercial",value:"Estudio de prueba",status:"found",evidence:"Dato ficticio de QA.",sourceUrl:"https://example.com/"},
    {key:"description",label:"Descripción propuesta",value:"Estudio ficticio de contenido audiovisual para comprobar la revisión local.",status:"suggested",evidence:"Texto de prueba, no generado por OpenAI.",sourceUrl:""},
    {key:"activity",label:"Actividad",value:"Otro",status:"suggested",evidence:"Selección de prueba.",sourceUrl:""},
    {key:"activityOther",label:"Otra actividad",value:"Estudio creativo",status:"suggested",evidence:"Dato ficticio.",sourceUrl:""}
  ],questions:[
    {field:"mainService",question:"¿Qué servicio quieres impulsar primero?",type:"single",options:["Vídeo corporativo","Contenido para redes","Otro"]},
    {field:"minimumBudget",question:"¿Qué presupuesto mínimo buscas por proyecto?",type:"single",options:["Menos de 1.000 €","1.000–3.000 €","Pendiente de definir"]},
    {field:"targetClientTypes",question:"¿A quién quieres captar?",type:"multi",options:["Agencia","Marca con equipo de marketing","Otro"]},
    {field:"sectors",question:"¿Qué sectores quieres priorizar?",type:"multi",options:["Moda","Salud","Tecnología","Hostelería","Otro"]},
    {field:"targetCountries",question:"¿En qué países quieres captar clientes?",type:"multi",options:["España","Portugal","Otro"]},
    {field:"radarGoal",question:"¿Qué quieres conseguir con Radar?",type:"single",options:["Más visualizaciones","Captar leads","Orientación general"]},
    {field:"prospectExclusions",question:"¿Qué debemos excluir?",type:"text",options:[]}
  ],leadQuestions:[{question:"¿Qué tipo de vídeo necesitas?",type:"Selección única",options:["Corporativo","Redes","Otro"]}],warnings:["Ficha ficticia de QA: no se ha consumido OpenAI."],sources:["https://example.com/"]
};
