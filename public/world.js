
(() => {
"use strict";
/** Deterministic prototype world. Tile coordinates; no network, eval or wall clock. */
const WORLD = Object.freeze({ width: 24, height: 42, tileSize: 16, pathWidth: 1.8, duration: 38, fps: 30 });
const ACTORS = new Set(['pescador1', 'visitante1']);
// Shared coastline and trail functions keep scenery and collision in the same world.
const SHORELINE = Object.freeze([[0, 21], [5, 19], [10, 16.3], [15, 17.6], [20, 19.3], [26, 20.6], [32, 19.4], [37, 21], [42, 24]].map(Object.freeze));
const TRAIL = Object.freeze([[0, 10.6], [5, 8.8], [10, 10.1], [15, 11.4], [20, 9.3], [26, 7.2], [32, 8.8], [37, 7.8], [42, 6.1]].map(Object.freeze));
function interpolateLandmark(points, y) {
  const row = Math.max(0, Math.min(WORLD.height, Number.isFinite(y) ? y : 0));
  const index = points.findIndex((point, i) => i > 0 && row <= point[0]);
  if (index < 1) return points.at(-1)[1];
  const [ay, ax] = points[index - 1], [by, bx] = points[index];
  const t = (row - ay) / (by - ay), smooth = t * t * (3 - 2 * t);
  return ax + (bx - ax) * smooth;
}
function shorelineX(y) {
  return interpolateLandmark(SHORELINE, y);
}
function pathCenterX(y) {
  return interpolateLandmark(TRAIL, y);
}
// Ground footprints. Tree canopies and the shelter roof can overhang walkable ground.
const OBSTACLES = Object.freeze([
  { x: 1, y: 6, width: 7, height: 8 },
  { x: 6.8, y: 16.8, width: 1.4, height: 1.4 },
  { x: 4, y: 16, width: 1, height: 1 },
  { x: 5, y: 18, width: 1, height: 1 },
  { x: 14, y: 5, width: 1, height: 1 },
  { x: 3, y: 25, width: 1, height: 1 },
  { x: 15, y: 35, width: 1, height: 1 },
  { x: 18.5, y: 19.5, width: 4, height: 2 },
  { x: 17, y: 21, width: 2, height: 1.5 }
]);

function isBlocked(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return true;
  return x < -35 || x >= shorelineX(y) - 0.15 || y < -23 || y >= 71 ||
    OBSTACLES.some(box => x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height);
}

function createInitialState() {
  return {
    schemaVersion: 1, mapVersion: 'topdown-v2', time: 0, tick: 0, mode: 'director',
    entities: {
      resident: { id: 'pescador1', role: 'resident', name: 'Pescador',
        occupation: 'pescador', identityStatus: 'fictional',
        x: 8.5, y: 14.5, facing: 'up', visible: true, action: 'idle' },
      traveler: { id: 'visitante1', role: 'visitor', name: null, x: 11.5, y: 29.5,
        facing: 'up', visible: false, action: 'idle' }
    },
    props: {
      fire: { x: 7, y: 17, lit: true }, jar: { x: 4, y: 16 }, basket: { x: 5, y: 18 },
      bread: { x: 8.5, y: 14.5, portions: 1, shared: false, heldBy: 'pescador1', owners: ['pescador1'] },
      shelter: { x: 1, y: 6, width: 7, height: 8, stage: 'rudimentary', reinforced: false },
      boat: { x: 20, y: 20, owner: 'pescador1', usable: false },
      net: { x: 17, y: 21, owner: 'pescador1', usable: false },
      olives: [{ x: 14, y: 5 }, { x: 3, y: 25 }, { x: 15, y: 35 }]
    },
    residents: ['pescador1'], visitors: [],
    caption: '', dialogue: null, reflection: null,
    camera: { x: 12, y: 64 / 3, zoom: 1 }, lighting: { night: 0 }, nextNeed: null,
    fictionLabel: 'Ficção inspirada nos ensinamentos de Cristo'
  };
}

function plain(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = Object.getPrototypeOf(value);
  return (p === Object.prototype || p === null) && Reflect.ownKeys(value).every(key =>
    typeof key === 'string' && !['__proto__', 'constructor', 'prototype'].includes(key) &&
    Object.getOwnPropertyDescriptor(value, key)?.get === undefined &&
    Object.getOwnPropertyDescriptor(value, key)?.set === undefined);
}
function fields(value, names) {
  return plain(value) && Object.keys(value).length === names.length && names.every(key =>
    Object.hasOwn(value, key)) && Object.keys(value).every(key => names.includes(key));
}
function interval(action) {
  return Number.isFinite(action.duration) && action.duration > 0 &&
    action.at + action.duration <= WORLD.duration;
}
function text(value, limit = 220) {
  return typeof value === 'string' && value.length > 0 && value.length <= limit &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
}
function segmentClear(a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 16));
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    if (isBlocked(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p)) return false;
  }
  return true;
}

/** Strict allowlist. This is data validation, never a prompt-to-code executor. */
function validateAction(action) {
  if (!plain(action) || !Number.isFinite(action.at) || action.at < 0 || action.at > WORLD.duration) return false;
  switch (action.kind) {
    case 'walk':
      return fields(action, ['kind', 'at', 'duration', 'actor', 'path']) && interval(action) && ACTORS.has(action.actor) &&
        Array.isArray(action.path) && action.path.length >= 2 && action.path.length <= 16 &&
        action.path.every(point => fields(point, ['x', 'y']) && !isBlocked(point.x, point.y)) &&
        action.path.slice(1).every((point, i) => segmentClear(action.path[i], point));
    case 'say':
      return fields(action, ['kind', 'at', 'duration', 'actor', 'text']) && interval(action) &&
        ACTORS.has(action.actor) && text(action.text);
    case 'set_fire':
      return fields(action, ['kind', 'at', 'lit']) && typeof action.lit === 'boolean';
    case 'share_bread':
      return fields(action, ['kind', 'at', 'from', 'to']) &&
        action.from === 'pescador1' && action.to === 'visitante1';
    case 'build':
      return fields(action, ['kind', 'at', 'target', 'stage']) &&
        action.target === 'shelter' && action.stage === 'reinforced';
    case 'reflect':
      return fields(action, ['kind', 'at', 'duration', 'reference', 'text', 'note']) && interval(action) &&
        action.reference === 'Mateus 25:35–40' && text(action.text) &&
        action.note === 'Aplicação editorial; não é citação.';
    default: return false;
  }
}

