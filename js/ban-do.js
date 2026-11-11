/* =========================================================
   Traffic Prune · ban-do.js: BẢN ĐỒ, ĐƯỜNG, ĐÈN, Ô ĐỖ, ĐIỂM GIAO, LỘ TRÌNH NPC
   Toạ độ tính theo "đơn vị bản đồ": 4 đơn vị = 1 mét trong game.
   ========================================================= */
'use strict';

/* =========================================================
   2. BẢN ĐỒ
   ========================================================= */
const W = 1600, H = 1200, HALF = 40;
const HR = [{y:300, name:'Đường Hoa Sữa'}, {y:900, name:'Đường Me Chua'}];
const VR = [{x:400, name:'Phố Bánh Mì'}, {x:1200, name:'Đường Cầu Vồng'}];
const OW = {x:800, y1:300, y2:900, half:22, name:'Phố Chợ'};
const RB = {x:1200, y:900, rOut:100, rIn:48, rLane:76};
const LIGHTS = [{x:400,y:300,off:0},{x:1200,y:300,off:7},{x:400,y:900,off:14}];
const CYCLE = 22;
const CURB = 18;
// Thứ tự khi xe tiến vào ngã tư: vạch dừng, vạch người đi bộ, rồi tới cột đèn ở góc giao lộ
const CW_NEAR = HALF + CURB + 4, CW_FAR = CW_NEAR + 12;   // vạch người đi bộ cách tâm ngã tư
const STOPG = CW_FAR + 6 - HALF;                         // vạch dừng cách mép ngã tư (đơn vị bản đồ)

function lightOf(L, axis, t){
  const c = ((t + L.off) % CYCLE + CYCLE) % CYCLE;
  if (axis === 'NS'){ if (c < 8) return 'green'; if (c < 10) return 'yellow'; return 'red'; }
  if (c >= 11 && c < 19) return 'green'; if (c >= 19 && c < 21) return 'yellow'; return 'red';
}
function lightAt(X, Y){ return LIGHTS.find(L => L.x === X && L.y === Y) || null; }

// Ô đỗ xe (khoét vào vỉa hè, sát mép đường)
const BAY_L = 70, BAY_D = 16;
function bayH(Y, side, x){ const y = side === 'S' ? Y + HALF : Y - HALF - BAY_D;
  return {x: x - BAY_L/2, y, w: BAY_L, h: BAY_D, cx: x, cy: y + BAY_D/2, side, proj: {x, y: Y}}; }
function bayV(X, side, y, half){ half = half || HALF; const x = side === 'E' ? X + half : X - half - BAY_D;
  return {x, y: y - BAY_L/2, w: BAY_D, h: BAY_L, cx: x + BAY_D/2, cy: y, side, proj: {x: X, y}}; }

// Nút và đoạn đường (dùng cho chỉ đường)
const N = {W1:{x:0,y:300}, A:{x:400,y:300}, B:{x:800,y:300}, C:{x:1200,y:300}, E1:{x:1600,y:300},
           W2:{x:0,y:900}, D:{x:400,y:900}, E:{x:800,y:900}, F:{x:1200,y:900}, E2:{x:1600,y:900},
           N1:{x:400,y:0}, S1:{x:400,y:1200}, N2:{x:1200,y:0}, S2:{x:1200,y:1200}};
const DEAD = {W1:1, E1:1, W2:1, E2:1, N1:1, S1:1, N2:1, S2:1};
const SEGS = [
  {a:'W1',b:'A',name:'Đường Hoa Sữa'}, {a:'A',b:'B',name:'Đường Hoa Sữa'}, {a:'B',b:'C',name:'Đường Hoa Sữa'}, {a:'C',b:'E1',name:'Đường Hoa Sữa'},
  {a:'W2',b:'D',name:'Đường Me Chua'}, {a:'D',b:'E',name:'Đường Me Chua'}, {a:'E',b:'F',name:'Đường Me Chua'}, {a:'F',b:'E2',name:'Đường Me Chua'},
  {a:'N1',b:'A',name:'Phố Bánh Mì'}, {a:'A',b:'D',name:'Phố Bánh Mì'}, {a:'D',b:'S1',name:'Phố Bánh Mì'},
  {a:'N2',b:'C',name:'Đường Cầu Vồng'}, {a:'C',b:'F',name:'Đường Cầu Vồng'}, {a:'F',b:'S2',name:'Đường Cầu Vồng'},
  {a:'E',b:'B',name:'Phố Chợ',oneway:true}
];
function segIdx(a, b){ return SEGS.findIndex(s => (s.a === a && s.b === b) || (s.a === b && s.b === a)); }
const RING_SIDE = {C:'N', E:'W', S2:'S', E2:'E'};
const RING_CCW = ['W','S','E','N'];

