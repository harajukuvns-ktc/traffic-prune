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
// Phố Chợ: phố đi bộ (từ bản 0.9), hai đầu cắm biển P.104 cấm xe máy và P.103a cấm ô tô
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
// Ô đỗ xe kẻ vạch NGAY TRÊN LÒNG ĐƯỜNG, sát mép vỉa hè bên phải theo chiều xe chạy của làn đó
// (khoản 6 Điều 18 Luật TTATGTĐB 2024: trên đường phố chỉ được dừng, đỗ sát lề đường, vỉa hè phía bên phải theo chiều đi).
//   side 'S': mép nam của đường ngang, xe đi hướng đông · 'N': mép bắc, hướng tây
//   side 'E': mép đông của đường dọc, xe đi hướng bắc · 'W': mép tây, hướng nam
//   dir: chiều xe phải hướng theo khi đỗ trong ô
const BAY_L = 70, BAY_D = 16;
function bayH(Y, side, x){ const y = side === 'S' ? Y + HALF - BAY_D : Y - HALF;
  return {x: x - BAY_L/2, y, w: BAY_L, h: BAY_D, cx: x, cy: y + BAY_D/2, side, proj: {x, y: Y},
          dir: side === 'S' ? {x: 1, y: 0} : {x: -1, y: 0}}; }
function bayV(X, side, y, half){ half = half || HALF; const x = side === 'E' ? X + half - BAY_D : X - half;
  return {x, y: y - BAY_L/2, w: BAY_D, h: BAY_L, cx: x + BAY_D/2, cy: y, side, proj: {x: X, y},
          dir: side === 'E' ? {x: 0, y: -1} : {x: 0, y: 1}}; }

// Nút và đoạn đường (dùng cho chỉ đường)
const N = {W1:{x:0,y:300}, A:{x:400,y:300}, B:{x:800,y:300}, C:{x:1200,y:300}, E1:{x:1600,y:300},
           W2:{x:0,y:900}, D:{x:400,y:900}, E:{x:800,y:900}, F:{x:1200,y:900}, E2:{x:1600,y:900},
           N1:{x:400,y:0}, S1:{x:400,y:1200}, N2:{x:1200,y:0}, S2:{x:1200,y:1200}};
const DEAD = {W1:1, E1:1, W2:1, E2:1, N1:1, S1:1, N2:1, S2:1};
const SEGS = [
  {a:'W1',b:'A',name:'Đường Hoa Sữa'}, {a:'A',b:'B',name:'Đường Hoa Sữa'}, {a:'B',b:'C',name:'Đường Hoa Sữa'}, {a:'C',b:'E1',name:'Đường Hoa Sữa'},
  {a:'W2',b:'D',name:'Đường Me Chua'}, {a:'D',b:'E',name:'Đường Me Chua'}, {a:'E',b:'F',name:'Đường Me Chua'}, {a:'F',b:'E2',name:'Đường Me Chua'},
  {a:'N1',b:'A',name:'Phố Bánh Mì'}, {a:'A',b:'D',name:'Phố Bánh Mì'}, {a:'D',b:'S1',name:'Phố Bánh Mì'},
  {a:'N2',b:'C',name:'Đường Cầu Vồng'}, {a:'C',b:'F',name:'Đường Cầu Vồng'}, {a:'F',b:'S2',name:'Đường Cầu Vồng'}
  // Phố Chợ (E–B) là phố đi bộ từ bản 0.9: cắm biển cấm xe máy và ô tô, nên không có trong đồ thị đường cho xe
];
function segIdx(a, b){ return SEGS.findIndex(s => (s.a === a && s.b === b) || (s.a === b && s.b === a)); }
const RING_SIDE = {C:'N', E:'W', S2:'S', E2:'E'};
const RING_CCW = ['W','S','E','N'];

