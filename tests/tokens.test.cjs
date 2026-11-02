const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const {validate,render,isAlias,NS,readmeBlock,spliceReadme}=require('../tools/tokens/build.cjs');
const {deltaEHex,contrast}=require('../tools/tokens/color.cjs');
const doc=JSON.parse(fs.readFileSync(path.join(root,'tokens/vila.tokens.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'public/world.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public/style.css'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'contracts/asset-manifest.json'),'utf8'));
// Same isolation as core.test.cjs: only the pure part of the runtime, no DOM.
const pure=source.slice(0,source.indexOf("const canvas=document.querySelector('#world')"));
const context=vm.createContext({structuredClone});
vm.runInContext(pure+'globalThis.api={P,T,WORLD,CELLS};})();',context);
const rt=context.api;
const {tokens,errors}=validate(doc);
const get=p=>{const t=tokens.get(p);assert.ok(t,`missing token ${p}`);return t;};
const hexOf=p=>get(p).resolved.hex;
const ext=t=>t.token.$extensions[NS];

test('token file is valid for the supported DTCG subset, aliases resolve',()=>{
  assert.deepEqual(errors,[]);
  assert.ok(tokens.size>300);
});

test('runtime palette tokens equal P in world.js, name by name',()=>{
  const named=[...tokens.keys()].filter(p=>/^color\.runtime\.[^.]+$/.test(p)).map(p=>p.split('.')[2]);
  assert.deepEqual(new Set(named),new Set(Object.keys(rt.P)));
  for(const [k,hex] of Object.entries(rt.P))assert.equal(hexOf(`color.runtime.${k}`),hex.toLowerCase(),k);
});

test('every #rrggbb literal of world.js is a runtime token, and no runtime token is invented',()=>{
  const literals=new Set((source.match(/#[0-9a-fA-F]{6}\b/g)||[]).map(h=>h.toLowerCase()));
  const runtime=new Set([...tokens.values()].filter(t=>t.path.startsWith('color.runtime.')).map(t=>t.resolved.hex));
  assert.deepEqual(runtime,literals);
});

test('tile, character frame and atlas cells match world.js and the asset manifest',()=>{
  assert.equal(get('dimension.tile').resolved.value,rt.T);
  assert.equal(rt.WORLD.tileSize,rt.T);
  assert.equal(get('number.world.compositionWidthTiles').resolved,rt.WORLD.width);
  assert.equal(get('number.world.compositionHeightTiles').resolved,rt.WORLD.height);
  assert.equal(get('number.world.pathWidthTiles').resolved,rt.WORLD.pathWidth);
  assert.deepEqual([get('dimension.character.frame.width').resolved.value,get('dimension.character.frame.height').resolved.value],manifest.characters.frameSize);
  assert.equal(get('dimension.atlas').resolved.value,manifest.atlas.width);
  for(const asset of manifest.assets){
    assert.equal(get(`dimension.sprite.${asset.id}.width`).resolved.value,rt.CELLS[asset.id][2],asset.id);
    assert.equal(get(`dimension.sprite.${asset.id}.height`).resolved.value,rt.CELLS[asset.id][3],asset.id);
  }
});

test('camera, motion and light numbers are still the ones in world.js',()=>{
  const pick=re=>{const m=re.exec(source);assert.ok(m,String(re));return m.slice(1).map(Number);};
  assert.equal(get('number.camera.zoomMax').resolved,pick(/Math\.min\(([\d.]+),state\.camera\.zoom\+d\)/)[0]);
  assert.equal(get('number.camera.zoomMinFloor').resolved,pick(/Math\.max\(Math\.max\(([\d.]+),24\*canvas\.height/)[0]);
  assert.equal(get('number.camera.zoomStep').resolved,pick(/onclick=\(\)=>zoom\(([\d.]+)\)/)[0]);
  assert.equal(get('number.camera.zoomFollow').resolved,pick(/state\.camera=\{x:a\.x,y:a\.y-2,zoom:([\d.]+)\}/)[0]);
  assert.equal(get('number.camera.zoomStart').resolved,pick(/state\.camera=\{x:11,y:16,zoom:([\d.]+)\}/)[0]);
  assert.equal(get('number.camera.devicePixelRatioMax').resolved,pick(/d=Math\.min\(devicePixelRatio\|\|1,(\d+)\)/)[0]);
  assert.equal(get('number.motion.walkSpeedTilesPerSecond').resolved,pick(/if\(held\)move\(held\[0\]\*dt\*(\d+)/)[0]);
  assert.equal(get('dimension.viewWidthAtZoom1').resolved.value,pick(/s=canvas\.width\/(\d+)\*\(state\.camera\?\.zoom\|\|1\)/)[0]);
  const fps=[[/Math\.floor\(time\*(\d+)\)%3:0/,'walkFrame'],[/const k=Math\.floor\(time\*(\d+)\)%4/,'flameFrame'],[/const phase=Math\.floor\(time\*(\d+)\)/,'waterFrame']];
  for(const [re,name] of fps)assert.ok(Math.abs(get(`duration.${name}`).resolved.value-1000/pick(re)[0])<0.001,name);
  const [r,g,b,a]=pick(/rgba\((\d+),(\d+),(\d+),\$\{night\*([\d.]+)\}\)/);
  const night=get('color.light.nightTint').resolved;
  assert.deepEqual(night.components.map(c=>Math.round(c*255)),[r,g,b]);assert.equal(night.alpha,a);
});

test('UI colours are the values published in style.css',()=>{
  const literals=new Set((css.match(/#[0-9a-fA-F]{3,8}\b/g)||[]).map(h=>{h=h.slice(1).toLowerCase();return '#'+(h.length<=4?[...h].map(c=>c+c).join(''):h);}));
  for(const t of tokens.values()){
    if(!t.path.startsWith('color.ui.'))continue;
    const v=t.resolved,hex=v.alpha===undefined?v.hex:v.hex+Math.round(v.alpha*255).toString(16).padStart(2,'0');
    assert.ok(literals.has(hex),`${t.path} ${hex} not in style.css`);
  }
});

test('every recorded dE2000 and contrast ratio recomputes from the hex values',()=>{
  let checked=0;
  for(const t of tokens.values()){
    const e=ext(t);
    for(const key of ['nearestReference','nearestRuntime','nearestNamed']){
      if(!e[key])continue;
      const other=get(e[key].token);
      const here=key==='nearestRuntime'&&isAlias(t.token.$value)?e.measured:t.resolved.hex;
      assert.ok(Math.abs(deltaEHex(here,other.resolved.hex)-e[key].dE2000)<=0.02,`${t.path} ${key}`);checked++;
    }
    if(e.contrast){
      const bg=e.contrast.composite??hexOf(e.contrast.against);
      assert.ok(Math.abs(contrast(t.resolved.hex,bg)-e.contrast.ratio)<=0.01,`${t.path} contrast`);
      assert.equal(e.contrast.wcagAA_normalText,e.contrast.ratio>=4.5);checked++;
    }
  }
  assert.ok(checked>=200,`only ${checked} checks: the loop must not pass by checking nothing`);
});

test('season colours reuse a runtime colour only under the threshold, and propose new ones only above it',()=>{
  const limit=doc.$extensions[NS].reuseThresholdDE2000;
  for(const t of tokens.values()){
    if(!t.path.startsWith('color.season.')&&!(t.path.startsWith('color.skin.')&&!t.path.startsWith('color.skin.reference.')))continue;
    const e=ext(t);
    if(isAlias(t.token.$value)){assert.equal(e.source,'derived');assert.ok(e.nearestRuntime.dE2000<limit,t.path);assert.equal(t.token.$value,`{${e.nearestRuntime.token}}`);}
    else{assert.equal(e.source,'proposed');assert.ok(e.nearestRuntime.dE2000>=limit,t.path);}
  }
});

test('generated dist files are up to date with the token file',()=>{
  const files=render(doc);
  for(const [name,text] of Object.entries(files))assert.equal(fs.readFileSync(path.join(root,'tokens/dist',name),'utf8'),text,name);
  const js=require('../tokens/dist/vila-tokens.js');
  assert.equal(js.color.runtime.grass,rt.P.grass);assert.ok(Object.isFrozen(js.color.runtime));
  const readme=fs.readFileSync(path.join(root,'tokens/README.md'),'utf8');
  assert.equal(spliceReadme(readme,readmeBlock(doc)),readme,'tokens/README.md numbers block');
});

test('validator rejects broken tokens',()=>{
  const bad={color:{$type:'color',a:{$value:{colorSpace:'srgb',components:[1,0,0],hex:'#00ff00'},$extensions:{[NS]:{source:'runtime',from:'x'}}},
    b:{$value:'{color.missing}',$extensions:{[NS]:{source:'derived',from:'x'}}},c:{$value:'{color.d}',$extensions:{[NS]:{source:'derived',from:'x'}}},
    d:{$value:'{color.c}',$extensions:{[NS]:{source:'derived',from:'x'}}},e:{$value:{colorSpace:'srgb',components:[0,0,0],hex:'#000000'}}},
    size:{f:{$value:{value:4,unit:'px'},$extensions:{[NS]:{source:'runtime',from:'x'}}}}};
  const out=validate(bad).errors.join('\n');
  for(const s of ['color.a: hex','color.b: alias to missing','alias cycle','color.e: $extensions','size.f: missing or unsupported $type'])assert.ok(out.includes(s),s);
});

test('validator rejects dangerous path segments before render can pollute prototypes',()=>{
  const probe='vilaTokenPrototypeProbe';
  assert.equal(Object.hasOwn(Object.prototype,probe),false);
  const token=JSON.stringify({$type:'number',$value:1,$extensions:{[NS]:{source:'derived',from:'test fixture'}}});
  const fixtures=[
    `{"__proto__":{"${probe}":${token}}}`,
    `{"constructor":{"prototype":{"${probe}":${token}}}}`,
    `{"safe":{"__proto__":${token}}}`,
    `{"safe":{"constructor":${token}}}`,
    `{"safe":{"prototype":${token}}}`,
  ];
  try{
    for(const fixture of fixtures){
      const bad=JSON.parse(fixture);
      assert.match(validate(bad).errors.join('\n'),/unsafe name/);
      assert.throws(()=>render(bad),/unsafe name/);
      assert.equal(Object.hasOwn(Object.prototype,probe),false);
      assert.equal(({})[probe],undefined);
    }
  }finally{
    // Keep the test process clean if a future regression mutates Object.prototype.
    delete Object.prototype[probe];
  }
});
