import test from 'node:test';
import assert from 'node:assert/strict';

test('sandbox isolates registrations, reuses IDs and never sends access mail', {skip:!process.env.SANDBOX_BASE_URL}, async()=>{
  const base=process.env.SANDBOX_BASE_URL;
  assert.ok(base.startsWith('http://127.0.0.1:'));
  const call=async(path,body)=>{
    for(let attempt=0;attempt<3;attempt++){
      const response=await fetch(base+path,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      const text=await response.text();
      if(response.status===503 && text.includes('worker restarted mid-request')){
        await new Promise(resolve=>setTimeout(resolve,500));continue;
      }
      return {status:response.status,data:JSON.parse(text)};
    }
    throw new Error('Local worker repeatedly restarted');
  };
  assert.equal((await call('/api/sandbox/config')).data.environment,'sandbox');
  assert.equal((await call('/api/onboarding/quick',{email:'real@example.com',companyName:'Bad'})).status,422);
  const payload={email:'qa-flow@example.test',companyName:'Estudio ficticio QA',firstName:'Prueba',lastName:'Segura',website:'https://ficticio.example.test',description:'Prueba de la copia',prospection:true,radar:true,terms:true};
  const first=await call('/api/onboarding/quick',payload);
  assert.equal(first.status,200);
  assert.equal(first.data.account.accessLinkSent,false);
  assert.equal((await call('/api/onboarding/quick',payload)).data.saved.id,first.data.saved.id);
  const rows=(await call('/api/portal',{})).data.records;
  assert.ok(rows.some(row=>row['ID registro']===first.data.saved.id));
  assert.equal((await call('/api/domain-availability',{})).status,403);
});