/** Pure manual movement. Swept collision prevents large steps tunneling through a tile. */
function moveResident(state, dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    throw new RangeError('Movement must be finite and at most one tile per axis.');
  }
  const next = structuredClone(state), actor = next.entities.resident;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 16));
  let moved = false;
  for (let i = 0; i < steps; i++) {
    const x = actor.x + dx / steps, y = actor.y + dy / steps;
    // Require the neighboring axes to be clear too, avoiding diagonal corner cutting.
    if (isBlocked(x, y) || isBlocked(x, actor.y) || isBlocked(actor.x, y)) break;
    actor.x = x; actor.y = y; moved = true;
  }
  actor.action = moved ? 'walk' : 'idle';
  if (moved) actor.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  next.mode = 'explore';
  if (next.props.bread.heldBy === actor.id) {
    next.props.bread.x = actor.x; next.props.bread.y = actor.y;
  }
  return next;
}


function deepFreeze(value) {
  Object.values(value).forEach(child => { if (child && typeof child === 'object') deepFreeze(child); });
  return Object.freeze(value);
}

const EPISODE = deepFreeze({
  id: 'ep01-acolher', version: 2, duration: WORLD.duration,
  actions: [
    { kind: 'set_fire', at: 0, lit: true },
    { kind: 'walk', at: 0, duration: 3, actor: 'pescador1', path: [{ x: 8.5, y: 14.5 }, { x: 7.5, y: 14.5 }, { x: 8.5, y: 14.5 }] },
    { kind: 'walk', at: 8, duration: 3, actor: 'visitante1', path: [{ x: 11.5, y: 29.5 }, { x: 11.5, y: 22.5 }] },
    { kind: 'say', at: 8, duration: 3, actor: 'visitante1', text: 'Posso passar a noite aqui?' },
    { kind: 'walk', at: 15, duration: 4, actor: 'pescador1', path: [{ x: 8.5, y: 14.5 }, { x: 6.5, y: 14.5 }, { x: 6.5, y: 21.5 }] },
    { kind: 'walk', at: 15, duration: 4, actor: 'visitante1', path: [{ x: 11.5, y: 22.5 }, { x: 9.5, y: 22.5 }, { x: 9.5, y: 21.5 }, { x: 8, y: 21.5 }] },
    { kind: 'share_bread', at: 21, from: 'pescador1', to: 'visitante1' },
    { kind: 'reflect', at: 23, duration: 7, reference: 'Mateus 25:35–40',
      text: 'Servir a Cristo também nos chama a acolher e repartir.', note: 'Aplicação editorial; não é citação.' }
  ],
  captions: [
    { at: 0, until: 4, text: 'Ele só tinha abrigo\npara uma pessoa.' },
    { at: 4, until: 8, text: 'Então ouviu alguém\npedir ajuda.' },
    { at: 8, until: 11, text: 'Posso passar a noite aqui?' },
    { at: 11, until: 15, text: 'Mal cabia um.\nEle hesitou.' },
    { at: 15, until: 19, text: 'Então, abriu espaço\njunto ao fogo.' },
    { at: 19, until: 23, text: 'E dividiu o pão\nque tinha.' },
    { at: 23, until: 30, text: 'Naquela noite, o viajante encontrou calor, pão\ne um lugar para descansar.' },
    { at: 30, until: 34, text: 'Antes da chuva, ainda faltava\nreforçar o abrigo.' },
    { at: 34, until: 38, text: 'O que reforçar primeiro:\na cobertura ou a entrada?' }
  ]
});

for (const action of EPISODE.actions) {
  if (!validateAction(action)) throw new Error(`Invalid authored action: ${action.kind}`);
}

function locate(path, progress) {
  const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
  let distance = lengths.reduce((a, b) => a + b, 0) * progress;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] || i === lengths.length - 1) {
      const a = path[i], b = path[i + 1], ratio = lengths[i] ? Math.min(1, distance / lengths[i]) : 1;
      const dx = b.x - a.x, dy = b.y - a.y;
      return { x: a.x + dx * ratio, y: a.y + dy * ratio,
        facing: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up') };
    }
    distance -= lengths[i];
  }
}

/** Rebuild from authored data for every seek; never depend on previous playback. */
function evaluateEpisode(timeSeconds) {
  if (!Number.isFinite(timeSeconds)) throw new TypeError('Episode time must be finite.');
  const t = Math.max(0, Math.min(WORLD.duration, timeSeconds));
  const state = createInitialState();
  state.time = t;
  state.tick = Math.floor(t * WORLD.fps);
  state.entities.traveler.visible = t >= 8;
  if (t >= 8) state.visitors = ['visitante1'];
  state.lighting.night = Math.min(0.72, t / 30 * 0.72);
  if (t >= 30) state.nextNeed = 'reinforce_shelter_before_rain';
  const caption = EPISODE.captions.find(cue => t >= cue.at && t < cue.until) || EPISODE.captions.at(-1);
  state.caption = caption.text;
  for (const action of EPISODE.actions) {
    if (t < action.at) continue;
    switch (action.kind) {
      case 'set_fire': state.props.fire.lit = action.lit; break;
      case 'walk': {
        const actor = action.actor === 'pescador1' ? state.entities.resident : state.entities.traveler;
        Object.assign(actor, locate(action.path, Math.min(1, (t - action.at) / action.duration)));
        actor.action = t < action.at + action.duration ? 'walk' : 'idle';
        break;
      }
      case 'say':
        if (t < action.at + action.duration) state.dialogue = { actor: action.actor, text: action.text, fictional: true };
        break;
      case 'share_bread':
        Object.assign(state.props.bread, { portions: 2, shared: true, heldBy: null, owners: [action.from, action.to],
          x: (state.entities.resident.x + state.entities.traveler.x) / 2,
          y: (state.entities.resident.y + state.entities.traveler.y) / 2 });
        state.entities.resident.facing = 'right'; state.entities.traveler.facing = 'left';
        if (t < 23) state.entities.resident.action = 'share';
        break;
      case 'build':
        state.props.shelter.stage = action.stage; state.props.shelter.reinforced = true;
        break;
      case 'reflect':
        if (t < action.at + action.duration) state.reflection = { reference: action.reference, text: action.text, note: action.note };
        break;
    }
  }
  if (state.props.bread.heldBy === 'pescador1') {
    state.props.bread.x = state.entities.resident.x;
    state.props.bread.y = state.entities.resident.y;
  }
  return state;
}

/* Fixed procedural fallback atlas. A local, generated modular sprite kit may
 * replace six props through VilaVisualAssets. Map, collision and actor state
 * remain independent from artwork. See assets/shore-kit.json for provenance. */
