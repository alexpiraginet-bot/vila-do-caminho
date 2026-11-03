
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
const P = Object.freeze({grass:'#b4a332',grassHi:'#c4af35',grassLo:'#8d8438',grassDark:'#4e6326',
  path:'#eeab56',pathHi:'#f5bb67',pathLo:'#c78b3f',ink:'#432c22',soil:'#81772d',
  water:'#146b99',waterDeep:'#146490',waterHi:'#3096b7',foam:'#53b6b3',
  leaf:'#a89c3d',leafHi:'#cebc47',leafLo:'#646435',leafDeep:'#3b4230',
  wood:'#7e4d2c',woodHi:'#c47c3a',woodLo:'#422a21',straw:'#d88d3f',strawHi:'#fabb5e',strawLo:'#b06a30',
  cream:'#f3d195',creamHi:'#f8dfa2',creamLo:'#cba672',terra:'#c5642c',terraHi:'#f18c3a',
  skin:'#f19f55',skinHi:'#f7b467',skinLo:'#864f2d',stone:'#8e7565',stoneHi:'#d6ba9a',stoneLo:'#5c4e42',
  outline:'#2f1f1b',hair:'#3d2a25',hairHi:'#583a2f',sash:'#cf562d',sashLo:'#8d3d27',sand:'#f3b15b',
  sandDark:'#e19d4e',tuft:'#62722c',tuftHi:'#9e943b',waterLight:'#4aacbd',foamHi:'#5ec2c2',reed:'#888238',
  fire:'#e84115',fireMid:'#f78b14',fireHi:'#fbc114',fireCore:'#fbe88f',ash:'#4f352e',paper:'#fdf3cd',wool:'#f4daa6'});
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
// Art pixel = 2 world px for terrain, residents, dressing and fire (the reference grain on screen).
// Maps are rows of letters looked up in a palette; '.' stays transparent.
const AP=2;
function pix(c,x,y,rows,pal){for(let j=0;j<rows.length;j++){const r=rows[j];for(let i=0;i<r.length;i++){const col=pal[r[i]];if(col)rect(c,x+i*AP,y+j*AP,AP,AP,col);}}}
function mirror(rows){return rows.map(r=>[...r].reverse().join(''));}
function blob(c,cx,cy,rx,ry,color){c.fillStyle=color;for(let j=Math.floor(cy-ry);j<=Math.ceil(cy+ry);j++)for(let i=Math.floor(cx-rx);i<=Math.ceil(cx+rx);i++){const u=(i+.5-cx)/rx,v=(j+.5-cy)/ry;if(u*u+v*v<=1)c.fillRect(i*AP,j*AP,AP,AP);}}
function rock(c,x,y,w,h){const top=Math.max(1,Math.ceil((h-2)*.5));
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const ex=i===0||i===w-1,ey=j===0||j===h-1;if(ex&&ey)continue;
    rect(c,(x+i)*AP,(y+j)*AP,AP,AP,ex||ey?P.stoneLo:j<=top&&(w<5||i<w-2)?P.stoneHi:i===w-2&&j>1?P.stoneLo:P.stone);}}
// 3 x 5 pixel font for speech bubbles (octal rows); accents above, cedilla below.
const GLYPH=Object.freeze({A:'.#./#.#/###/#.#/#.#',B:'##./#.#/##./#.#/##.',C:'.##/#../#../#../.##',D:'##./#.#/#.#/#.#/##.',E:'###/#../##./#../###',F:'###/#../##./#../#..',G:'.##/#../#.#/#.#/.##',H:'#.#/#.#/###/#.#/#.#',I:'###/.#./.#./.#./###',J:'..#/..#/..#/#.#/.#.',K:'#.#/#.#/##./#.#/#.#',L:'#../#../#../#../###',M:'#...#/##.##/#.#.#/#...#/#...#',N:'#..#/##.#/#.##/#..#/#..#',O:'.#./#.#/#.#/#.#/.#.',P:'##./#.#/##./#../#..',Q:'.#./#.#/#.#/##./.##',R:'##./#.#/##./#.#/#.#',S:'.##/#../.#./..#/##.',T:'###/.#./.#./.#./.#.',U:'#.#/#.#/#.#/#.#/###',V:'#.#/#.#/#.#/#.#/.#.',W:'#...#/#...#/#.#.#/##.##/#...#',X:'#.#/#.#/.#./#.#/#.#',Y:'#.#/#.#/.#./.#./.#.',Z:'###/..#/.#./#../###',0:'###/#.#/#.#/#.#/###',1:'.#./##./.#./.#./###',2:'##./..#/.#./#../###',3:'##./..#/.#./..#/##.',4:'#.#/#.#/###/..#/..#',5:'###/#../##./..#/##.',6:'.##/#../##./#.#/.#.',7:'###/..#/.#./.#./.#.',8:'.#./#.#/.#./#.#/.#.',9:'.#./#.#/.##/..#/##.','!':'#/#/#/./#','?':'##./..#/.#./.../.#.','.':'././././#',',':'../../../.#/#.',':':'./#/./#/.','-':'.../.../###/.../...',' ':'../../../../..'});
const ACCENT=Object.freeze({'Á':'A1','À':'A2','Â':'A3','Ã':'A4','É':'E1','Ê':'E3','Í':'I1','Ó':'O1','Ô':'O3','Õ':'O4','Ú':'U1','Ç':'C5'});
const MARK=Object.freeze([[],[[2,-2],[1,-1]],[[0,-2],[1,-1]],[[1,-2],[0,-1],[2,-1]],[[1,-2],[2,-2],[0,-1],[1,-1]],[[1,5],[0,6]]]);
function glyph(ch){const acc=ACCENT[ch];return{g:(GLYPH[acc?acc[0]:ch]||GLYPH['?']).split('/'),acc};}
function txtWidth(str){let w=-1;for(const ch of str)w+=glyph(ch).g[0].length+1;return w;}
function txt(c,x,y,str,color){c.fillStyle=color;let cx=x;for(const ch of str){const {g,acc}=glyph(ch);
  for(let r=0;r<5;r++)for(let b=0;b<g[r].length;b++)if(g[r][b]==='#')c.fillRect(cx+b*AP,y+r*AP,AP,AP);
  if(acc)for(const [px,py] of MARK[+acc[1]])c.fillRect(cx+px*AP,y+py*AP,AP,AP);cx+=(g[0].length+1)*AP;}}