const DESTS = [
  {name:'Tiệm bánh mì Cô Ba', icon:'🥖', bay: bayH(300,'S',600), seg: segIdx('A','B')},
  {name:'Quán trà đá Chú Tèo', icon:'🍵', bay: bayH(300,'N',180), seg: segIdx('W1','A')},
  {name:'Bưu cục Phố Mới', icon:'📮', bay: bayH(300,'S',1420), seg: segIdx('C','E1')},
  {name:'Chợ Hoa Sữa', icon:'🛒', bay: bayV(800,'E',600,22), seg: segIdx('E','B')},
  {name:'Trường mầm non Sơn Ca', icon:'🏫', bay: bayV(400,'E',620), seg: segIdx('A','D')},
  {name:'Tiệm hoa Bà Tư', icon:'🌸', bay: bayV(1200,'E',600), seg: segIdx('C','F')},
  {name:'Cà phê Hẻm Nhỏ', icon:'☕', bay: bayH(900,'N',950), seg: segIdx('E','F')},
  {name:'Tiệm sửa xe Út Lành', icon:'🔧', bay: bayV(400,'W',1080), seg: segIdx('D','S1')},
  {name:'Tiệm thuốc Cô Hạnh', icon:'💊', bay: bayH(900,'S',1460), seg: segIdx('F','E2')}
];
const BAYS = DESTS.map(d => d.bay).concat([bayH(300,'N',1000), bayV(1200,'W',120)]);
for (const d of DESTS){
  const b = d.bay;
  d.lx = b.side === 'E' ? b.x + b.w + 16 : b.side === 'W' ? b.x - 16 : b.cx;
  d.ly = b.side === 'S' ? b.y + b.h + 14 : b.side === 'N' ? b.y - 14 : b.cy;
}

// Vỉa hè ở góc giao lộ được bo cong bán kính CURB (khai báo ở trên, cạnh CYCLE)
const CORNERS = [];
for (const v of VR) for (const h of HR){
  if (v.x === RB.x && h.y === RB.y) continue;
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) CORNERS.push({X:v.x, Y:h.y, hw:HALF, dx, dy, t:{t:'junction', X:v.x, Y:h.y}});
}
for (const h of [{y:OW.y1, dy:1}, {y:OW.y2, dy:-1}])
  for (const dx of [-1, 1]) CORNERS.push({X:OW.x, Y:h.y, hw:OW.half, dx, dy:h.dy, t:{t:'h', Y:h.y}});
for (const c of CORNERS){
  c.ex = c.X + c.dx*c.hw; c.ey = c.Y + c.dy*HALF;                 // góc mép đường
  c.cx = c.ex + c.dx*CURB; c.cy = c.ey + c.dy*CURB;               // tâm cung bo
}
function inCurb(x, y){
  for (const c of CORNERS){
    const ux = (x - c.ex) * c.dx, uy = (y - c.ey) * c.dy;
    if (ux >= 0 && ux <= CURB && uy >= 0 && uy <= CURB && Math.hypot(x - c.cx, y - c.cy) > CURB) return c.t;
  }
  return null;
}

function classify(x, y){
  for (const b of BAYS) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return {t:'bay', bay:b};
  const dr = Math.hypot(x - RB.x, y - RB.y);
  if (dr <= RB.rOut) return dr < RB.rIn ? {t:'island'} : {t:'ring'};
  for (const v of VR) for (const h of HR)
    if (Math.abs(x - v.x) <= HALF && Math.abs(y - h.y) <= HALF) return {t:'junction', X:v.x, Y:h.y};
  if (Math.abs(x - OW.x) <= OW.half && y >= OW.y1 + HALF && y <= OW.y2 - HALF) return {t:'oneway'};
  for (const h of HR) if (Math.abs(y - h.y) <= HALF && x >= 0 && x <= W) return {t:'h', Y:h.y};
  for (const v of VR) if (Math.abs(x - v.x) <= HALF && y >= 0 && y <= H) return {t:'v', X:v.x};
  return inCurb(x, y) || {t:'off'};
}