const DESTS = [
  {name:'Tiệm bánh mì Cô Ba', icon:'🥖', bay: bayH(300,'S',600), seg: segIdx('A','B')},
  {name:'Quán trà đá Chú Tèo', icon:'🍵', bay: bayH(300,'N',180), seg: segIdx('W1','A')},
  {name:'Bưu cục Phố Mới', icon:'📮', bay: bayH(300,'S',1420), seg: segIdx('C','E1')},
  {name:'Chợ Hoa Sữa (bãi đỗ xe cổng chợ)', icon:'🛒', bay: bayH(900,'N',875), seg: segIdx('E','F')},
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

// Biển chỉ dẫn hướng đi đặt trước ngã tư (nền xanh, chữ trắng; dạng chung, không gán số hiệu biển).
// Đặt bên phải, cách tâm ngã tư SIGN_BACK; mỗi biển ghi tên đường ở các hướng trái / thẳng / phải.
const SIGN_BACK = [150, 175, 125, 200], SIGN_SIDE = HALF + 8;
// vị trí cột biển P của các ô đỗ (để biển chỉ dẫn không chồng lên)
const P_SIGNS = BAYS.map(b => ({x: b.w > b.h ? b.x + 6 : (b.side === 'E' ? b.x + b.w + 3 : b.x - 3), y: b.w > b.h ? (b.side === 'S' ? b.y + b.h + 3 : b.y - 3) : b.y + 6}));
const SIGN_EXTRA = [{a:'B', b:'E', name:'Phố Chợ (đi bộ)', ped:true}];
const SIGNBOARDS = [];
for (const id of ['A','B','C','D','E']){
  const nb = [];
  for (const sg of SEGS.concat(SIGN_EXTRA)){
    if (sg.a === id) nb.push({id: sg.b, name: sg.name, ped: sg.ped});
    else if (sg.b === id) nb.push({id: sg.a, name: sg.name, ped: sg.ped});
  }
  for (const from of nb){
    if (DEAD[from.id] || from.ped) continue;   // từ mép bản đồ vào, hoặc từ phố đi bộ ra, thì không có biển
    let hx = N[id].x - N[from.id].x, hy = N[id].y - N[from.id].y; const hl = Math.hypot(hx, hy); hx /= hl; hy /= hl;
    const rows = [];
    for (const to of nb){
      if (to.id === from.id) continue;
      let dx = N[to.id].x - N[id].x, dy = N[to.id].y - N[id].y; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
      const cross = hx*dy - hy*dx, dot = hx*dx + hy*dy;   // trục y hướng xuống: cross > 0 là rẽ phải
      rows.push({k: (Math.abs(cross) < 0.5 && dot > 0) ? 'thang' : (cross > 0 ? 'phai' : 'trai'), name: to.name, ped: !!to.ped});
    }
    rows.sort((p, q) => ['trai','thang','phai'].indexOf(p.k) - ['trai','thang','phai'].indexOf(q.k));
    // thử vài khoảng cách, chọn chỗ đầu tiên không sát cột biển P hay biển chỉ dẫn khác
    let pos = null;
    for (const back of SIGN_BACK){
      const q = {x: N[id].x - hx*back - hy*SIGN_SIDE, y: N[id].y - hy*back + hx*SIGN_SIDE};
      if (!pos) pos = q;
      if (!P_SIGNS.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 52) && !SIGNBOARDS.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 60)){ pos = q; break; }
    }
    SIGNBOARDS.push({x: pos.x, y: pos.y, rows, node: id});
  }
}