function bubble(c,cx,top,str){const W=txtWidth(str)+4,H=11,x0=Math.round(cx/AP-W/2),y0=Math.round(top/AP)-H-3,m=Math.floor(W/2);
  const R=(i,j,w,h,col)=>rect(c,(x0+i)*AP,(y0+j)*AP,w*AP,h*AP,col);
  R(1,0,W-2,H,P.outline);R(0,1,W,H-2,P.outline);R(1,1,W-2,H-2,P.paper);
  R(m-1,H-1,3,1,P.outline);R(m,H-1,1,1,P.paper);R(m-1,H,3,1,P.outline);R(m,H,1,1,P.paper);R(m,H+1,1,1,P.outline);
  txt(c,(x0+2)*AP,(y0+4)*AP,str,P.outline);}
function shadow(c,x,y,w){const cx=Math.round(x*16/AP),cy=Math.round(y*16/AP);c.globalAlpha=.2;
  rect(c,(cx-w/2)*AP,(cy-1)*AP,w*AP,2*AP,P.outline);rect(c,(cx-w/2+1)*AP,(cy+1)*AP,(w-2)*AP,AP,P.outline);c.globalAlpha=1;}

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
function drawFirepit(c){
  blob(c,12,9.4,9.6,4.6,P.ash);blob(c,12,9,6.2,2.6,P.outline);
  for(let i=0;i<9;i++){rect(c,(7+i)*AP,Math.round(10.6-i*.45)*AP,AP,AP,i%3?P.wood:P.woodLo);rect(c,(8+i)*AP,Math.round(7.6+i*.4)*AP,AP,AP,i%3?P.woodHi:P.wood);}
  [[10,9],[12,8],[14,9],[11,10],[13,10],[12,9]].forEach(([x,y],i)=>rect(c,x*AP,y*AP,AP,AP,i%2?P.fire:P.fireMid));
  [[8,2,4,3],[12,2,4,3],[4,3,4,3],[16,3,4,3],[1,6,4,3],[19,6,4,3],[2,10,4,3],[18,10,4,3],[6,12,4,3],[10,12,4,3],[14,12,4,3]].forEach(([x,y,w,h])=>rock(c,x,y,w,h));
}
// Residents: fictional, defined by trade (no person's likeness or handle). Templates are 16 x 24 art px.
const FIGURES=Object.freeze({man_down:'................/................/.....oooooo...../....ohHHhHho..../...ohHhHHhhHo.../..ohhHhhhhHhho../..ohhsSSSSshho../..oshseSSeshho../..oshseSSeshho../..ohbbssssbbho../...obbbmmbbbo.../....obbbbbbo..../..oWWwwqqwwqqo../.oWWWwwwwwwwqqo./.oWWowwwwwwoqqo./.oSsowwwwwwosso./.oSsorrRRrrosso./.oSsorRrrRrosso./.oskowRwwRwokso./..oooWRwwRqooo../....oWwwwwqo..../...osso..osso.../..osddo..oddso../..oDDDo..oDDDo..',
  man_up:'................/................/.....oooooo...../....ohHHhHho..../...ohHhHHhhHo.../..ohhHhhhhHhho../..ohhhhHhhhhho../..oshhhhhhhhso../..oshHhhhhHhso../..ohhhhhhhhhho../...ohhhhhhhho.../....ohhhhhho..../..oWWwwwwwwqqo../.oWWWwwwwwwwqqo./.oWWowwwwwwoqqo./.oSsowwwwwwosso./.oSsorrrrrrosso./.oSsoRRRRRRosso./.oskowwwwwwokso./..oooWwwwwqooo../....oWwwwwqo..../...osso..osso.../..oddso..osddo../..oDDDo..oDDDo..',
  man_left:'................/................/.....oooooo...../....ohHHhHho..../...ohHhHHhhho.../...osShhhHhhho../..osSShhhhhhho../.oseSshshhhhho../osseSshshhhhho../.ombbbbhhhhhho../.obbbbbbhhhhho../..obbbbbohhho.../...oWwwwwwqo..../...oWwwwwwqqo.../...oWWWwwwqqo.../...owwSswwwqo.../...orrSsrrrRo.../...oRRSsRRRRo.../...owwkswwwqo.../...oWwwwwwqqo.../...oWwwwwwqo..../....ossoosso..../...oddsoddso..../...oDDDoDDDo....',
  woman_down:'................/................/.....oooooo...../....ovvvvvVo..../...ovvvvvvvVo.../..ovvvvvvvvvVo../..ovhhsSSshhVo../..ovhseSSeshVo../..ovhseSSeshVo../..ovhsssssshVo../..ovhhsmmshhVo../..oVvhhsshhvVo../..oVvhwqqwhvVo../.oWWvwwwwwwvqqo./.oWWowwwwwwoqqo./.oSsowwwwwwosso./.oSsorrrrrrosso./.oSsowRwwRwosso./.oskowwwwwwokso./..oooWwwwwwqoo../...oWwwwwwwqo.../...oWwwwwwwqo.../...ooddooddoo.../....oDDooDDo....',
  woman_up:'................/................/.....oooooo...../....ovvvvvVo..../...ovvvvvvvVo.../..ovvvvvvvvvVo../..ovvvvvvvvvVo../..ovvvvvvvvvVo../..ovvvvvvvvvVo../..oVvvvvvvvvVo../..oVvvvvvvvvVo../..oVVvvvvvvVVo../..oVVVvvvvVVVo../.oWWwVVVVVVwqqo./.oWWowwwwwwoqqo./.oSsowwwwwwosso./.oSsorrrrrrosso./.oSsowwwwwwosso./.oskowwwwwwokso./..oooWwwwwwqoo../...oWwwwwwwqo.../...oWwwwwwwqo.../...ooddooddoo.../....oDDooDDo....',
  woman_left:'................/................/.....oooooo...../....ovvvvvVo..../...ovvvvvvvVo.../...ovvvvvvvvVo../..ohhsShvvvvVo../.oseSshhvvvvVo../osseSshhvvvvVo../.osssshhvvvvVo../.omsshhhvvvVo.../..osshhhVvvVo.../...ohhwwVVVo..../...oWwwwwwqqo.../...oWWwwwwqqo.../...owwSswwwqo.../...orrSsrrrRo.../...owwSswwwqo.../...owwkswwwqo.../...oWwwwwwwqo.../...oWwwwwwwqo.../...oWwwwwwwqo.../...oddooddoo..../...oDDooDDo.....',
  man_down_walk0:'...osso..osso.../...osso..oddso../..osddo..oDDDo../..oDDDo.........',
  man_down_walk1:'...osso..osso.../..osddo..osso.../..oDDDo..oddso../.........oDDDo..',
  man_left_walk0:'...osso..osso.../..osso....osso../.oddso....oddso./.oDDDo.....oDDo.',
  man_left_walk1:'....ossoosso..../....ossoosso..../...oddsoddso..../...oDDDoDDDo....',
  woman_down_walk0:'...oWwwwwwwqo.../...ooddoowwoo.../....oDDo.oddo.../.........oDDo...',
  woman_down_walk1:'...oWwwwwwwqo.../...oowwooddoo.../...oddo.oDDo..../...oDDo.........',
  woman_left_walk0:'...oWwwwwwwqo.../..oddoo..oddo.../..oDDo...oDDo.../................',
  woman_left_walk1:'...oWwwwwwwqo.../...ooddoddo...../...oDDooDDo...../................'});