// Vạch giữa đường: 'solid' (liền) gần ngã tư và vòng xuyến, 'broken' (đứt) ở giữa đoạn, 'none' trong nút giao
const SOLID_LEN = 90;
function lineType(axis, fixed, t){
  if (axis === 'h'){
    for (const v of VR) if (Math.abs(t - v.x) <= HALF) return 'none';
    if (Math.hypot(t - RB.x, fixed - RB.y) <= RB.rOut) return 'none';
    if (Math.abs(t - OW.x) <= OW.half) return 'none';
    for (const v of VR){ const ring = v.x === RB.x && fixed === RB.y;
      if (Math.abs(t - v.x) <= (ring ? RB.rOut : HALF) + SOLID_LEN) return 'solid'; }
    return 'broken';
  }
  for (const h of HR) if (Math.abs(t - h.y) <= HALF) return 'none';
  if (Math.hypot(fixed - RB.x, t - RB.y) <= RB.rOut) return 'none';
  for (const h of HR){ const ring = fixed === RB.x && h.y === RB.y;
    if (Math.abs(t - h.y) <= (ring ? RB.rOut : HALF) + SOLID_LEN) return 'solid'; }
  return 'broken';
}
const EXT = 600; // đường kéo dài ra ngoài khu phố cho đẹp mắt
function lineRuns(axis, fixed, len){
  const runs = []; let cur = null;
  for (let t = -EXT; t <= len + EXT; t += 2){
    const ty = lineType(axis, fixed, t);
    if (!cur || cur.type !== ty){ if (cur) runs.push(cur); cur = {type: ty, a: t, b: t}; } else cur.b = t;
  }
  if (cur) runs.push(cur);
  return runs.filter(r => r.type !== 'none');
}
const CENTER_LINES = [];
for (const h of HR) CENTER_LINES.push({axis:'h', fixed:h.y, runs: lineRuns('h', h.y, W)});
for (const v of VR) CENTER_LINES.push({axis:'v', fixed:v.x, runs: lineRuns('v', v.x, H)});

// Nhà cửa
let seed = 7;
function rnd(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function rectCircleDist(r, cx, cy){
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w)), ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  return Math.hypot(cx - nx, cy - ny);
}
function darken(hex, f){
  const n = parseInt(hex.slice(1), 16), r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
const BLOCKS = [];
{
  const bx = [[0,360],[440,1160],[1240,1600]], by = [[0,260],[340,860],[940,1200]];
  for (const [x1,x2] of bx) for (const [y1,y2] of by){
    if (x1 === 440 && y1 === 340){ BLOCKS.push({x1:440,x2:778,y1,y2}); BLOCKS.push({x1:822,x2:1160,y1,y2}); }
    else BLOCKS.push({x1,x2,y1,y2});
  }
}
const SIDE = 22;
const HOUSES = [];
const HOUSE_COLORS = ['#f6c89f','#f4a6a6','#a8d5e2','#cdb4db','#ffd6a5','#b9e4c9','#fbe7a1','#c9d6ff','#f2b5d4'];
for (const b of BLOCKS){
  const ax = b.x1 + SIDE, ay = b.y1 + SIDE, aw = b.x2 - b.x1 - 2*SIDE, ah = b.y2 - b.y1 - 2*SIDE;
  if (aw < 30 || ah < 30) continue;
  const nx = Math.max(1, Math.round(aw / 120)), ny = Math.max(1, Math.round(ah / 110));
  const market = (b.x1 === 822 && b.y1 === 340);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++){
    const r = {x: ax + i*aw/nx + 5, y: ay + j*ah/ny + 5, w: aw/nx - 10, h: ah/ny - 10};
    if (rectCircleDist(r, RB.x, RB.y) < RB.rOut + 18) continue;
    const stall = market && r.x < 1010 && r.y > 380 && r.y < 760;
    const color = HOUSE_COLORS[Math.floor(rnd()*HOUSE_COLORS.length)];
    HOUSES.push({...r, stall, color, dark: darken(color, 0.72), awn: Math.floor(rnd()*4)});
  }
}
function hitsHouse(x, y, rad){
  for (const h of HOUSES)
    if (x > h.x - rad && x < h.x + h.w + rad && y > h.y - rad && y < h.y + h.h + rad) return true;
  return false;
}

