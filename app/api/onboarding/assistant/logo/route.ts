import {assistantRuntimeEnv} from "@/lib/assistant-runtime";
import {proxyAssistant} from "@/lib/assistant-proxy.mjs";
export const GET=(request:Request)=>proxyAssistant(request,{env:assistantRuntimeEnv()});