const SKINS=Object.freeze({light:[P.skin,P.skinHi,P.skinLo],warm:['#db8545',P.skin,'#96582b'],deep:['#ad6433',P.woodHi,'#5a321c']});
const HAIRS=Object.freeze({dark:[P.hair,P.hairHi,P.hair],grey:['#93796d',P.stoneHi,P.wool]});
const FOLK=Object.freeze({
  pescador:{t:'man',skin:'light',hair:'dark',cloth:[P.creamHi,P.cream,P.creamLo],sash:[P.sash,P.sashLo]},
  visitante:{t:'man',skin:'warm',hair:'dark',cloth:['#e1b97e',P.woodHi,'#96582b'],sash:['#767c3b','#556033']},
  pastor:{t:'man',skin:'warm',hair:'grey',cloth:['#e1b97e',P.woodHi,'#96582b'],sash:[P.cream,P.creamLo],label:'PASTOR',prop:'crook'},
  carpinteiro:{t:'man',skin:'light',hair:'dark',cloth:['#52667d','#42556a','#33415a'],sash:[P.woodHi,P.wood],label:'CARPINTEIRO',prop:'hammer'},
  pedreiro:{t:'man',skin:'deep',hair:'dark',cloth:['#e1b97e',P.creamLo,'#96582b'],sash:[P.wood,'#5a321c'],label:'PEDREIRO',prop:'block'},
  agricultora:{t:'woman',skin:'warm',hair:'dark',cloth:['#767c3b',P.leafLo,'#556033'],sash:['#96582b','#5a321c'],label:'AGRICULTORA',prop:'hoe'},
  padeira:{t:'woman',skin:'light',hair:'dark',cloth:[P.sash,'#b8462d','#863223'],sash:[P.paper,P.cream],label:'PADEIRA',prop:'loaves'}});
function folkPalette(f){const s=SKINS[f.skin],h=HAIRS[f.hair];return{o:P.outline,e:P.outline,d:P.wood,D:P.woodLo,s:s[0],S:s[1],k:s[2],m:s[0],h:h[0],H:h[1],b:h[2],
  W:f.cloth[0],w:f.cloth[1],q:f.cloth[2],r:f.sash[0],R:f.sash[1],v:P.cream,V:P.creamLo};}
function figureRows(t,view,frame){const key=view==='right'?'left':view,base=FIGURES[t+'_'+key].split('/');
  const rows=frame?base.slice(1,21).concat(FIGURES[t+'_'+(key==='up'?'down':key)+'_walk'+(frame-1)].split('/')):base;
  return view==='right'?mirror(rows):rows;}
// Trade props: [map, palette, x, y] per view (art px in the frame); 'up' draws behind the body.
const PROPS=Object.freeze({
  crook:{map:'.WW./W..W/w..W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...W/...w',pal:{W:P.woodHi,w:P.wood},at:{down:[11,2],up:[1,2,1],left:[0,1,1],right:[12,1]}},
  hoe:{map:'KKk./..W./..W./..W./..W./..W./..W./..W./..W./..W./..W./..W./..W./..W./..W./..W./..W./..W./..W./..w.',pal:{K:P.stoneHi,k:P.stoneLo,W:P.woodHi,w:P.wood},at:{down:[12,2],up:[0,2,1],left:[0,2,1],right:[12,2]}},
  hammer:{map:'kHk/.W./.W./.w.',pal:{H:P.stoneHi,k:P.stoneLo,W:P.woodHi,w:P.wood},at:{down:[12,15],left:[5,15],right:[8,15]}},
  block:{map:'.oooooooo./oHHHHHHhho/ohHHHHhhko/ohhhhhhkko/okkkkkkkko/.oooooooo.',pal:{o:P.outline,H:P.stoneHi,h:P.stone,k:P.stoneLo},at:{down:[3,13],left:[0,13],right:[6,13,1]}},
  loaves:{map:'.oLLooLLo./oLlLLLLlLo/oWWWWWWWWo/owwwwwwwwo/.oooooooo.',pal:{o:P.outline,L:'#f3ad52',l:P.woodHi,W:'#e8a246',w:'#96582b'},at:{down:[3,14],left:[0,14],right:[6,14,1]}}});
function drawProp(c,name,view,frame){const p=PROPS[name],at=p&&p.at[view];if(!at)return;const rows=p.map.split('/');pix(c,at[0]*AP,(at[1]-(frame?1:0))*AP,at[2]?mirror(rows):rows,p.pal);}
const SHEEP=Object.freeze(['.....oooooo../...ooWWWWWWo./.oooWWWwWWWWo/oHHHoWWWWWwWo/oHeHoWWwWWWWo/.oHHoWWWWWwqo/..oooqqqqqqo./....oHo..oHo./....oo....oo.',
  '.....oooooo../...ooWWWWWWo./.oooWWWwWWWWo/oHHHoWWWWWwWo/oHeHoWWwWWWWo/.oHHoWWWWWwqo/..oooqqqqqqo./...oHo....oHo/...oo......oo',
  '.....oooooo../...ooWWWWWWo./..ooWWWwWWWWo/.oooWWWWWWwWo/oHHHoWWwWWWWo/oHeHoWWWWWwqo/.oHHoqqqqqqo./....oHo..oHo./....oo....oo.']);