const T = 16;
const P = Object.freeze({grass:'#b3ae3f',grassHi:'#c4bd4a',grassLo:'#7b842d',grassDark:'#617329',
  path:'#e6ac62',pathHi:'#efc079',pathLo:'#c48a46',ink:'#4a3825',soil:'#947335',
  water:'#1477a1',waterDeep:'#19688a',waterHi:'#3595b8',foam:'#85b8aa',
  leaf:'#71882c',leafHi:'#9ba33c',leafLo:'#4c6b2a',leafDeep:'#344c27',
  wood:'#8a592d',woodHi:'#c68c43',woodLo:'#634621',straw:'#c3a44b',strawHi:'#dfc66b',strawLo:'#9c7b31',
  cream:'#e4d4a1',creamHi:'#f4e7b9',creamLo:'#b5a171',terra:'#a36035',terraHi:'#d28b4b',
  skin:'#bd8854',skinHi:'#dfa872',skinLo:'#8f603b',stone:'#8e8b6b',stoneHi:'#b0aa83',stoneLo:'#65684e'});
const CELLS={grass:[0,0,16,16],sand:[16,0,16,16],path:[32,0,16,16],water:[48,0,16,16],
  shelter:[0,24,144,136],olive:[152,24,88,104],boat:[248,24,88,48],net:[344,24,48,56],
  jar:[248,80,28,36],basket:[280,80,28,28],firepit:[312,88,48,32],bread:[368,88,20,16],
  rocks:[248,128,48,32],reeds:[304,128,32,32],bush:[344,128,32,24]};
