import {env} from "cloudflare:workers";
import {durableAssistantAsset} from "@/lib/assistant-asset-cache.mjs";
export const GET=(request:Request)=>durableAssistantAsset(request,{bucket:env.BRAND_ASSETS});
