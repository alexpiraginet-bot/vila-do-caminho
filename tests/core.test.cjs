const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'public/world.js'),'utf8');
// Test pure code without DOM, exposing it only inside an isolated test VM.
const pure=source.slice(0,source.indexOf("const canvas=document.querySelector('#world')"));
const context=vm.createContext({structuredClone});
vm.runInContext(pure+'globalThis.api={createInitialState,isBlocked,moveResident,validateAction,segmentClear,screenToWorld,CELLS};})();',context);
const a=context.api;
test('one fictional resident, hidden visitor, no personal handle',()=>{const s=a.createInitialState();assert.equal(s.residents.length,1);assert.equal(s.entities.resident.id,'pescador1');assert.equal(s.entities.traveler.visible,false);assert.equal('handle' in s.entities.resident,false);});
test('movement returns a copy and rejects invalid deltas',()=>{const s=a.createInitialState();s.entities.resident.x=13;s.entities.resident.y=18;const n=a.moveResident(s,.2,0);assert.notEqual(n,s);assert.equal(s.entities.resident.x,13);assert.ok(n.entities.resident.x>13);assert.throws(()=>a.moveResident(s,Infinity,0));assert.throws(()=>a.moveResident(s,2,0));});
test('water, shelter, nonfinite and world boundaries blocked',()=>{for(const [x,y] of [[30,18],[2,8],[-36,0],[0,-24],[0,71],[NaN,0]])assert.equal(a.isBlocked(x,y),true);assert.equal(a.isBlocked(13,18),false);});
test('strict action allowlist rejects executable and malformed data',()=>{assert.equal(a.validateAction({at:0,kind:'eval',code:'anything'}),false);assert.equal(a.validateAction(null),false);assert.equal(vm.runInContext("api.validateAction({kind:'set_fire',at:0,lit:true})",context),true);assert.equal(vm.runInContext("api.validateAction({kind:'set_fire',at:0,lit:true,extra:1})",context),false);});
test('screen/world center mapping over 12 viewport and zoom combinations',()=>{for(const [w,h] of [[390,844],[844,390],[1200,800],[432,768]])for(const zoom of [.5,1,2]){const canvas={width:w*2,height:h*2,getBoundingClientRect:()=>({left:0,top:0,width:w,height:h})};const p=a.screenToWorld(canvas,{camera:{x:13,y:18,zoom}},w/2,h/2);assert.equal(p.x,13);assert.equal(p.y,18);}});
test('manifest atlas rects match actual cells',()=>{const m=JSON.parse(fs.readFileSync(path.join(root,'contracts/asset-manifest.json')));for(const asset of m.assets){assert.deepEqual(Array.from(a.CELLS[asset.id]),asset.rect);}});
test('runtime has no network integration or embedded personal handles',()=>{assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|eval)\s*\(/.test(source));assert.ok(!/handle:|consentSource/.test(source));});
