import {env} from "cloudflare:workers";

type AssistantBindings={ASSISTANT_SERVICE_URL?:string;ASSISTANT_SERVICE_TOKEN?:string};
export function assistantRuntimeEnv(){
  const bindings=env as typeof env & AssistantBindings;
  return {...process.env,
    ASSISTANT_SERVICE_URL:bindings.ASSISTANT_SERVICE_URL??process.env.ASSISTANT_SERVICE_URL,
    ASSISTANT_SERVICE_TOKEN:bindings.ASSISTANT_SERVICE_TOKEN??process.env.ASSISTANT_SERVICE_TOKEN};
}