let cachedAtlas,cachedTerrain;
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function hash(x,y,seed=0){let n=Math.imul(x+7919+seed*31,374761393)^Math.imul(y+104729,668265263);n=Math.imul(n^(n>>>13),1274126177);return(n^(n>>>16))>>>0;}
function poly(c,points,color){c.fillStyle=color;const lo=Math.ceil(Math.min(...points.map(p=>p[1]))),hi=Math.ceil(Math.max(...points.map(p=>p[1])));for(let y=lo;y<hi;y++){const xs=[];for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[j],b=points[i];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let k=0;k<xs.length;k+=2)c.fillRect(Math.floor(xs[k]),y,Math.ceil(xs[k+1])-Math.floor(xs[k]),1);}}
function ellipse(c,cx,cy,rx,ry,color){c.fillStyle=color;for(let y=-ry;y<=ry;y++){const dx=Math.floor(rx*Math.sqrt(Math.max(0,1-y*y/(ry*ry))));c.fillRect(Math.round(cx-dx),Math.round(cy+y),2*dx+1,1);}}
function inside(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function local(c,x,y,draw){c.save();c.translate(x,y);draw();c.restore();}
function tuft(c,x,y,seed=0){const h=hash(x,y,seed);rect(c,x,y+3,5,1,P.grassLo);rect(c,x+1,y,1,4,P.grassLo);rect(c,x+3,y-2,1,5,h%2?P.grassHi:P.grassDark);rect(c,x+5,y+1,1,3,P.grassLo);rect(c,x+2,y+3,1,1,P.grassHi);}
function stone(c,x,y,w,h){poly(c,[[x,y+3],[x+3,y],[x+w-4,y],[x+w,y+3],[x+w-1,y+h],[x+2,y+h]],P.stoneLo);poly(c,[[x+1,y+3],[x+4,y+1],[x+w-4,y+1],[x+w-2,y+4],[x+w-4,y+h-2],[x+3,y+h-2]],P.stone);rect(c,x+4,y+2,w-9,2,P.stoneHi);rect(c,x+w-4,y+5,2,2,P.stoneLo);}

function drawShelter(c){
  // Ground shadow and thick timber feet anchor the shelter to the terrain.
  ellipse(c,76,120,65,13,'#788033');poly(c,[[19,64],[112,60],[134,117],[111,131],[15,120]],'#69552c');
  poly(c,[[24,68],[111,68],[119,118],[26,117]],'#876a34');
  for(let y=76;y<118;y+=4)rect(c,26,y,90,1,y%3? '#9a7a3c':'#70552b');
  // Back reed wall and shaded sleeping area visible under the open eaves.
  poly(c,[[25,57],[108,55],[111,97],[28,96]],'#655025');
  for(let x=30;x<108;x+=4){rect(c,x,61,2,35,x%3? '#977b3b':'#80672e');rect(c,x+1,64,1,29,'#b19a50');}
  rect(c,31,78,74,3,'#594322');rect(c,29,96,81,4,'#4d3b23');
  poly(c,[[41,101],[82,100],[94,112],[47,115]],'#625b35');
  poly(c,[[44,101],[78,101],[86,110],[47,111]],P.creamLo);rect(c,46,103,31,2,P.cream);
  // A basket in the interior is original prop dressing, independent of the scene basket.
  ellipse(c,99,101,9,5,'#3d3220');rect(c,90,100,17,13,P.wood);ellipse(c,99,99,9,4,P.strawHi);
  ellipse(c,99,100,6,2,'#5c4321');for(let y=105;y<113;y+=3)rect(c,91,y,15,1,P.strawHi);
  // Four pillars: dark outline, warm sunlit edge, joints and exposed feet.
  [[20,53,69],[111,52,72],[32,54,52]].forEach(([x,y,h])=>{rect(c,x-2,y-2,8,h+4,P.ink);rect(c,x,y,4,h,P.wood);rect(c,x,y,1,h,P.woodHi);rect(c,x-3,y+h-6,10,3,P.woodLo);});
  // Sloped thatch roof, thick shaded lip and uneven reed ends.
  const roof=[[2,43],[36,4],[103,8],[137,55],[125,71],[15,66]];
  poly(c,roof.map(([x,y])=>[x+2,y+5]),P.ink);poly(c,roof,P.strawLo);
  const face=[[6,43],[38,9],[102,13],[130,55],[123,64],[16,59]];
  poly(c,face,P.straw);
  const upper=[[7,42],[39,9],[101,13],[108,23],[23,51]];poly(c,upper,'#d0b257');
  // Long straw bundles and broad highlights; no dark per-pixel noise.
  for(let y=11;y<65;y++)for(let x=5;x<132;x++)if(inside(x,y,face)){
    const line=(x+Math.floor(y*.48))%8, patch=hash(Math.floor(x/5),Math.floor(y/9),7);
    if(line===0)rect(c,x,y,1,1,'#a88835');
    else if(line===2&&patch%4!==0)rect(c,x,y,1,1,'#dfc469');
    else if(patch%23===0&&line>3&&y%9<5)rect(c,x,y,1,1,'#d5b859');
  }
  poly(c,[[20,43],[115,48],[117,51],[18,46]],'#ac8c3e');
  poly(c,[[20,43],[115,48],[116,49],[19,44]],'#d9bd65');
  // Ridge, lashing, fascia and ragged overhang.
  poly(c,[[35,3],[104,7],[108,13],[37,10]],P.woodLo);poly(c,[[37,4],[103,8],[105,10],[38,7]],P.woodHi);
  poly(c,[[14,59],[126,64],[124,71],[15,66]],'#9e7e37');
  for(let x=16;x<126;x+=3){const h=hash(x,9);rect(c,x,62+(x-16)/30,1,4+h%4,h%2?P.straw:P.strawHi);}
  poly(c,[[13,65],[125,70],[125,76],[15,70]],P.woodLo);poly(c,[[15,66],[124,71],[124,73],[15,68]],P.woodHi);
  for(const x of [24,58,96,119]){rect(c,x,66+(x/34),2,6,P.creamLo);rect(c,x-1,68+(x/34),4,1,P.cream);}
}

function drawOlive(c){
  ellipse(c,46,91,39,11,'#7b832b');ellipse(c,44,88,29,8,'#6b7729');
  // Crooked trunk and exposed roots, seen below the large canopy.
  poly(c,[[39,42],[49,40],[47,63],[52,83],[62,91],[48,89],[43,83],[37,94],[29,95],[37,84],[39,68]],P.ink);
  poly(c,[[42,43],[47,44],[44,66],[48,83],[56,88],[47,86],[42,79],[37,90],[35,91],[40,78]],P.wood);
  rect(c,41,58,2,22,P.woodHi);rect(c,45,72,2,10,P.woodLo);
  poly(c,[[42,66],[27,56],[22,41],[26,41],[31,52],[44,59]],P.woodLo);
  poly(c,[[45,59],[58,45],[64,35],[67,37],[60,53],[47,66]],P.woodLo);
  const clusters=[[18,32,17,17],[35,19,20,18],[58,22,19,18],[69,39,16,17],[51,45,22,18],[28,48,21,16],[12,46,12,12],[39,34,25,22]];
  function clump(cx,cy,rx,ry,seed,color){
    const pts=[];
    for(let i=0;i<24;i++){const angle=i*Math.PI/12,rad=.85+(hash(i,seed,21)%29)/100;
      pts.push([Math.round(cx+Math.cos(angle)*rx*rad),Math.round(cy+Math.sin(angle)*ry*rad)]);}
    poly(c,pts,color);
  }
  clusters.forEach(([x,y,rx,ry],i)=>clump(x,y,rx,ry,i,P.leafDeep));
  clusters.forEach(([x,y,rx,ry],i)=>{
    clump(x-1,y-2,rx-2,ry-3,i,i%3?P.leaf:P.leafLo);
    clump(x-4,y-5,Math.max(4,rx-7),Math.max(4,ry-8),i+13,i%2?'#9da64c':'#7e9550');
  });
  // Leaves occur in cohesive clusters, in cool olive and warm golden light.
  for(let y=5;y<62;y+=3)for(let x=3;x<83;x+=3){
    if(!clusters.some(([cx,cy,rx,ry])=>((x-cx)/(rx-4))**2+((y-cy)/(ry-4))**2<1))continue;
    const h=hash(x,y,19);
    if(h%4===0){rect(c,x,y,3,2,'#a7ad51');rect(c,x+1,y-1,2,1,'#a7ad51');}
    else if(h%7===0)rect(c,x,y,3,2,'#537336');
    else if(h%11===0){rect(c,x,y,2,3,'#869b57');rect(c,x+2,y,2,1,'#869b57');}
  }

}
function drawBoat(c){
  ellipse(c,46,34,40,7,'#125e7d');
  const hull=[[1,24],[14,9],[57,4],[83,13],[87,22],[72,36],[26,41],[9,34]];
  poly(c,hull,P.ink);poly(c,[[5,23],[17,12],[57,8],[79,15],[82,22],[70,32],[27,37],[12,31]],'#8c552a');
  poly(c,[[10,22],[21,15],[58,11],[75,17],[77,22],[67,28],[29,32],[15,28]],'#543d25');
  poly(c,[[16,22],[25,18],[57,14],[70,18],[70,22],[63,26],[30,28],[20,27]],'#a97838');
  for(let y=18;y<29;y+=3)rect(c,27,y,33,1,P.woodLo);
  poly(c,[[8,22],[18,13],[59,7],[80,14],[80,17],[58,11],[20,17],[11,25]],P.woodHi);
  poly(c,[[13,30],[29,35],[68,30],[80,21],[81,24],[70,34],[27,39],[12,33]],'#be8a44');
  [[29,16],[52,13]].forEach(([x,y])=>{poly(c,[[x,y],[x+5,y-1],[x+8,y+16],[x+3,y+17]],P.woodLo);poly(c,[[x,y],[x+3,y],[x+6,y+14],[x+4,y+14]],'#c7984c');});
  poly(c,[[42,20],[74,39],[72,42],[40,23]],P.ink);poly(c,[[43,20],[73,39],[72,40],[41,22]],P.woodHi);
  poly(c,[[69,36],[80,41],[78,46],[71,42]],P.wood);rect(c,16,17,3,2,P.cream);
}
function drawNet(c){
  const net=[[4,8],[35,1],[46,45],[18,54],[2,33]];
  poly(c,net,'#9a9460');
  for(let y=3;y<52;y++)for(let x=2;x<46;x++)if(inside(x,y,net)){
    if((x+y)%7===0||(x-y+56)%7===0)rect(c,x,y,1,1,P.woodLo);
    else if((x+y)%7===1||(x-y+56)%7===1)rect(c,x,y,1,1,P.creamLo);
  }
  for(let y=0;y<4;y++)poly(c,[[4,8+y],[35,1+y],[36,2+y],[4,9+y]],y%2?P.cream:P.woodHi);
  [[4,9],[15,6],[26,3],[35,3],[39,15],[42,27],[45,41]].forEach(([x,y],i)=>{rect(c,x-2,y-2,5,4,P.ink);rect(c,x-1,y-1,3,2,i%2?P.terraHi:P.cream);});
}
function drawJar(c){ellipse(c,14,32,12,3,'#7b772f');poly(c,[[9,2],[19,2],[19,8],[24,12],[25,24],[21,31],[8,31],[4,24],[4,13],[9,8]],P.ink);poly(c,[[10,4],[18,4],[17,10],[21,13],[22,24],[19,29],[9,28],[7,23],[7,13],[11,9]],P.terra);poly(c,[[11,10],[16,10],[16,28],[10,26],[8,22],[8,14]],P.terraHi);rect(c,10,12,2,11,'#e1a15b');rect(c,20,15,2,9,'#7c462a');ellipse(c,14,4,6,3,P.terraHi);ellipse(c,14,4,4,1,P.ink);poly(c,[[22,12],[27,12],[27,22],[23,24],[22,21],[24,20],[24,15],[22,15]],P.woodLo);}
function drawBasket(c){ellipse(c,14,23,13,4,'#7f7d36');poly(c,[[1,6],[26,6],[23,24],[5,24]],P.ink);poly(c,[[3,7],[24,7],[21,22],[7,22]],P.woodHi);for(let y=9;y<22;y+=3)rect(c,5,y,17,1,P.woodLo);for(let x=6;x<22;x+=4)rect(c,x,8,1,13,P.strawHi);ellipse(c,14,6,13,5,P.strawHi);ellipse(c,14,6,9,3,P.woodLo);rect(c,8,4,5,3,P.creamLo);rect(c,13,3,6,3,P.cream);}
function drawFirepit(c){ellipse(c,24,20,23,10,'#8c8038');ellipse(c,24,19,16,8,'#55452a');[[9,7,10,7],[22,3,12,7],[33,8,10,7],[36,18,10,8],[22,23,12,8],[9,23,10,7],[1,16,10,8]].forEach(p=>stone(c,...p));poly(c,[[12,19],[15,16],[35,23],[33,27]],P.woodLo);poly(c,[[13,20],[15,18],[34,24],[33,25]],P.woodHi);poly(c,[[16,25],[13,22],[29,10],[32,13]],P.woodLo);rect(c,20,18,11,4,'#9c4e24');}
function drawCharacter(c,role,dir,frame){
  const walk=frame===1?1:frame===2?-1:0,bob=frame===1?1:0;
  ellipse(c,16,42,12,4,'#788033');
  // Sandals and the two independently displaced legs.
  poly(c,[[10,32],[14,32],[14,40+walk],[9,41+walk],[8,39+walk]],P.ink);
  poly(c,[[19,32],[23,32],[25,39-walk],[22,41-walk],[18,39-walk]],P.ink);
  rect(c,10,35,3,3+walk,P.skinLo);rect(c,20,35,3,3-walk,P.skinLo);
  const robe=role? '#899252':P.cream, hi=role?'#a4aa6c':P.creamHi,lo=role?'#596e3f':P.creamLo;
  poly(c,[[9,14-bob],[23,14-bob],[27,21-bob],[25,35],[20,38],[9,37],[5,34],[6,21-bob]],P.ink);
  poly(c,[[10,15-bob],[22,15-bob],[25,22-bob],[22,34],[19,36],[10,35],[8,32],[8,22-bob]],robe);
  poly(c,[[10,17-bob],[13,17-bob],[12,33],[10,35],[8,32]],hi);
  poly(c,[[21,18-bob],[24,22-bob],[21,34],[18,35],[18,26]],lo);
  rect(c,9,24-bob,14,4,role?'#685637':'#92582e');rect(c,10,24-bob,12,1,role?'#947642':'#ba7b42');
  rect(c,19,27-bob,3,6,role?'#685637':'#92582e');
  // Hands remain distinct from the cream sleeve.
  rect(c,5,22-bob,4,7+walk,P.skinLo);rect(c,6,22-bob,2,6+walk,P.skinHi);
  rect(c,24,22-bob,4,7-walk,P.skinLo);rect(c,24,22-bob,2,6-walk,P.skin);
  // Hair, face and beard are generic pixels, not a person's likeness.
  poly(c,[[11,3-bob],[20,3-bob],[24,7-bob],[23,15-bob],[20,20-bob],[12,19-bob],[8,14-bob],[8,8-bob]],P.ink);
  poly(c,[[12,6-bob],[20,6-bob],[22,10-bob],[20,15-bob],[12,15-bob],[10,11-bob]],P.skin);
  rect(c,12,7-bob,4,5,P.skinHi);rect(c,19,10-bob,3,4,P.skinLo);
  poly(c,[[10,5-bob],[13,2-bob],[20,3-bob],[23,6-bob],[22,9-bob],[19,7-bob],[13,7-bob],[11,10-bob],[9,9-bob]],'#392d20');
  [[11,4],[16,3],[20,5],[9,8]].forEach(([x,y])=>rect(c,x,y-bob,2,2,'#51402a'));
  if(dir===3){poly(c,[[10,6-bob],[22,6-bob],[22,15-bob],[19,18-bob],[12,17-bob],[9,12-bob]],'#3f3122');rect(c,12,8-bob,2,5,'#57402a');}
  else {poly(c,[[10,12-bob],[13,14-bob],[20,14-bob],[23,12-bob],[21,19-bob],[17,21-bob],[12,19-bob]],'#493421');rect(c,13,15-bob,5,1,'#63492b');
    if(dir===0){rect(c,12,10-bob,2,1,P.ink);rect(c,19,10-bob,2,1,P.ink);rect(c,16,10-bob,1,3,P.skinHi);}
    if(dir===1){rect(c,8,10-bob,4,3,P.skinHi);rect(c,10,9-bob,2,1,P.ink);rect(c,20,7-bob,3,8,'#392d20');}
    if(dir===2){rect(c,22,10-bob,3,3,P.skinHi);rect(c,21,9-bob,2,1,P.ink);rect(c,9,7-bob,3,8,'#392d20');}
  }
  if(role){poly(c,[[22,16-bob],[28,18-bob],[29,29-bob],[24,32-bob],[22,28-bob]],P.woodLo);rect(c,24,20-bob,3,8,P.terra);rect(c,23,18-bob,3,2,P.woodHi);}
}
function createAtlas(){
  if(cachedAtlas)return cachedAtlas;
  const a=document.createElement('canvas');a.width=512;a.height=512;const c=a.getContext('2d');c.imageSmoothingEnabled=false;
  ['grass','path','path','water'].forEach((key,i)=>{rect(c,i*16,0,16,16,P[key]);for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(hash(x,y,i)%9===0)rect(c,i*16+x,y,2,1,i===3?P.waterHi:i===0?P.grassHi:P.pathHi);});
  local(c,0,24,()=>drawShelter(c));local(c,152,24,()=>drawOlive(c));local(c,248,24,()=>drawBoat(c));local(c,344,24,()=>drawNet(c));
  local(c,248,80,()=>drawJar(c));local(c,280,80,()=>drawBasket(c));local(c,312,88,()=>drawFirepit(c));
  local(c,368,88,()=>{poly(c,[[1,7],[4,3],[14,2],[18,5],[19,10],[16,13],[4,13],[1,10]],P.woodLo);poly(c,[[3,6],[6,3],[13,3],[17,6],[16,10],[5,11],[3,9]],'#d7ad60');rect(c,6,4,2,4,P.creamLo);rect(c,11,4,2,4,P.creamLo);});
  local(c,248,128,()=>{stone(c,1,14,19,12);stone(c,15,4,21,15);stone(c,30,16,16,11);});
  local(c,304,128,()=>{for(let i=0;i<8;i++){const x=3+i*3,y=6+hash(i,2)%8;rect(c,x,y,1,27-y,P.grassDark);rect(c,x-1,y,3,7,P.woodLo);rect(c,x,y,1,5,P.strawHi);rect(c,x-2,20,1,9,P.leaf);rect(c,x+2,18,1,10,P.leafLo);}});
  local(c,344,128,()=>{for(let i=0;i<6;i++)ellipse(c,7+i*4,10+hash(i,4)%7,6,6,i%2?P.leaf:P.leafLo);for(let i=0;i<10;i++)rect(c,3+hash(i,4)%26,5+hash(i,7)%12,3,2,P.leafHi);});
  for(let role=0;role<2;role++)for(let dir=0;dir<4;dir++)for(let f=0;f<3;f++)local(c,role*112+f*32,176+dir*48,()=>drawCharacter(c,role,dir,f));
  cachedAtlas=a;return a;
}
function sprite(c,a,name,x,y){
  const[sx,sy,w,h]=CELLS[name];
  const kit=globalThis.VilaVisualAssets;
  const scale=({jar:.72,basket:.9,boat:.88,net:.9})[name]||1;
  const dw=Math.round(w*scale),dh=Math.round(h*scale),dx=Math.round(x+(w-dw)/2),dy=Math.round(y+h-dh);
  if(kit?.isReady()&&['shelter','olive','jar','basket','boat','net'].includes(name)){
    // Small stepped contact shadow, aligned to the existing sprite baseline.
    c.save();c.globalAlpha=.18;c.fillStyle=P.ink;
    c.fillRect(Math.round(dx+dw*.2),dy+dh-4,Math.round(dw*.6),5);
    c.fillRect(Math.round(dx+dw*.32),dy+dh+1,Math.round(dw*.36),2);c.restore();
    if(kit.drawSprite(c,name,dx,dy,dw,dh))return;
  }
  c.drawImage(a,sx,sy,w,h,Math.round(x),Math.round(y),w,h);
}
function pathWidth(){return WORLD.pathWidth;}
function terrainBase(){
  if(cachedTerrain)return cachedTerrain;
  const a=document.createElement('canvas');a.width=416;a.height=736;const c=a.getContext('2d');
  rect(c,0,0,416,736,P.grass);
  // All terrain detail is seeded by world coordinates and immutable across episodes.
  for(let py=-32;py<704;py++)for(let px=-16;px<400;px++){
    const y=py/16,x=px/16,shore=shorelineX(y),path=pathCenterX(y),h=hash(px,py,31);
    const d=x-shore,pd=Math.abs(x-path),pw=pathWidth(y),edge=(hash(Math.floor(px/3),Math.floor(py/3),6)%5)/35;
    const broad=Math.sin(px*.027+Math.sin(py*.031))*Math.cos(py*.023);
    const cluster=hash(Math.floor(px/3),Math.floor(py/3),31);
    let color=broad>.57?'#afaa3c':broad<-.57?'#b8b344':P.grass;
    if(d>=0)color=d>1.6?P.waterDeep:P.water;
    else if(d>-.27-edge)color=d>-.12?P.pathLo:P.path;
    else if(pd<pw/2+edge){
      color=P.path;
      if(cluster%37===0&&px%3<2&&py%3<2)color=P.pathHi;
      if(cluster%67===0&&px%3<2&&py%3<2)color='#dca45a';
      if(pd>pw/2-.1&&h%5===0)color=P.pathLo;
    }else if(cluster%31===0&&px%3<2&&py%3<2)color='#beb748';
    else if(cluster%53===0&&px%3<2&&py%3<2)color='#a4a13a';
    rect(c,px+16,py+32,1,1,color);
  }
  // Tufts form readable clusters instead of a uniform noise layer.
  for(let y=-1;y<44;y++)for(let x=-1;x<25;x++){
    const h=hash(x,y,12),px=x*16+h%12,py=y*16+(h>>>4)%12;
    if(x<shorelineX(y)-.7&&Math.abs(x-pathCenterX(y))>1.2&&h%3===0)tuft(c,px+16,py+32,h);
  }
  cachedTerrain=a;return a;
}
let expandedTerrain=null,expandedTerrainKitReady=false;
function terrain(c,a,time){
  const kitReady=Boolean(globalThis.VilaVisualAssets?.isReady());
  if(!expandedTerrain||expandedTerrainKitReady!==kitReady){
    expandedTerrainKitReady=kitReady;
    expandedTerrain=document.createElement('canvas');expandedTerrain.width=1536;expandedTerrain.height=1536;
    const e=expandedTerrain.getContext('2d');e.translate(576,384);
    for(let y=-24;y<72;y++)for(let x=-36;x<60;x++){
      const h=hash(x+101,y+101,5),water=x>=shorelineX(y);
      rect(e,x*16,y*16,16,16,water?(h%4?'#287f9b':'#2c86a0'):(h%4?'#aeb454':'#b4b95c'));
      if(!water&&h%4===0)tuft(e,x*16+5,y*16+8,h);
      if(water&&h%3===0)rect(e,x*16+3,y*16+7,6,1,'#3997ad');
    }
    for(let y=-18;y<70;y+=9)for(let x=-31;x<17;x+=8){if(x>=0&&y>=0&&y<43)continue;const h=hash(x+57,y+41,9);if(h%3===0)sprite(e,a,'olive',x*16-44,y*16-91);else if(h%3===1)sprite(e,a,'bush',x*16-10,y*16-8);}
  }
  c.drawImage(expandedTerrain,-576,-384);
  c.drawImage(terrainBase(),-16,-32);
  // Delicate surf and ripples remain animated; the coastline itself never moves.
  for(let py=-16;py<700;py+=4){const y=py/16,shore=shorelineX(y)*16;const phase=Math.floor(time*2),h=hash(py,3);if(h%3!==0)rect(c,shore+2+(phase+h)%3,py,2+h%4,1,P.foam);}
  for(let py=2;py<690;py+=9){for(let px=0;px<400;px+=14){if(px<shorelineX(py/16)*16+10)continue;const h=hash(px,py,3);if(h%3===0){const wave=(Math.floor(time*2)+h)%7;rect(c,px+wave,py,4+h%5,1,h%2?P.waterHi:'#2a88a7');if(h%5===0)rect(c,px+wave+2,py+2,3,1,P.water);}}}
  // Low dressing deliberately avoids the path and keeps landmarks readable.
  [[3,3],[10,4],[2,21],[10,27],[17,31],[4,37],[15,40],[1,12]].forEach(([x,y])=>sprite(c,a,'rocks',x*16-14,y*16-8));
  [[17,9],[17,13],[21,24],[21,28],[22,38],[20,34]].forEach(([x,y])=>sprite(c,a,'reeds',Math.max(x*16,shorelineX(y)*16-16),y*16-15));
  [[1,3],[9,9],[2,33],[16,31],[17,40],[8,39],[1,17]].forEach(([x,y])=>sprite(c,a,'bush',x*16-10,y*16-8));
}
function flame(c,x,y,time){
  const k=Math.floor(time*5)%4;
  const outer=[[x-9,y],[x-12,y-9],[x-6,y-17],[x-4,y-28-k],[x+1,y-22],[x+4,y-35+k],[x+8,y-18],[x+13,y-13],[x+10,y-2]];
  poly(c,outer,'#a54b24');poly(c,outer.map(([a,b])=>[x+(a-x)*.76,b+2]),'#e57824');
  poly(c,[[x-7,y-3],[x-7,y-12],[x-2,y-21-k],[x+1,y-13],[x+5,y-24+k],[x+7,y-9],[x+4,y]],'#f3ad39');
  poly(c,[[x-3,y-2],[x-3,y-10],[x+1,y-17],[x+4,y-6],[x+2,y]],'#f8d77a');
  for(let i=0;i<4;i++){const rise=(time*7+i*12)%45,dx=Math.round(Math.sin(time*.6+i)*4);c.globalAlpha=(1-rise/55)*.24;ellipse(c,x+dx,y-33-rise,3+i,2+i,'#c5c19a');}c.globalAlpha=1;
  const spark=(time*19)%29;rect(c,x+5,y-20-spark,1,2,'#efb94b');
}
function screenToWorld(canvas,state,clientX,clientY){const b=canvas.getBoundingClientRect(),s=canvas.width/384*(state.camera?.zoom||1),cam=state.camera||{x:12,y:21.333};return{x:((clientX-b.left)*canvas.width/b.width-canvas.width/2)/s/16+cam.x,y:((clientY-b.top)*canvas.height/b.height-canvas.height/2)/s/16+cam.y};}
function renderWorld(canvas,state,options={}){
  const c=canvas.getContext('2d'),a=createAtlas(),time=Number.isFinite(state.time)?state.time:0,cam=state.camera||{x:12,y:21.333,zoom:1},s=canvas.width/384*(cam.zoom||1);
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  c.save();c.translate(Math.round(canvas.width/2-cam.x*16*s),Math.round(canvas.height/2-cam.y*16*s));c.scale(s,s);terrain(c,a,time);
  const props=state.props||{},shelter=props.shelter||{x:1,y:6},fire=props.fire||{x:7,y:17,lit:true},jar=props.jar||{x:4,y:16},basket=props.basket||{x:5,y:18},boat=props.boat||{x:20,y:20},net=props.net||{x:17,y:21},bread=props.bread||{x:7,y:18.5};
  const fx=fire.x*16+8,fy=fire.y*16+11;
  if(fire.lit){c.globalAlpha=.14;ellipse(c,fx,fy,37,18,'#f1c258');c.globalAlpha=1;}
  const objects=[{type:'shelter',x:shelter.x*16-6,y:shelter.y*16-8,depth:(shelter.y+7.3)*16},
    {type:'jar',x:jar.x*16-5,y:jar.y*16-16,depth:(jar.y+1)*16},
    {type:'basket',x:basket.x*16-6,y:basket.y*16-13,depth:(basket.y+.7)*16},
    {type:'boat',x:boat.x*16-44,y:boat.y*16-24,depth:boat.y*16+20},
    {type:'net',x:net.x*16-20,y:net.y*16-20,depth:net.y*16+30},
    {type:'firepit',x:fx-24,y:fy-20,depth:fy+10}];
  const trees=props.olives||[{x:14,y:5},{x:3,y:25},{x:15,y:35}];
  trees.forEach(tree=>{const x=Array.isArray(tree)?tree[0]:tree.x,y=Array.isArray(tree)?tree[1]:tree.y;objects.push({type:'olive',x:x*16-44,y:y*16-91,depth:y*16+5});});
  Object.entries(state.entities||{}).forEach(([key,e])=>{if(e.visible!==false)objects.push({type:'person',key,e,depth:e.y*16+4});});
  if(!bread.heldBy&&!bread.shared)objects.push({type:'bread',x:bread.x*16-10,y:bread.y*16-7,depth:bread.y*16+1});
  objects.sort((u,v)=>u.depth-v.depth).forEach(o=>{
    if(o.type==='person'){
      const e=o.e,visitor=e.role==='visitor'||o.key==='traveler',dirs={down:0,south:0,left:1,west:1,right:2,east:2,up:3,north:3};
      const frame=e.action==='walk'||e.moving?Math.floor(time*6)%3:0;
      c.drawImage(a,(visitor?112:0)+frame*32,176+(dirs[e.facing]??0)*48,32,48,Math.round(e.x*16-16),Math.round(e.y*16-42),32,48);
      if(bread.heldBy===e.id)c.drawImage(a,368,88,20,16,Math.round(e.x*16+5),Math.round(e.y*16-17),10,8);
      if(e.action==='share')rect(c,e.x*16+8,e.y*16-19,10,3,P.skin);
      if(bread.shared&&(bread.owners||['pescador1','visitante1']).includes(e.id)){const facingLeft=e.facing==='left';c.drawImage(a,visitor?378:368,88,10,16,Math.round(e.x*16+(facingLeft?-14:9)),Math.round(e.y*16-19),5,8);}
      if(options.showLabels){c.font='8px monospace';c.textAlign='center';c.fillStyle=P.ink;c.fillText(visitor?'VISITANTE':'PESCADOR',Math.round(e.x*16),Math.round(e.y*16-46));}
    }else if(o.type==='bread'&&bread.shared){c.drawImage(a,368,88,10,16,o.x-3,o.y,10,16);c.drawImage(a,378,88,10,16,o.x+13,o.y,10,16);}
    else sprite(c,a,o.type,o.x,o.y);
  });
  if(shelter.reinforced){poly(c,[[shelter.x*16+8,shelter.y*16+60],[shelter.x*16+113,shelter.y*16+66],[shelter.x*16+113,shelter.y*16+71],[shelter.x*16+8,shelter.y*16+65]],P.woodHi);}
  if(fire.lit)flame(c,fx,fy-3,time);
  if(options.showGrid){c.strokeStyle='rgba(74,56,37,.16)';c.lineWidth=.5;for(let x=0;x<=24;x++){c.beginPath();c.moveTo(x*16,0);c.lineTo(x*16,672);c.stroke();}for(let y=0;y<=42;y++){c.beginPath();c.moveTo(0,y*16);c.lineTo(384,y*16);c.stroke();}}
  c.restore();const night=Math.max(0,Math.min(1,state.lighting?.night||0));if(night){c.fillStyle=`rgba(25,38,68,${night*.28})`;c.fillRect(0,0,canvas.width,canvas.height);}
  if(options.watermark){c.font='10px monospace';c.fillStyle=P.creamHi;c.textAlign='left';c.fillText('PROTÓTIPO • TOP-DOWN v0.2',12,canvas.height-14);}
  return{artVersion:'topdown-v0.2',width:canvas.width,height:canvas.height,time};
}



const canvas=document.querySelector('#world');let state=createInitialState();
state.mode='explore';state.entities.resident.x=13;state.entities.resident.y=18;state.entities.resident.facing='down';state.props.bread.heldBy=null;state.props.bread.x=5;state.props.bread.y=18;
const KEY='vila:player-local:v3',status=t=>document.querySelector('#notice').textContent=t;
let mode='play',target=null,held=null,last=0,drag=null,travel=0;
state.camera={x:11,y:16,zoom:1.05};
try{const p=JSON.parse(localStorage.getItem(KEY));if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&!isBlocked(p.x,p.y)){state.entities.resident.x=p.x;state.entities.resident.y=p.y;state.camera.x=p.x;state.camera.y=p.y;}}catch{}
function metrics(){return{halfX:12/state.camera.zoom,halfY:12*canvas.height/canvas.width/state.camera.zoom};}
function clampCamera(){const m=metrics();state.camera.x=Math.max(-36+m.halfX,Math.min(60-m.halfX,state.camera.x));state.camera.y=Math.max(-24+m.halfY,Math.min(72-m.halfY,state.camera.y));}
function draw(){clampCamera();renderWorld(canvas,state,{watermark:false,showLabels:true});}
function save(){try{localStorage.setItem(KEY,JSON.stringify({x:state.entities.resident.x,y:state.entities.resident.y}));}catch{}}
function resize(){const b=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(b.width*d));canvas.height=Math.max(1,Math.round(b.height*d));draw();}
new ResizeObserver(resize).observe(canvas);window.addEventListener('orientationchange',()=>{held=null;target=null;resize();});
function focusActor(){mode='play';target=null;const a=state.entities.resident;state.camera={x:a.x,y:a.y-2,zoom:1.15};document.querySelector('#mode').textContent='Modo jogar';draw();status('Toque no chão para caminhar. Setas/WASD ou controles também movem o pescador.');}
function move(dx,dy){if(mode==='camera'){state.camera.x+=dx*3;state.camera.y+=dy*3;draw();return;}const before=state.entities.resident;state=moveResident(state,dx,dy);const a=state.entities.resident;if(a.x===before.x&&a.y===before.y)target=null;state.camera.x=a.x;state.camera.y=a.y-2;draw();save();}
document.querySelector('#follow').onclick=focusActor;
document.querySelector('#mode').onclick=()=>{mode=mode==='play'?'camera':'play';target=null;document.querySelector('#mode').textContent=mode==='play'?'Modo jogar':'Modo explorar';if(mode==='play')focusActor();else status('Arraste ou use as setas para explorar todo o território.');};
document.querySelector('#reset').onclick=()=>{mode='camera';target=null;state.camera={x:12,y:24,zoom:Math.max(24/96,24*canvas.height/canvas.width/96)};document.querySelector('#mode').textContent='Modo explorar';draw();status('Território 96 × 96. Voltar ao pescador retoma o jogo local.');};
function zoom(d){state.camera.zoom=Math.max(Math.max(.25,24*canvas.height/canvas.width/96),Math.min(2.5,state.camera.zoom+d));draw();}
document.querySelector('#zoom-in').onclick=()=>zoom(.2);document.querySelector('#zoom-out').onclick=()=>zoom(-.2);
document.querySelector('#forget').onclick=()=>{try{localStorage.removeItem(KEY);}catch{}state.entities.resident.x=13;state.entities.resident.y=18;focusActor();status('Sua partida local foi reiniciada. Nenhum mundo compartilhado foi alterado.');};
document.querySelectorAll('[data-pan]').forEach(b=>{const d=b.dataset.pan.split(',').map(v=>Math.sign(Number(v)));b.addEventListener('pointerdown',e=>{e.preventDefault();held=d;b.setPointerCapture(e.pointerId);target=null;move(d[0]*.2,d[1]*.2);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>held=null);});
const dirs={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]};
document.addEventListener('keydown',e=>{if(dirs[e.key]&&!['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();held=dirs[e.key];target=null;}});document.addEventListener('keyup',()=>held=null);window.addEventListener('blur',()=>{held=null;target=null;});
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,id:e.pointerId};travel=0;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;travel+=Math.abs(dx)+Math.abs(dy);if(mode==='camera'){const k=24/(canvas.getBoundingClientRect().width*state.camera.zoom);state.camera.x-=dx*k;state.camera.y-=dy*k;draw();}drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(drag&&travel<12&&mode==='play'){const p=screenToWorld(canvas,state,e.clientX,e.clientY);if(!isBlocked(p.x,p.y)){target=p;status('Caminhando. Obstáculos interrompem o trajeto; toque em outro ponto para contornar.');}else status('Água ou obstáculo: escolha um trecho livre.');}drag=null;});
for(const ev of ['pointercancel','lostpointercapture'])canvas.addEventListener(ev,()=>{drag=null;held=null;});
function animate(t){const dt=Math.min((t-last)/1000,.05);last=t;state.time=t/1000;if(held)move(held[0]*dt*4,held[1]*dt*4);else if(target){const a=state.entities.resident,dx=target.x-a.x,dy=target.y-a.y,len=Math.hypot(dx,dy);if(len<.12){target=null;a.action='idle';save();}else move(dx/len*Math.min(dt*4,len),dy/len*Math.min(dt*4,len));}else state.entities.resident.action='idle';draw();requestAnimationFrame(animate);}
resize();requestAnimationFrame(animate);
})();
