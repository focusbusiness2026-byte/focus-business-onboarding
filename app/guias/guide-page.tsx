/* eslint-disable @next/next/no-html-link-for-pages */
import { ReactNode } from "react";

type GuideStep = {
  title: string;
  text: string;
  visual: string[];
  checklist?: string[];
  warning?: string;
};

export function GuidePage({ eyebrow, title, intro, steps, children, officialUrl, provider = "la plataforma" }: { eyebrow: string; title: string; intro: string; steps: GuideStep[]; children?: ReactNode; officialUrl: string; provider?: string }) {
  return <main className="guide-page"><article className="guide-shell"><a className="guide-back" href="/?step=4#meta-access">← Volver al formulario</a><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="guide-intro">{intro}</p><div className="guide-alert"><b>Antes de empezar</b><span>Usa solamente una sesión propia y el negocio correcto. Focus Business te enviará por separado el nombre o correo exactos cuando sean necesarios. No compartas contraseñas, códigos de verificación ni datos de pago.</span></div><ol className="guide-steps">{steps.map((step, index) => <li key={step.title}><div className="guide-copy"><span className="guide-number">{String(index + 1).padStart(2, "0")}</span><div><h2>{step.title}</h2><p>{step.text}</p>{step.checklist && <ul className="guide-checklist">{step.checklist.map((item) => <li key={item}>{item}</li>)}</ul>}{step.warning && <p className="guide-step-warning">{step.warning}</p>}</div></div><figure className="guide-visual" aria-label={`Imagen orientativa: ${step.title}`}><div className="guide-visual-bar"><i /><i /><i /></div>{step.visual.map((line, lineIndex) => <div className={lineIndex === step.visual.length - 1 ? "guide-visual-line active" : "guide-visual-line"} key={line}><span>{line}</span></div>)}<figcaption>Imagen orientativa. Los nombres pueden variar según la cuenta y la versión de {provider}.</figcaption></figure></li>)}</ol>{children}<section className="guide-security"><h2>Revisión final</h2><ul><li>Comprueba que elegiste el negocio y los activos correctos antes de confirmar.</li><li>Revisa la invitación o el estado final y guarda una captura como comprobante si lo necesitas.</li><li>Los permisos amplios son sensibles: concédelos solo a la persona confirmada y durante el tiempo necesario.</li><li>Cuando termine la configuración, revisa, reduce o retira los permisos que ya no hagan falta.</li></ul><a href={officialUrl} target="_blank" rel="noreferrer">Consultar la ayuda oficial de {provider} ↗</a></section><a className="primary guide-finish" href="/?step=4#meta-access">Volver al formulario</a></article></main>;
}
