"use client";
import { ChangeEvent, useEffect, useState } from "react";

export default function AdminPage() {
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { const item = localStorage.getItem("focus-productora-last-submission"); if (item) setRecord(JSON.parse(item)); }, []);
  function download() {
    if (!record) return;
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = "focus-configuracion-ghl.json"; link.click(); URL.revokeObjectURL(url);
  }
  function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)); setRecord(parsed); localStorage.setItem("focus-productora-last-submission", JSON.stringify(parsed)); } catch { alert("El archivo no es un JSON válido de configuración."); } };
    reader.readAsText(file);
  }
  return <main className="admin"><section className="admin-card"><a href="/" className="back">← Volver al formulario</a><p className="eyebrow">PANEL INTERNO</p><h1>Configuración para GoHighLevel</h1>{!record ? <><p className="intro">Aquí aparecerá la configuración enviada desde el formulario. También puedes importar el JSON descargado desde una fila de Google Sheets o enviado por una productora.</p><label className="import"><span>Importar archivo JSON</span><input type="file" accept="application/json,.json" onChange={importFile} /></label></> : <><p className="intro">Datos listos para validar, crear la subcuenta y activar los flujos. Descarga este archivo o súbelo a una tarea de Codex para utilizarlo como especificación.</p><div className="admin-actions"><button className="primary" type="button" onClick={download}>↓ Descargar JSON para Codex</button><label className="import"><span>Reemplazar con otro JSON</span><input type="file" accept="application/json,.json" onChange={importFile} /></label></div><pre>{JSON.stringify(record, null, 2)}</pre></>}</section></main>;
}