const SHEEP_PAL=Object.freeze({o:P.outline,W:P.paper,w:P.wool,q:P.creamLo,H:P.hair,e:P.paper});
const FOLK_ORDER=Object.freeze(['pastor','carpinteiro','carpinteiroBare','pedreiro','agricultora','padeira','pescador','pedreiroBare']);
let cachedFolk;
function folkAtlas(){
  if(cachedFolk)return cachedFolk;
  const a=document.createElement('canvas');a.width=768;a.height=216;const g=a.getContext('2d');g.imageSmoothingEnabled=false;const c=g;
  FOLK_ORDER.forEach((name,i)=>{const bare=name.endsWith('Bare'),f=FOLK[bare?name.slice(0,-4):name],pal=folkPalette(f);
    ['down','left','right','up'].forEach((view,d)=>{for(let fr=0;fr<3;fr++)local(c,i*96+fr*32,d*48,()=>{
      if(view==='up'&&!bare)drawProp(c,f.prop,view,fr);pix(c,0,0,figureRows(f.t,view,fr),pal);if(view!=='up'&&!bare)drawProp(c,f.prop,view,fr);});});});
  for(let fr=0;fr<3;fr++){const rows=SHEEP[fr].split('/');pix(c,fr*32+2,196,rows,SHEEP_PAL);pix(c,96+fr*32+2,196,mirror(rows),SHEEP_PAL);}
  cachedFolk=a;return a;
}
function drawCharacter(c,role,dir,frame){
  // Fisherman (role 0) and visitor (role 1) share the man template; no shadow inside the frame.
  pix(c,0,0,figureRows('man',['down','left','right','up'][dir],frame),folkPalette(FOLK[role?'visitante':'pescador']));
}
const REEDS='......a........./..a...b.....a.../.ab..ab....ab.../.bb..bb....bb.../.bc..bc....bc.../.cc..cc....cc.../..s...s.....s.../..s...s....s..../l.s...s....s..l./.l.s..s...s..l../.l.s..s...s.l.../..lts.s..s.lt.../...tlss.sslt..../....tlsssls...../.....tssst....../......ttt.......';
const BREAD='........../..oooooo../.oLLLLLLo./oLlLLlLLlo/oLLLLLLLLo/oCCCCCCCCo/.oooooooo./..........';
function drawBush(c){const parts=[[5,6.6,4.6,4.4],[10.6,5.6,4.8,4.6],[8,8.2,6.6,3.6]];
  const inside=(i,j)=>parts.some(([x,y,rx,ry])=>((i+.5-x)/rx)**2+((j+.5-y)/ry)**2<=1);
  for(let j=0;j<12;j++)for(let i=0;i<16;i++){if(!inside(i,j))continue;const edge=!inside(i-1,j)||!inside(i+1,j)||!inside(i,j-1)||!inside(i,j+1),h=hash(i,j,44);
    rect(c,i*AP,j*AP,AP,AP,edge?P.leafDeep:j<4?(h%3?P.leafHi:P.leaf):j<7?(h%4?P.leaf:P.leafHi):(h%3?P.leafLo:P.leaf));}}
