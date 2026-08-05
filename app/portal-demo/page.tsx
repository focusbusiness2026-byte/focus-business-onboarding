const example = {
  id: "ONB-DEMO-2026",
  company: "Luz Norte Producciones",
  service: "Vídeo corporativo y campañas B2B",
  audience: "B2B · Tecnología, industria y salud",
  status: "Listo para GHL",
  email: "laura@luznorteproducciones.es",
  launch: "15/09/2026",
};

export default function PortalDemoPage() {
  return <main className="portal"><header className="portal-header"><a className="brand" href="/"><i>F</i><span>FOCUS<small>BUSINESS</small></span></a><span className="tag">Vista de demostración</span></header><section className="portal-body"><p className="eyebrow">PORTAL DE CONFIGURACIÓN</p><h1>Productoras registradas</h1><p className="intro">Esta vista contiene datos ficticios. El portal real mostrará las respuestas recibidas en Google Sheets solo a miembros autorizados.</p><div className="portal-stats"><div><b>1</b><span>Registro recibido</span></div><div><b>1</b><span>Listo para GHL</span></div><div><b>Administrador</b><span>Rol de prueba</span></div></div><div className="record-list"><article className="record"><div><p className="record-id">{example.id}</p><h2>{example.company}</h2><p>{example.service} · {example.audience}</p></div><div className="record-meta"><span className="tag">{example.status}</span><span>{example.email}</span><span>{example.launch}</span></div></article></div></section></main>;
}
