import {readFile,writeFile,mkdir} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {resolve,sep} from "node:path";
import {createHash} from "node:crypto";
const directory=process.env.ASSISTANT_ASSETS_DIR?pathToFileURL(resolve(process.env.ASSISTANT_ASSETS_DIR)+sep):new URL("../outputs/assistant-assets/",import.meta.url);
export async function cacheLogo(bytes,mime,sourceUrl,note) {
  const extension=({"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/gif":"gif","image/svg+xml":"svg"})[mime];
  if(!extension||bytes.length>1_500_000)throw new Error("Formato de logo no admitido");
  const id=createHash("sha256").update(bytes).digest("hex").slice(0,24)+"."+extension;
  await mkdir(directory,{recursive:true});await writeFile(new URL(id,directory),bytes);await writeFile(new URL(id+".json",directory),JSON.stringify({mime,sourceUrl,note}));
  return {url:`/api/onboarding/assets/${id}`,sourceUrl,note};
}
export async function getLogoAsset(id) {
  if(!/^[a-f0-9]{24}\.(png|jpg|webp|gif|svg)$/.test(id))return null;
  try {const meta=JSON.parse(await readFile(new URL(id+".json",directory),"utf8"));return {...meta,bytes:await readFile(new URL(id,directory))};}catch{return null;}
}
export async function resolveOfficialLogo(website,pages,fetchImage) {
  try {const known=JSON.parse(await readFile(new URL("known-logos.json",directory),"utf8"));const match=known[new URL(website).hostname.replace(/^www\./,"")];if(match&&/^[a-zA-Z0-9_.-]+$/.test(match.file))return cacheLogo(await readFile(new URL(match.file,directory)),match.mime,match.sourceUrl,match.label);}catch{ /* No pre-captured header available. */ }
  // Some sites compose their official wordmark with live canvas and text.
  // Verified captures retain their exact source and hostname, never another brand.
  try {const seed=new URL("../assets/brand-logos/",import.meta.url);const known=JSON.parse(await readFile(new URL("known-logos.json",seed),"utf8"));const match=known[new URL(website).hostname.replace(/^www\./,"")];if(match&&/^[a-zA-Z0-9_.-]+$/.test(match.file))return cacheLogo(await readFile(new URL(match.file,seed)),match.mime,match.sourceUrl,match.label);}catch{ /* No verified capture for this site. */ }
  const home=pages?.[0];
  for(const source of (home?.logoCandidates||[]).slice(0,2)) {
    try {const image=await fetchImage(source);return await cacheLogo(image.body,image.type.split(";")[0],source,"Logo descargado desde la web de la empresa. Revísalo antes de aprobar.");}catch{ /* Try the next actual logo asset. */ }
  }
  return null;
}