function createAtlas(){
  if(cachedAtlas)return cachedAtlas;
  const a=document.createElement('canvas');a.width=512;a.height=512;const c=a.getContext('2d');c.imageSmoothingEnabled=false;
  [[P.grass,P.grassHi],[P.sand,P.pathHi],[P.path,P.sandDark],[P.water,P.waterHi]].forEach(([base,alt],i)=>{for(let y=0;y<8;y++)for(let x=0;x<8;x++)rect(c,i*16+x*AP,y*AP,AP,AP,hash(x,y,i)%4?base:alt);});
  local(c,0,24,()=>drawShelter(c));local(c,152,24,()=>drawOlive(c));local(c,248,24,()=>drawBoat(c));local(c,344,24,()=>drawNet(c));
  local(c,248,80,()=>drawJar(c));local(c,280,80,()=>drawBasket(c));local(c,312,88,()=>drawFirepit(c));
  pix(c,368,88,BREAD.split('/'),{o:P.outline,L:'#f3ad52',l:P.wood,C:P.woodHi});
  local(c,248,128,()=>{rock(c,7,2,11,7);rock(c,1,7,9,6);rock(c,13,8,10,6);});
  pix(c,304,128,REEDS.split('/'),{a:P.strawHi,b:P.straw,c:P.strawLo,s:P.reed,t:P.leafLo,l:P.leaf});
  local(c,344,128,()=>drawBush(c));
  for(let role=0;role<2;role++)for(let dir=0;dir<4;dir++)for(let f=0;f<3;f++)local(c,role*112+f*32,176+dir*48,()=>drawCharacter(c,role,dir,f));
  cachedAtlas=a;return a;
}
const kitRasters=new Map();
function kitArt(kit,name,w,h){
  // The kit is redrawn at half size and enlarged 2x, so its pixels match the 2 px art pixel of the rest.
  const key=name+':'+w+'x'+h;if(kitRasters.has(key))return kitRasters.get(key);
  const r=document.createElement('canvas');r.width=Math.ceil(w/AP);r.height=Math.ceil(h/AP);const rc=r.getContext('2d');rc.imageSmoothingEnabled=false;
  const ok=kit.drawSprite(rc,name,0,0,r.width,r.height);kitRasters.set(key,ok?r:null);return ok?r:null;
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
    const art=kitArt(kit,name,dw,dh);
    if(art){const ax=Math.round(dx/AP)*AP,ay=Math.round((dy+dh)/AP)*AP-art.height*AP;c.drawImage(art,ax,ay,art.width*AP,art.height*AP);return;}
    if(kit.drawSprite(c,name,dx,dy,dw,dh))return;
  }
  c.drawImage(a,sx,sy,w,h,Math.round(x),Math.round(y),w,h);
}
function pathWidth(){return WORLD.pathWidth;}
// Ground in art pixels: grass in two tones with tufts, a stepped trail with a darker rim, a sand strip,
// a wet edge and a teal waterline, then water. Shoreline and trail come from the same functions as collision.
const GROUND=Object.freeze([P.grass,P.grassHi,P.grassLo,P.path,P.pathHi,P.pathLo,P.sand,P.sandDark,P.water,P.waterDeep,P.waterHi,P.foam,P.tuft,P.tuftHi,P.grassDark,P.stoneHi,P.stoneLo,P.soil]);
const TUFTS=Object.freeze(['..l../l.t.l/t.t.t/tdtdt','l...l/t.l.t/tdt.t','.l./ltl/tdt','..l.l../.lt.tl./ltdtdtl/tdt.tdt']);
function groundBuffer(w,h,ox,oy){
  const cw=w/AP,ch=h/AP,idx=new Uint8Array(cw*ch);
  for(let j=0;j<ch;j++){
    const wy=oy+j*AP+1,y=wy/16,shore=shorelineX(y),pc=pathCenterX(y),core=wy>=-32&&wy<704,sw=.42+.16*Math.sin(y*.83+1.7)+.07*Math.sin(y*2.3);
    for(let i=0;i<cw;i++){
      const wx=ox+i*AP+1,x=wx/16,d=x-shore,ci=Math.floor(wx/AP),cj=Math.floor(wy/AP),hh=hash(ci,cj,7);let k;
      if(d>=0)k=d<.12?11:d<.27&&hh%3===0?10:d>3.2||(d>2.6&&(ci+cj)%2===0)?9:8;
      else if(-d<sw+(hh%3)*.05)k=-d<.08?5:hh%11===0?4:hh%13===0?7:6;
      else{
        const pd=Math.abs(x-pc),edge=(hash(ci>>1,cj>>1,6)%4)*.04,camp=((x-5.8)/3.6)**2+((y-16.9)/2.5)**2+(hash(ci>>1,cj>>1,9)%4)*.07;
        if(core&&wx>=-16&&wx<400&&pd<.9+edge)k=pd>.78+edge&&hh%5<3?5:hh%11===0?7:hh%17===0?4:3;
        else if(core&&camp<1)k=camp>.84&&hh%3===0?5:hh%9===0?7:hh%13===0?4:3;
        else{const n=(hash(ci>>1,cj,3)+hash(ci,cj>>1,4))%5;k=n<2?1:0;if(hh%29===0)k=2;if(core&&pd<1.15+edge&&hh%4===0)k=2;}
      }
      idx[j*cw+i]=k;
    }
  }
  return{idx,cw,ch,ox,oy};
}
function dress(g,x,y,h){
  // Tufts and pebbles only on grass, seeded by the tile so every layer agrees.
  const put=(rows,ax,ay,pal)=>{const ci=ax-g.ox/AP,cj=ay-g.oy/AP;
    const inb=(i,j)=>ci+i>=0&&cj+j>=0&&ci+i<g.cw&&cj+j<g.ch;
    for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++)if(inb(i,j)&&g.idx[(cj+j)*g.cw+ci+i]>2)return false;
    for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const v=pal[rows[j][i]];if(v!==undefined&&inb(i,j))g.idx[(cj+j)*g.cw+ci+i]=v;}return true;};
  if(h%3===0)put(TUFTS[(h>>>3)%4].split('/'),x*8+(h>>>5)%4,y*8+(h>>>7)%4,{l:13,t:12,d:14});
  else if(h%17===1)put(['HS','SL'],x*8+(h>>>9)%6,y*8+(h>>>12)%6,{H:15,S:15,L:16});
}
function groundImage(g){
  const img=new ImageData(g.cw*AP,g.ch*AP),rgb=GROUND.map(v=>[parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)]);
  for(let j=0;j<g.ch;j++)for(let i=0;i<g.cw;i++){const col=rgb[g.idx[j*g.cw+i]];
    for(let dy=0;dy<AP;dy++)for(let dx=0;dx<AP;dx++){const o=((j*AP+dy)*g.cw*AP+i*AP+dx)*4;img.data[o]=col[0];img.data[o+1]=col[1];img.data[o+2]=col[2];img.data[o+3]=255;}}
  return img;
}
function terrainBase(){
  if(cachedTerrain)return cachedTerrain;
  const a=document.createElement('canvas');a.width=416;a.height=736;const c=a.getContext('2d');
  // All terrain detail is seeded by world coordinates and immutable across episodes.
  const g=groundBuffer(416,736,-16,-32);
  for(let y=-2;y<46;y++)for(let x=-1;x<26;x++)dress(g,x,y,hash(x+101,y+101,5));
  c.putImageData(groundImage(g),0,0);
  cachedTerrain=a;return a;
}
let expandedTerrain=null,expandedTerrainKitReady=false,expandedGround=null;
function terrain(c,a,time){
  const kitReady=Boolean(globalThis.VilaVisualAssets?.isReady());
  if(!expandedTerrain||expandedTerrainKitReady!==kitReady){
    expandedTerrainKitReady=kitReady;
    if(!expandedGround){const g=groundBuffer(1536,1536,-576,-384);
      for(let y=-24;y<72;y++)for(let x=-36;x<60;x++){
        const h=hash(x+101,y+101,5);dress(g,x,y,h);}
      expandedGround=groundImage(g);}
    expandedTerrain=document.createElement('canvas');expandedTerrain.width=1536;expandedTerrain.height=1536;
    const e=expandedTerrain.getContext('2d');e.putImageData(expandedGround,0,0);e.imageSmoothingEnabled=false;e.translate(576,384);
    for(let y=-18;y<70;y+=9)for(let x=-31;x<17;x+=8){if(x>=0&&y>=0&&y<43)continue;const h=hash(x+57,y+41,9);if(h%3===0)sprite(e,a,'olive',x*16-44,y*16-91);else if(h%3===1)sprite(e,a,'bush',x*16-10,y*16-8);}
  }
  c.drawImage(expandedTerrain,-576,-384);
  c.drawImage(terrainBase(),-16,-32);
  // Visible rectangle in art cells; animated water is drawn only there.
  const m=c.getTransform().inverse(),v0=m.transformPoint(new DOMPoint(0,0)),v1=m.transformPoint(new DOMPoint(c.canvas.width,c.canvas.height));
  const x0=Math.floor(v0.x/AP)-2,x1=Math.ceil(v1.x/AP)+2,y0=Math.max(-192,Math.floor(v0.y/AP)-2),y1=Math.min(576,Math.ceil(v1.y/AP)+2);
  // Delicate surf and ripples remain animated; the coastline itself never moves.
  const phase=Math.floor(time*2);
  for(let j=y0;j<y1;j++){const sx=Math.floor(shorelineX((j*AP+1)/16)*16/AP),h=hash(j,3,11);if(h%3===2)continue;const o=(phase+h)%4;
    rect(c,(sx+1+o)*AP,j*AP,(1+h%2)*AP,AP,o===0?P.foamHi:P.foam);}
  for(let gj=Math.floor(y0/5)*5;gj<y1;gj+=5)for(let gi=Math.floor(x0/9)*9;gi<x1;gi+=9){const h=hash(gi,gj,13);if(h%4)continue;
    if(gi<shorelineX((gj*AP+1)/16)*16/AP+4)continue;const o=(phase+h)%6;rect(c,(gi+o)*AP,gj*AP,(2+h%3)*AP,AP,h%3===0?P.waterLight:P.waterHi);}
  // A fish jumps somewhere near the coast every few seconds.
  for(let k=0;k<2;k++){const cyc=time/3.7+k*.5,n=Math.floor(cyc),f=cyc-n,h=hash(n,k,21),fy=3+h%40,fx=shorelineX(fy)+1.6+(h>>>6)%5;
    const bx=Math.round(fx*16/AP),by=Math.round(fy*16/AP);
    if(f<.16){const u=f/.16,ux=bx-3+Math.round(u*6),uy=by-Math.round(Math.sin(u*Math.PI)*5);rect(c,ux*AP,uy*AP,2*AP,AP,P.paper);rect(c,(ux-1)*AP,uy*AP,AP,AP,P.stoneHi);}
    else if(f<.36){const r=f<.26?1:2;[[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy])=>rect(c,(bx+3+dx*r*2)*AP,(by+dy*r)*AP,AP,AP,P.foamHi));}}
  // Low dressing deliberately avoids the path and keeps landmarks readable.
  [[3,3],[10,4],[2,21],[10,27],[17,31],[4,37],[15,40],[1,12]].forEach(([x,y])=>sprite(c,a,'rocks',x*16-14,y*16-8));
  [[17,9],[17,13],[21,24],[21,28],[22,38],[20,34]].forEach(([x,y])=>sprite(c,a,'reeds',Math.round(Math.max(x*16,shorelineX(y)*16-16)/AP)*AP,y*16-15));
  [[1,3],[9,9],[2,33],[16,31],[17,40],[8,39],[1,17]].forEach(([x,y])=>sprite(c,a,'bush',x*16-10,y*16-8));
}
const FLAMES=Object.freeze(['....r...../....rr..../...rro..r./...roor.r./..rrooorr./..rooyoor./.rrooyyor./.rooyyyoor/.rooywyyor/rrooywwyor/rooyywwyoo/rooyywwyor/.rooyyyoor/..rroooor.',
  '......r.../..r...r.../..r..rr.../..rr.ror../..rrroorr./.rrooyoor./.roooyyor./.rooyyyoor/rrooywyyor/rooyywwyor/rooyywwyoo/rooyywwyor/.rooyyyoor/..rroooor.',
  '.....r..../.r...r..../.r..rro.r./.rr.roor../..rroooor./..roooyorr/.rrooyyoor/.rooyyyoor/.rooyywyor/rrooywwyor/rooyywwyor/rooyywwyor/.rooyyyoor/..rroooor.',
  '...r....../...rr..r../..rro..rr./..roo.ror./.rrooorror/.rooyyoor./.rooyyyor./rrooyyyoor/rooyywyyor/rooyywwyor/rooyywwyoo/rooyywwyor/.rooyyyoor/..rroooor.']);