/* =========================================================
   3. ĐƯỜNG ĐI CỦA NPC
   ========================================================= */
function P(x, y){ return {x, y}; }
function ringPt(th){ return {x: RB.x + RB.rLane*Math.cos(th), y: RB.y + RB.rLane*Math.sin(th)}; }
// Ngoài đời đi vòng xuyến theo chiều ngược kim đồng hồ; với trục y hướng xuống, góc atan2 giảm dần.
function arc(a, b){
  while (b >= a) b -= 2*Math.PI;
  const n = Math.max(2, Math.ceil((a - b) / 0.22)), pts = [];
  for (let i = 1; i <= n; i++) pts.push(ringPt(a + (b - a) * i / n));
  return pts;
}
const R_OFF = RB.rOut + 4;
const ENTRY = {N: Math.atan2(-74,-20), W: Math.atan2(20,-74), S: Math.atan2(74,20), E: Math.atan2(-20,74)};
const EXITA = {N: Math.atan2(-74,20), W: Math.atan2(-20,-74), S: Math.atan2(74,-20), E: Math.atan2(20,74)};
const YIELDP = {N: P(1180, RB.y - R_OFF), W: P(RB.x - R_OFF, 920), S: P(1220, RB.y + R_OFF), E: P(RB.x + R_OFF, 880)};
const EXITP = {N: P(1220, RB.y - R_OFF), W: P(RB.x - R_OFF, 880), S: P(1180, RB.y + R_OFF), E: P(RB.x + R_OFF, 920)};
function ringRoute(from, to){
  const y = {...YIELDP[from], yieldAt: ENTRY[from]};
  return [y, ...arc(ENTRY[from], EXITA[to]), {...EXITP[to]}];
}
const ROUTES = [
  {loop:true, n:4, bus:1, pts:[P(420,320), P(1180,320), ...ringRoute('N','W'), P(420,880)]},
  {loop:true, n:3, bus:1, pts:[P(1220,280), P(380,280), P(380,920), ...ringRoute('W','N')]},
  {loop:true, n:3, bus:0, pts:[P(800,860), P(800,320), P(1180,320), ...ringRoute('N','W'), P(800,880)]},
  {loop:false, n:2, pts:[P(-40,320), P(1640,320)]},
  {loop:false, n:2, pts:[P(1640,280), P(-40,280)]},
  {loop:false, n:2, pts:[P(420,1240), P(420,-40)]},
  {loop:false, n:2, pts:[P(380,-40), P(380,1240)]},
  {loop:false, n:2, pts:[P(-40,920), ...ringRoute('W','E'), P(1640,920)]},
  {loop:false, n:2, pts:[P(1640,880), ...ringRoute('E','W'), P(-40,880)]},
  {loop:false, n:2, pts:[P(1180,-40), ...ringRoute('N','S'), P(1180,1240)]},
  {loop:false, n:2, pts:[P(1220,1240), ...ringRoute('S','N'), P(1220,-40)]}
];
function pathLen(pts, loop){
  let L = 0; const seg = [];
  const m = loop ? pts.length : pts.length - 1;
  for (let i = 0; i < m; i++){
    const a = pts[i], b = pts[(i+1) % pts.length]; const d = Math.hypot(b.x-a.x, b.y-a.y);
    seg.push(d); L += d;
  }
  return {L, seg};
}
function pointAt(route, s){
  const {seg} = pathLen(route.pts, route.loop);
  for (let i = 0; i < seg.length; i++){
    if (s <= seg[i]){ const a = route.pts[i], b = route.pts[(i+1) % route.pts.length], f = s / seg[i];
      return {x: a.x + (b.x-a.x)*f, y: a.y + (b.y-a.y)*f, idx: (i+1) % route.pts.length}; }
    s -= seg[i];
  }
  return {x: route.pts[0].x, y: route.pts[0].y, idx: 1};
}

