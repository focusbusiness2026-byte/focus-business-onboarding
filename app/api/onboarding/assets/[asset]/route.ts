import {env} from "cloudflare:workers";
import {durableAssistantAsset} from "@/lib/assistant-asset-cache.mjs";
import {proxyAssistant} from "@/lib/assistant-proxy.mjs";
import {assistantRuntimeEnv} from "@/lib/assistant-runtime";
export const GET=(request:Request)=>durableAssistantAsset(request,{bucket:env.BRAND_ASSETS,proxy:request=>proxyAssistant(request,{env:assistantRuntimeEnv()})});
