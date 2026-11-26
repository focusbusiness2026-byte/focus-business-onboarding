import {mkdir,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const require=createRequire(import.meta.url);
await mkdir(new URL("../outputs/",import.meta.url),{recursive:true});
// Type generation only; this placeholder configuration is never deployed.
const config=new URL("../outputs/worker-types.json",import.meta.url);
await writeFile(config,JSON.stringify({name:"focus-onboarding-types",compatibility_date:"2026-11-26",compatibility_flags:["nodejs_compat"],r2_buckets:[{binding:"BRAND_ASSETS",bucket_name:"type-generation-only-assets"}],assets:{directory:"../public",binding:"ASSETS"},d1_databases:[{binding:"DB",database_name:"type-generation-only",database_id:"00000000-0000-4000-8000-000000000000"}]}));
const result=spawnSync(process.execPath,[require.resolve("wrangler/bin/wrangler.js"),"types","worker-configuration.d.ts","--config",fileURLToPath(config)],{stdio:"inherit",env:{...process.env,WRANGLER_SEND_METRICS:"false",WRANGLER_WRITE_LOGS:"false"}});
process.exitCode=result.status??1;
