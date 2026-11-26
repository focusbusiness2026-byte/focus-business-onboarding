// One-use encrypted transfer from the authorized configuration session.
// Only a public key and encrypted packet cross tool output; plaintext stays in memory.
import { generateKeyPairSync, privateDecrypt, constants } from "node:crypto";
import { createInterface } from "node:readline";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";

const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64");
const bootstrapIndex = process.argv.indexOf("--bootstrap-dir");
const bootstrapDirectory = bootstrapIndex >= 0 ? process.argv[bootstrapIndex + 1] : "";
if (bootstrapIndex >= 0 && !bootstrapDirectory) throw new Error("Falta el directorio de transferencia cifrada.");
function receivePacket(line) {
  try {
    const plaintext = privateDecrypt({ key: pair.privateKey, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(line.trim(), "base64"));
    const key = plaintext.toString("utf8").trim();
    plaintext.fill(0);
    if (!/^sk-[A-Za-z0-9_-]+$/.test(key)) throw new Error("invalid");
    const detached = process.env.FOCUS_REVIEW_DETACHED === "true";
    const launch = () => spawn(process.execPath, [fileURLToPath(new URL("./review-server.mjs", import.meta.url))], { detached, windowsHide: true, stdio: detached || bootstrapDirectory ? "ignore" : ["ignore", "inherit", "inherit"], env: { ...process.env, OPENAI_API_KEY: key, OPENAI_MODEL: "gpt-5-mini", FOCUS_ASSISTANT_FIXTURE: "false", FOCUS_REVIEW_PORT: process.env.FOCUS_REVIEW_PORT || "8130" } });
    let child = launch();
    if (!detached) child.on("error", () => { console.error("No se pudo iniciar el servidor privado."); process.exitCode = 1; });
    if (detached) {
      child.on("error", () => { console.error("No se pudo iniciar el servidor privado."); process.exitCode = 1; });
      child.once("spawn", () => {
        console.log(`Servidor privado independiente iniciado: ${child.pid}`);
        child.unref();
      });
      return;
    }
    child.on("exit", (code) => { process.exitCode = code ?? 1; });
    if(bootstrapDirectory){
      let restarting=false;
      setInterval(async()=>{
        if(restarting)return;
        try{if((await readFile(resolve(bootstrapDirectory,"restart.txt"),"utf8")).trim()!=="restart")return;}catch{return;}
        restarting=true;
        try{
          await unlink(resolve(bootstrapDirectory,"restart.txt"));
          if(child.exitCode===null){
            if(process.platform==="win32")await new Promise((done,fail)=>{const stop=spawn(resolve(process.env.SystemRoot||"C:/Windows","System32/taskkill.exe"),["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});stop.on("error",fail);stop.on("exit",done);});
            else child.kill("SIGTERM");
          }
          child=launch();child.on("error",()=>{process.exitCode=1;});process.exitCode=0;
        }catch{console.error("No se pudo reiniciar el servidor privado.");}
        finally{restarting=false;}
      },1000);
    }
    for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  } catch { console.error("No se pudo recibir la configuración privada."); process.exitCode = 1; }
}
if (bootstrapDirectory) {
  // The Windows-owned process receives only ciphertext from a unique local directory.
  // The RSA private key and decrypted API key never leave this process's memory.
  await writeFile(resolve(bootstrapDirectory, "public.json"), JSON.stringify({ pid: process.pid, publicKey }), { flag: "wx" });
  let reading = false;
  const stop = () => { clearInterval(poll); clearTimeout(expiry); };
  const poll = setInterval(async () => {
    if (reading) return;
    reading = true;
    try {
      const packet = await readFile(resolve(bootstrapDirectory, "packet.txt"), "utf8");
      stop();
      await unlink(resolve(bootstrapDirectory, "packet.txt"));
      receivePacket(packet);
    } catch (error) {
      if (error.code !== "ENOENT") { stop(); process.exitCode = 1; }
    } finally { reading = false; }
  }, 250);
  const expiry = setTimeout(() => { stop(); process.exitCode = 1; }, 300000);
} else {
  console.log(JSON.stringify({ publicKey }));
  console.log("Waiting for one encrypted configuration packet.");
  const lines = createInterface({ input: process.stdin, terminal: false });
  lines.once("line", (line) => { lines.close(); receivePacket(line); });
}