// Giới hạn tốc độ (biển P.127 "Tốc độ tối đa cho phép"): đường thường 40 km/h; cả khối Phố Bánh Mì giữa hai ngã tư
// (có trường mầm non Sơn Ca, khoảng 130 m) là 30 km/h, kèm biển W.225 "Trẻ em". Mỗi đoạn đường giữa hai nút giao là một "đoạn".
// Từ bản 0.10.2: giữa đường chỉ nhắc nhở; camera phạt nguội ở vạch dừng các ngã tư có đèn mới là chỗ bị phạt (xem checkRules mục 1).
const SPEED_LIMIT = 40, SCHOOL = {x: 400, y1: 300, y2: 900, limit: 30};
function speedInfo(c, x, y){
  if (c.t === 'h'){ let k = 0; for (const v of VR) if (v.x < x) k++; return {id: 'h' + c.Y + '_' + k, limit: SPEED_LIMIT}; }
  if (c.t === 'v'){
    let k = 0; for (const h of HR) if (h.y < y) k++;
    if (c.X === SCHOOL.x && k === 1) return {id: 'school', limit: SCHOOL.limit};
    return {id: 'v' + c.X + '_' + k, limit: SPEED_LIMIT};
  }
  return null;
}
// Vị trí các biển: bên phải theo chiều đi, ngay sau mỗi ngã tư (bỏ qua đầu mép bản đồ và vòng xuyến);
// riêng khối Phố Bánh Mì thì đặt biển "Trẻ em" và biển 30 thay cho biển 40
const SPEED_SIGNS = [];
{
  const free = (q, r) => !P_SIGNS.some(o => Math.hypot(o.x - q.x, o.y - q.y) < r) && !SIGNBOARDS.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 60) && !SPEED_SIGNS.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 40);
  const put = (kind, v, bx, by, dx, dy, backs) => {   // (bx,by): điểm gốc; (dx,dy): chiều xe đi; backs: các khoảng cách thử
    const rx = -dy, ry = dx; let pos = null;
    for (const b of backs){
      const q = {x: bx + dx*b + rx*SIGN_SIDE, y: by + dy*b + ry*SIGN_SIDE};
      if (!pos) pos = q;
      if (free(q, 48)){ pos = q; break; }
    }
    SPEED_SIGNS.push({kind, v, x: pos.x, y: pos.y});
  };
  for (const sg of SEGS) for (const [from, to] of [[sg.a, sg.b], [sg.b, sg.a]]){
    if (DEAD[from] || from === 'F') continue;
    const a = N[from], b = N[to], l = Math.hypot(b.x - a.x, b.y - a.y), dx = (b.x - a.x) / l, dy = (b.y - a.y) / l;
    if (sg.a === 'A' && sg.b === 'D'){   // khối Phố Bánh Mì giữa hai ngã tư (đúng đoạn SCHOOL)
      put('child', 0, a.x, a.y, dx, dy, [HALF + 45, HALF + 70, HALF + 20]);
      put('limit', SCHOOL.limit, a.x, a.y, dx, dy, [HALF + 100, HALF + 125, HALF + 150, HALF + 80]);
    } else put('limit', SPEED_LIMIT, a.x, a.y, dx, dy, [HALF + 70, HALF + 95, HALF + 120, HALF + 150]);
  }
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
  if (Math.abs(x - OW.x) <= OW.half && y >= OW.y1 + HALF && y <= OW.y2 - HALF) return {t:'ped'};
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
// Khi VẼ, vạch vàng dừng ở vạch dừng (rồi tới vạch người đi bộ, rồi ngã tư), không chạy vào tận mép ngã tư.
// Còn việc bắt lỗi đè vạch vẫn dùng lineType() nên không đổi.
const LINE_DRAW_GAP = HALF + STOPG;
function drawGap(axis, fixed, t){
  for (const v of (axis === 'h' ? VR : HR)){
    const ring = axis === 'h' ? (v.x === RB.x && fixed === RB.y) : (fixed === RB.x && v.y === RB.y);
    if (ring) continue;
    if (Math.abs(t - (axis === 'h' ? v.x : v.y)) <= LINE_DRAW_GAP) return true;
  }
  return false;
}
function lineRuns(axis, fixed, len){
  const runs = []; let cur = null;
  for (let t = -EXT; t <= len + EXT; t += 2){
    const ty = drawGap(axis, fixed, t) ? 'none' : lineType(axis, fixed, t);
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
  {loop:false, n:3, pts:[P(-40,320), P(1640,320)]},
  {loop:false, n:3, pts:[P(1640,280), P(-40,280)]},
  {loop:false, n:2, pts:[P(420,1240), P(420,-40)]},
  {loop:false, n:2, pts:[P(380,-40), P(380,1240)]},
  {loop:false, n:3, pts:[P(-40,920), ...ringRoute('W','E'), P(1640,920)]},
  {loop:false, n:3, pts:[P(1640,880), ...ringRoute('E','W'), P(-40,880)]},
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