function flame(c,x,y,time){
  const k=Math.floor(time*5)%4,bx=Math.round(x/AP),by=Math.round(y/AP);
  pix(c,(bx-5)*AP,(by-14)*AP,FLAMES[k].split('/'),{r:P.fire,o:P.fireMid,y:P.fireHi,w:P.fireCore});
  for(let i=0;i<3;i++){const rise=(time*5+i*7)%21,dx=Math.round(Math.sin(time*.7+i*2)*1.5);c.globalAlpha=(1-rise/21)*.3;rect(c,(bx+dx-1)*AP,(by-16-Math.floor(rise))*AP,2*AP,2*AP,P.stoneHi);}c.globalAlpha=1;
  const spark=Math.floor(time*9)%13;rect(c,(bx+2-(spark>>2)%2)*AP,(by-13-spark)*AP,AP,AP,P.fireHi);
}
function screenToWorld(canvas,state,clientX,clientY){const b=canvas.getBoundingClientRect(),s=canvas.width/384*(state.camera?.zoom||1),cam=state.camera||{x:12,y:21.333};return{x:((clientX-b.left)*canvas.width/b.width-canvas.width/2)/s/16+cam.x,y:((clientY-b.top)*canvas.height/b.height-canvas.height/2)/s/16+cam.y};}
// Village life (chapter 2): decorative residents by trade, a pure function of time. They do not change the
// canonical state (residents, collision, chronology); state.folk replaces them when a director scripts a scene.
function track(t,keys){let i=0;while(i<keys.length-2&&t>=keys[i+1][0])i++;
  const a=keys[i],b=keys[i+1],u=Math.max(0,Math.min(1,(t-a[0])/((b[0]-a[0])||1))),dx=b[1]-a[1],dy=b[2]-a[2],moving=(dx!==0||dy!==0)&&u>0&&u<1;
  return{x:a[1]+dx*u,y:a[2]+dy*u,walking:moving,facing:moving?(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up')):(a[3]||'down')};}
const MASON_KEYS=(()=>{const at=y=>pathCenterX(y)+.45,ys=[22.8,24.2,25.6,27,28.4,29.8,31.2],k=[];
  ys.slice(0,4).forEach((y,i)=>k.push([i*4/3,at(y),y,'down']));k.push([5.6,at(27),27,'down']);
  ys.slice(4).forEach((y,i)=>k.push([5.6+(i+1)*4/3,at(y),y,'down']));k.push([12,at(31.2),31.2,'down']);
  ys.slice(0,6).reverse().forEach((y,i)=>k.push([12+(i+1)*1.5,at(y),y,'up']));k.push([24,at(22.8),22.8,'down']);return Object.freeze(k);})();
function villageLife(time){
  const t=Math.max(0,time),out=[];
  const ts=t%26,sheep=track(ts,[[0,14.6,28.2,'left'],[7,14.6,28.2,'left'],[8.4,17.6,30.4,'right'],[12,17.6,30.4,'right'],[16,14.6,28.2,'left'],[26,14.6,28.2,'left']]);
  Object.assign(sheep,{kind:'ovelha',run:ts>=7&&ts<8.4,graze:!sheep.walking&&(ts<6||ts>17)});
  if(ts>=6.6&&ts<8.4)sheep.bubble='BÉÉÉ!';else if(ts>=14&&ts<15)sheep.bubble='BÉ!';
  const pastor=track(ts,[[0,13.2,27.5,'right'],[8.6,13.2,27.5,'right'],[10.8,16.6,30.1,'right'],[12,16.6,30.1,'right'],[16,13.2,27.5,'right'],[26,13.2,27.5,'right']]);
  Object.assign(pastor,{kind:'pastor',run:ts>=8.6&&ts<10.8});
  if(ts>=8&&ts<9.8)pastor.bubble='VOLTA AQUI!';else if(ts>=16.2&&ts<17.4)pastor.bubble='UFA!';
  const tc=t%14,ouch=tc>=8&&tc<10.5,carp={kind:ouch?'carpinteiro':'carpinteiroBare',x:12.9,y:8.6,facing:ouch?'down':'left',walking:ouch&&tc>=8.9,hop:tc>=8&&tc<8.9,plank:true};
  if(!ouch)carp.pose=Math.floor(tc*4)%2?'hammerDown':'hammerUp';
  if((tc>=1&&tc<2.4)||(tc>=5&&tc<6.2))carp.bubble='TOC TOC';else if(ouch&&tc<9.6)carp.bubble='AI!';
  const tm=t%24,mason=track(tm,MASON_KEYS);mason.kind='pedreiro';
  if(tm>=4&&tm<5.6)mason.lean=Math.floor(tm*8)%2?1:-1;
  if(tm>=3.9&&tm<5.4)mason.bubble='QUASE...';else if(tm>=5.6&&tm<6.6)mason.bubble='UFA!';
  const ta=t%22,farmer=track(ta,[[0,4.6,21.6,'right'],[1.5,4.6,21.6,'right'],[4,7.35,23.3,'right'],[8,7.35,23.3,'right'],[10.5,4.6,21.6,'right'],[22,4.6,21.6,'right']]);
  Object.assign(farmer,{kind:'agricultora',crouch:ta>=4&&ta<8});
  if(ta>=4.3&&ta<6.5)farmer.bubble='AQUI TÁ BOM!';else if(ta>=13&&ta<14.5)farmer.bubble='CRESCE!';
  const tb=t%18,baker=track(tb,[[0,9.5,20.1,'down'],[9,9.5,20.1,'down'],[11,12,20.1,'right'],[13,12,20.1,'right'],[15,9.5,20.1,'down'],[18,9.5,20.1,'down']]);
  Object.assign(baker,{kind:'padeira',steam:true});
  if(tb>=2&&tb<4.4)baker.bubble='PÃO QUENTINHO!';else if(tb>=11.2&&tb<12.8)baker.bubble='QUER UM?';
  out.push(pastor,sheep,carp,mason,farmer,baker,{kind:'broto',x:8.05,y:23.45,watered:ta>=5&&ta<8});
  return out;
}
const HAMMER=Object.freeze({hammerUp:['kHk','.W.','.W.','.w.'],hammerDown:['.W.','.W.','kHk']});
const SPROUT=Object.freeze(['..l../.lgl./..g../..g../.ddd.','...l./.lgl./..g../..g../.ddd.']);
function blink(time,seed){return(time+seed*1.37)%3.7<.13;}
function drawFolk(c,n,time,bubbles,options){
  const atlas=folkAtlas(),x=Math.round(n.x*16/AP)*AP,y=Math.round(n.y*16/AP)*AP;
  if(n.kind==='broto'){pix(c,x-5,y-8,SPROUT[Math.floor(time*2)%2].split('/'),{l:P.tuftHi,g:P.tuft,d:P.soil});
    if(n.watered)for(let i=0;i<3;i++){const u=(time*2+i/3)%1;rect(c,x-2+(i-1)*4,y-10-Math.round(u*6),AP,AP,P.waterLight);}return;}
  if(n.kind==='ovelha'){shadow(c,n.x,n.y,10);const fr=n.graze?2:n.walking?1+Math.floor(time*(n.run?12:6))%2:0;
    c.drawImage(atlas,(n.facing==='right'?96:0)+fr*32,192,32,24,x-16,y-22,32,24);if(n.bubble)bubbles.push({x:n.x*16,y:n.y*16-20,text:n.bubble});return;}
  const f=FOLK[n.kind.replace(/Bare$/,'')],dir={down:0,left:1,right:2,up:3}[n.facing]??0,frame=n.walking?Math.floor(time*(n.run?11:6))%3:0;
  const lift=n.hop?Math.round(Math.abs(Math.sin(time*16))*3):0,dx=x-16+(n.lean||0)*AP,dy=y-46-lift*AP+(n.crouch?AP:0);
  shadow(c,n.x,n.y,8);
  if(n.plank){rect(c,x-30,y-4,16,4,P.woodLo);rect(c,x-28,y-4,12,2,P.woodHi);}
  c.drawImage(atlas,FOLK_ORDER.indexOf(n.kind)*96+frame*32,dir*48,32,48,dx,dy,32,48);
  if(dir===0&&!frame&&blink(time,FOLK_ORDER.indexOf(n.kind))){rect(c,dx+12,dy+14,AP,2*AP,SKINS[f.skin][0]);rect(c,dx+18,dy+14,AP,2*AP,SKINS[f.skin][0]);}
  if(n.pose)pix(c,dx+(n.pose==='hammerUp'?4:2),dy+(n.pose==='hammerUp'?20:36),HAMMER[n.pose],PROPS.hammer.pal);
  if(n.pose==='hammerDown'&&Math.floor(time*8)%2)rect(c,x-26,y-8,AP,AP,P.paper);
  if(n.steam)for(let i=0;i<3;i++){const u=(time*.9+i/3)%1;c.globalAlpha=(1-u)*.6;rect(c,dx+12+i*4+Math.round(Math.sin(time*3+i)*2),dy+24-Math.round(u*14),AP,AP,P.paper);}c.globalAlpha=1;
  if(n.bubble)bubbles.push({x:n.x*16,y:dy+4,text:n.bubble});
  else if(options.showLabels&&f.label)bubbles.push({label:true,x,y:y-50,text:f.label});
}
const BIRD=Object.freeze([['w...w','.wgw.'],['.....','wwgww']]);
function ambient(c,time){
  for(let i=0;i<2;i++){const cyc=(time+i*7.3)/14,n=Math.floor(cyc),f=cyc-n,h=hash(n,i,31),bx=Math.round((-4+f*34)*16/AP),by=Math.round((4+h%30+f*(h%7-3))*16/AP),w=BIRD[Math.floor(time*6+i)%2];
    c.globalAlpha=.16;pix(c,(bx+4)*AP,(by+12)*AP,w,{w:P.outline,g:P.outline});c.globalAlpha=1;pix(c,bx*AP,by*AP,w,{w:P.paper,g:P.stoneHi});}
  [[11.5,6.5],[4.2,29.5],[14.5,14],[12.5,37]].forEach(([bx,by],i)=>{const x=Math.round((bx*16+Math.sin(time*1.3+i)*14)/AP),y=Math.round((by*16+Math.sin(time*2.1+i*2)*8)/AP);
    pix(c,x*AP,y*AP,[Math.floor(time*8+i)%2?'y.y':'.y.'],{y:i%2?P.paper:P.fireHi});});
}
function renderWorld(canvas,state,options={}){
  const c=canvas.getContext('2d'),a=createAtlas(),time=Number.isFinite(state.time)?state.time:0,cam=state.camera||{x:12,y:21.333,zoom:1},s=canvas.width/384*(cam.zoom||1);
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  c.save();c.translate(Math.round(canvas.width/2-cam.x*16*s),Math.round(canvas.height/2-cam.y*16*s));c.scale(s,s);terrain(c,a,time);
  const props=state.props||{},shelter=props.shelter||{x:1,y:6},fire=props.fire||{x:7,y:17,lit:true},jar=props.jar||{x:4,y:16},basket=props.basket||{x:5,y:18},boat=props.boat||{x:20,y:20},net=props.net||{x:17,y:21},bread=props.bread||{x:7,y:18.5};
  const fx=fire.x*16+8,fy=fire.y*16+11;
  if(fire.lit){c.globalAlpha=.14;ellipse(c,fx,fy,37,18,'#f8af40');c.globalAlpha=1;}
  const objects=[{type:'shelter',x:shelter.x*16-6,y:shelter.y*16-8,depth:(shelter.y+7.3)*16},
    {type:'jar',x:jar.x*16-5,y:jar.y*16-16,depth:(jar.y+1)*16},
    {type:'basket',x:basket.x*16-6,y:basket.y*16-13,depth:(basket.y+.7)*16},
    {type:'boat',x:boat.x*16-44,y:boat.y*16-24,depth:boat.y*16+20},
    {type:'net',x:net.x*16-20,y:net.y*16-20,depth:net.y*16+30},
    {type:'firepit',x:fx-24,y:fy-20,depth:fy+10}];
  const trees=props.olives||[{x:14,y:5},{x:3,y:25},{x:15,y:35}];
  trees.forEach(tree=>{const x=Array.isArray(tree)?tree[0]:tree.x,y=Array.isArray(tree)?tree[1]:tree.y;objects.push({type:'olive',x:x*16-44,y:y*16-91,depth:y*16+5});});
  Object.entries(state.entities||{}).forEach(([key,e])=>{if(e.visible!==false)objects.push({type:'person',key,e,depth:e.y*16+4});});
  if(options.folk!==false)(state.folk||villageLife(time)).forEach(n=>objects.push({type:'folk',n,depth:n.y*16+(n.kind==='broto'?-2:4)}));
  if(!bread.heldBy&&!bread.shared)objects.push({type:'bread',x:bread.x*16-10,y:bread.y*16-7,depth:bread.y*16+1});
  const bubbles=[];
  objects.sort((u,v)=>u.depth-v.depth).forEach(o=>{
    if(o.type==='person'){
      const e=o.e,visitor=e.role==='visitor'||o.key==='traveler',dirs={down:0,south:0,left:1,west:1,right:2,east:2,up:3,north:3};
      const frame=e.action==='walk'||e.moving?Math.floor(time*6)%3:0;
      shadow(c,e.x,e.y,8);
      c.drawImage(a,(visitor?112:0)+frame*32,176+(dirs[e.facing]??0)*48,32,48,Math.round(e.x*16-16),Math.round(e.y*16-46),32,48);
      if(!frame&&(dirs[e.facing]??0)===0&&blink(time,visitor?7:9)){const bx=Math.round(e.x*16-16),by=Math.round(e.y*16-46),sk=visitor?SKINS.warm[0]:P.skin;rect(c,bx+12,by+14,AP,2*AP,sk);rect(c,bx+18,by+14,AP,2*AP,sk);}
      if(bread.heldBy===e.id)c.drawImage(a,368,88,20,16,Math.round(e.x*16+5),Math.round(e.y*16-17),10,8);
      if(e.action==='share')rect(c,e.x*16+8,e.y*16-19,10,3,P.skin);
      if(bread.shared&&(bread.owners||['pescador1','visitante1']).includes(e.id)){const facingLeft=e.facing==='left';c.drawImage(a,visitor?378:368,88,10,16,Math.round(e.x*16+(facingLeft?-14:9)),Math.round(e.y*16-19),5,8);}
      if(options.showLabels)bubbles.push({label:true,x:Math.round(e.x*16),y:Math.round(e.y*16-50),text:visitor?'VISITANTE':'PESCADOR'});
    }else if(o.type==='folk')drawFolk(c,o.n,time,bubbles,options);
    else if(o.type==='bread'&&bread.shared){c.drawImage(a,368,88,10,16,o.x-3,o.y,10,16);c.drawImage(a,378,88,10,16,o.x+13,o.y,10,16);}
    else sprite(c,a,o.type,o.x,o.y);
  });
  if(shelter.reinforced){poly(c,[[shelter.x*16+8,shelter.y*16+60],[shelter.x*16+113,shelter.y*16+66],[shelter.x*16+113,shelter.y*16+71],[shelter.x*16+8,shelter.y*16+65]],P.woodHi);}
  if(fire.lit)flame(c,fx,fy-3,time);
  if(options.ambient!==false)ambient(c,time);
  // Names and speech go on top of everything, labels first.
  bubbles.filter(b=>b.label).forEach(b=>{c.font='8px monospace';c.textAlign='center';c.fillStyle=P.ink;c.fillText(b.text,b.x,b.y);});
  bubbles.filter(b=>!b.label).forEach(b=>bubble(c,b.x,b.y,b.text));
  if(options.showGrid){c.strokeStyle='rgba(74,56,37,.16)';c.lineWidth=.5;for(let x=0;x<=24;x++){c.beginPath();c.moveTo(x*16,0);c.lineTo(x*16,672);c.stroke();}for(let y=0;y<=42;y++){c.beginPath();c.moveTo(0,y*16);c.lineTo(384,y*16);c.stroke();}}
  c.restore();const night=Math.max(0,Math.min(1,state.lighting?.night||0));if(night){c.fillStyle=`rgba(25,38,68,${night*.28})`;c.fillRect(0,0,canvas.width,canvas.height);}
  if(options.watermark){c.font='10px monospace';c.fillStyle=P.creamHi;c.textAlign='left';c.fillText('PROTÓTIPO • TOP-DOWN v0.2',12,canvas.height-14);}
  return{artVersion:'topdown-v0.3',width:canvas.width,height:canvas.height,time};
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
