// Owner-authorized local preview; private configuration crosses stdin only.
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log("Ready for private service configuration (input is hidden).");
let input="";
process.stdin.on("data",async chunk=>{
  input+=chunk;
  if(!/[\r\n]/.test(input))return;
  process.stdin.pause();
  try{
    const configuration=JSON.parse(input.trim());input="";
    if(!/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(configuration.url)||!/^[a-f0-9]{64}$/.test(configuration.token))throw Error("invalid");
    const child=spawn(process.execPath,[fileURLToPath(new URL("./review-server.mjs",import.meta.url))],{windowsHide:true,stdio:["ignore","inherit","inherit"],env:{...process.env,ASSISTANT_SERVICE_URL:configuration.url,ASSISTANT_SERVICE_TOKEN:configuration.token,FOCUS_REVIEW_PORT:"8130"}});
    configuration.token="";
    child.on("exit",code=>{process.exitCode=code??1;});
    for(const signal of ["SIGTERM","SIGINT"])process.on(signal,()=>child.kill(signal));
  }catch{console.error("No se pudo iniciar la revisión privada.");process.exitCode=1;}
  finally{if(process.stdin.isTTY)process.stdin.setRawMode(false);}
});
