import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { sandboxPrivate } from '../worker/sandbox-private.ts';

function setup(){
  const db=new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0006_happy_spot.sql',import.meta.url),'utf8'));
  const DB={prepare(sql){let args=[];return{bind(...a){args=a;return this;},async first(){return db.prepare(sql).get(...args)||null;}};}};
  return {DB,SANDBOX_OWNER_EMAIL:'owner@example.test',SANDBOX_AUTH_SECRET:'test-only-private-handoff-secret-value'};
}
const base='https://sandbox.example.test';
test('handoff requires the authenticated owner and contains only a short single-use claim',async()=>{
  const env=setup();
  assert.equal((await sandboxPrivate(new Request(base+'/sandbox-access'),env)).status,403);
  const wrong=new Request(base+'/sandbox-access',{headers:{'oai-authenticated-user-id':'user','oai-authenticated-user-email':'other@example.test'}});
  assert.equal((await sandboxPrivate(wrong,env)).status,403);
  const r=await sandboxPrivate(new Request(base+'/sandbox-access',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.test'}}),env);
  assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
  const token=(await r.text()).match(/name="token" value="([^"]+)"/)[1];
  const [raw,signature]=token.split('.');
  assert.equal(createHmac('sha256',env.SANDBOX_AUTH_SECRET).update(raw).digest('base64url'),signature);
  const claims=JSON.parse(Buffer.from(raw,'base64url'));
  assert.equal(claims.tenant,'three-dots');assert.ok(claims.exp*1000-Date.now()<=60000);
  assert.equal(Object.keys(claims).length,5);
});
test('durable state uses compare-and-swap and rejects stale or cross-origin writes',async()=>{
  const env=setup(),url=base+'/_sandbox_state/FICampaigns';
  const put=(value,revision,origin)=>sandboxPrivate(new Request(url,{method:'PUT',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify({value,revision})}),env);
  assert.equal((await (await sandboxPrivate(new Request(url),env)).json()).found,false);
  assert.equal((await put('state-1',0)).status,200);
  assert.equal((await put('stale',0)).status,409);
  assert.equal((await put('wrong revision',99)).status,409);
  assert.equal((await put('cross-origin',1,'https://other.test')).status,403);
  assert.equal((await put('state-2',1)).status,200);
  const row=await (await sandboxPrivate(new Request(url),env)).json();
  assert.equal(row.value,'state-2');assert.equal(row.revision,2);assert.equal(row.sha256.length,64);
  assert.equal((await sandboxPrivate(new Request(base+'/_sandbox_state/production'),env)).status,404);
});
