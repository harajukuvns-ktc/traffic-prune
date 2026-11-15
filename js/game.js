/* =========================================================
   Traffic Prune · game.js: TRẠNG THÁI, NPC, NGƯỜI CHƠI, BẮT LỖI, CHỈ ĐƯỜNG, VẼ, GIAO DIỆN
   Nạp sau cùng. Các file luat.js, cau-thoai.js, ban-do.js, am-thanh.js phải được nạp trước.
   ========================================================= */
'use strict';

/* =========================================================
   4. TRẠNG THÁI GAME
   ========================================================= */
const SAVE_KEY = 'trafficPrune.v1';
const VIEWS = ['nav', 'bike', 'map'];
const S = {
  now: 0, paused: true, xungho: 'anh', view: 'nav', assist: true,
  money: 5000000, pts: 12, streak: 0, trips: 0, stats: {}, cult: 70,   // cult: điểm văn hóa 0–100 (bản 1.0), dùng chung cho cả hai xe
  faultUntil: -1, epId: 0, epAffected: 0, epJamSaid: false,
  trip: null, route: null, routeT: 0, bubble: null, floats: [], flash: 0, lawT: 0, ut: null, ta: null, warnT: 0, warnText: '',
  wrongT: 0, okT: 0, solidT: 0, sideEp: false, ringWrongT: 0, ringEp: false, wwEp: false, wwT: 0,
  jamTick: 0, sidewalkSaidT: -99, crashCool: -1, inBay: false, stopT: 0, stopSaidT: -99, suspended: false,
  sound: {on: true, fx: 0.7, voice: 0.9, npc: 0.8, bike: 'so'}, gear: 1,
  // xi-nhan: turn = -1 (trái), 0 (tắt), 1 (phải); không tự tắt. sigAcc: tổng góc đã quay; sigEp: đã xét lỗi lượt rẽ này
  turn: 0, sigInJ: false, blinkT: 0, sigOnT: -99, sigAcc: 0, sigStraightT: 0, sigEp: false, turnBegan: false, turnStartT: -99, sigRunT: 0, sigOffSaidT: -99, blinkOn: false,
  pedEp: false, pedCool: -99, tailT: 0, tailCool: -99, lastMoveT: -99,
  // tốc độ: spdSec = đoạn đường đang đi, spdSaid = đoạn này đã nhắc nhở rồi, spdT = thời gian đã chạy quá, spdMax = mức vượt lớn nhất, spdLimit = giới hạn hiện tại (km/h)
  // camCool = mốc thời gian chống bị camera chụp hai lần liền
  spdSec: '', spdSaid: false, spdT: 0, spdMax: 0, spdLimit: 40, spdChild: false, camCool: -99,
  // lastSteer = lần cuối người chơi bấm rẽ (trợ lái chờ 1 giây sau đó mới nắn xe lại)
  lastSteer: -99,
  // bản 0.11: helmet = đã đội mũ (chỉ trong buổi chơi, không lưu); noHelmT/helmSaidT = bộ đếm nhắc nhở của NPC; csgtT = lần cuối qua từng chốt
  // call = cuộc gọi của khách {state:'ring'|'talk', t, drove, fined, warned, dT}; callIn = số chuyến nữa thì có cuộc gọi; callAt = giờ sẽ đổ chuông
  helmet: false, noHelmT: 0, helmSaidT: -99, csgtT: {},
  call: null, callIn: 2, callAt: -1,
  // bản 0.12: veh = loại xe đang lái ('bike' xe máy, 'car' ô tô); belt = đã thắt dây an toàn (ô tô)
  // mỗi loại xe dùng một bằng lái riêng (A1 / B), mỗi bằng 12 điểm và có thống kê lỗi riêng; S.pts và S.stats là của xe đang lái
  veh: 'bike', belt: false, ptsBy: {bike: 12, car: 12}, statsBy: {bike: {}, car: {}}
};
const START = {x: DESTS[0].bay.cx, y: DESTS[0].bay.cy, a: 0};
const player = {x: START.x, y: START.y, a: START.a, v: 0, len: 18, w: 8, isPlayer: true, stun: 0, name: 'Bạn'};
const npcs = [], peds = [];
let uid = 0;

/* ---------------------------------------------------------
   Bộ sinh lộ trình NPC (bản 1.1, bước 4): tuyến tự sinh từ MAP thay cho ROUTES viết tay.
   Xe máy vào từ một đầu đường ở mép bản đồ, đi tới một đầu đường khác theo đường ngắn nhất; khoảng một nửa số tuyến
   là "đi thẳng một mạch" (ở mỗi nút chọn nhánh gần hướng thẳng nhất), còn lại chọn ngẫu nhiên điểm ra (người dùng chốt 19:36 ngày 15/11/2026).
   Xe buýt chạy vòng cố định khai báo bằng danh sách nút (BUS_LOOPS). Mỗi tuyến mang sẵn các mốc: vạch dừng ở ngã tư có đèn
   (stop: đèn và pha của nhánh), chỗ nhường ở cửa vòng xuyến (yieldAt). NPC_GEN.on = false thì quay về ROUTES cũ (xoá ở bước 7).
   --------------------------------------------------------- */
const NPC_GEN = {on: true, seed: 20261115, straightShare: 0.5};
const BUS_LOOPS = [['A','C','F','D'], ['C','A','D','F']];
function npcRand(){ NPC_GEN.seed = (NPC_GEN.seed * 16807) % 2147483647; return (NPC_GEN.seed - 1) / 2147483646; }
const npcRoadOk = (r, kind) => r.veh && !(kind === 'bus' ? r.noCar : r.noBike);
// đường ngắn nhất giữa hai nút trên MAP cho loại xe kind: trả về [{id, rin}] (rin: đường đi vào nút)
function npcNodePath(M, from, to, kind){
  const cost = {[from]: 0}, prv = {}, done = {};
  for (;;){
    let u = null; for (const id in cost) if (!done[id] && (u === null || cost[id] < cost[u])) u = id;
    if (u === null || u === to) break; done[u] = true;
    for (const arm of M.nodes[u].arms){ const r = arm.road; if (!npcRoadOk(r, kind) || (r.oneway && r.b === u)) continue;
      const v = r.a === u ? r.b : r.a, c = cost[u] + r.len;
      if (M.nodes[v].kind === 'end' && v !== to) continue;   // không đi xuyên qua mép bản đồ
      if (!(v in cost) || c < cost[v]){ cost[v] = c; prv[v] = {u, r}; } }
  }
  if (!(to in cost)) return null;
  const out = []; let id = to;
  while (id !== from){ out.unshift({id, rin: prv[id].r}); id = prv[id].u; }
  out.unshift({id: from, rin: null});
  return out;
}
// đi thẳng một mạch từ đầu đường `from`: ở mỗi nút chọn nhánh lệch ít nhất (dưới 30°; vòng xuyến: nhánh đối diện)
function npcStraightPath(M, from, kind){
  const out = [{id: from, rin: null}]; let cur = from, rin = null;
  for (let k = 0; k < 40; k++){
    const nd = M.nodes[cur];
    const opts = nd.arms.filter(a => a.road !== rin && npcRoadOk(a.road, kind) && !(a.road.oneway && a.road.b === cur));
    if (!opts.length) return null;
    let pick;
    if (!rin) pick = opts[0];
    else { const o = armOut(rin, cur), din = {x: -o.x, y: -o.y};
      const angOf = a => Math.abs(Math.atan2(din.x*a.out.y - din.y*a.out.x, din.x*a.out.x + din.y*a.out.y));
      pick = opts.reduce((p, q) => angOf(q) < angOf(p) ? q : p);
      if (nd.kind !== 'ring' && angOf(pick) > NAV_ANG.straight) return null; }
    const r = pick.road, nx = r.a === cur ? r.b : r.a;
    out.push({id: nx, rin: r}); cur = nx; rin = r;
    if (M.nodes[nx].kind === 'end') return out;
  }
  return null;
}
// trải chuỗi nút thành các điểm theo làn bên phải; loop: tuyến vòng (nút đầu = nút cuối nối lại)
function npcBuildPts(M, chain, loop){
  const pts = [];
  const n = chain.length;
  // đường ra khỏi nút thứ k
  const rOut = k => loop ? chain[(k + 1) % n].rin : (k + 1 < n ? chain[k + 1].rin : null);
  const rIn = k => loop ? chain[k].rin : chain[k].rin;
  for (let k = 0; k < n; k++){
    const nd = M.nodes[chain[k].id], ri = rIn(k), ro = rOut(k);
    if (nd.kind === 'end'){
      const r = ri || ro, o = armOut(r, nd.id);
      if (!ri){ const d = o; pts.push(lanePt(along(nd, d, -40), d, laneOff(r))); }          // vào từ ngoài mép bản đồ
      else { const prevId = chain[k - 1].id, d = {x: -o.x, y: -o.y};
        pts.push(...bendPts(ri, ri.a === prevId ? 0 : ri.len, ri.a === nd.id ? 0 : ri.len, npcMargin(M, prevId), 0));
        pts.push(lanePt(along(nd, d, 40), d, laneOff(r))); }   // ra ngoài mép
      continue;
    }
    // các điểm uốn của đường cong dẫn tới nút này
    if (ri){ const prevId = chain[(k - 1 + n) % n].id; pts.push(...bendPts(ri, ri.a === prevId ? 0 : ri.len, ri.a === nd.id ? 0 : ri.len, npcMargin(M, prevId), npcMargin(M, nd.id))); }
    const oi = armOut(ri, nd.id), din = {x: -oi.x, y: -oi.y}, dout = armOut(ro, nd.id), tr = mapTrim(nd);
    if (nd.kind === 'ring'){
      const R = nd.ring.rOut + 4, a0 = ringAng(nd, oi, true), a1 = ringAng(nd, dout, false);
      pts.push(Object.assign(lanePt(along(nd, din, -R), din, laneOff(ri)), {yieldAt: a0, ring: {x: nd.x, y: nd.y, rIn: nd.ring.rIn, rOut: nd.ring.rOut}}));
      pts.push(...ringArcAt(nd, a0, a1));
      pts.push(lanePt(along(nd, dout, R), dout, laneOff(ro)));
      continue;
    }
    if (nd.kind === 'light'){
      const arm = nd.arms.find(a => a.road === ri), gap = ri.a === nd.id ? ri.gapA.gap : ri.gapB.gap;
      const L = M.lights.find(q => q.node === nd.id);
      pts.push(Object.assign(lanePt(along(nd, din, -(gap + STOPG)), din, laneOff(ri)), {stop: {L, phase: M.armPhase(arm.out)}}));
    }
    const E = lanePt(along(nd, din, -tr), din, laneOff(ri)), X = lanePt(along(nd, dout, tr), dout, laneOff(ro));
    const cr = din.x*dout.y - din.y*dout.x;
    if (Math.abs(cr) < 0.1){ pts.push(E, X); continue; }       // đi thẳng
    // chỗ rẽ: đường cong Bézier bậc ba, ra khỏi E theo hướng vào và tới X theo hướng ra (kể cả chỗ rẽ gắt ở ngã năm vẫn không vòng ngược)
    const kk = dist(E, X) * 0.5, C1 = along(E, din, kk), C2 = along(X, dout, -kk);
    pts.push(E);
    for (let i = 1; i <= 8; i++){ const q = i / 8, u = 1 - q, a = u*u*u, b = 3*u*u*q, c = 3*u*q*q, d = q*q*q;
      pts.push({x: a*E.x + b*C1.x + c*C2.x + d*X.x, y: a*E.y + b*C1.y + c*C2.y + d*X.y}); }
  }
  return pts;
}
// đoạn đầu/cuối đường nằm trong nút (tới chỗ xe vào/ra nút): không lấy điểm uốn ở đó
function npcMargin(M, id){ const nd = M.nodes[id]; return nd.kind === 'ring' ? nd.ring.rOut + 4 : nd.kind === 'light' ? mapTrim(nd) + STOPG : mapTrim(nd); }
function npcEnds(M, kind){ return Object.keys(M.nodes).filter(id => M.nodes[id].kind === 'end' && M.nodes[id].arms.some(a => npcRoadOk(a.road, kind))); }
// một tuyến mới ngẫu nhiên cho xe máy NPC
function npcNewRoute(M, kind){
  M = M || MAP; kind = kind || 'bike';
  const ends = npcEnds(M, kind);
  for (let tries = 0; tries < 20; tries++){
    const from = ends[Math.floor(npcRand() * ends.length)];
    let chain = null, straight = npcRand() < NPC_GEN.straightShare;
    if (straight) chain = npcStraightPath(M, from, kind);
    if (!chain){ const to = ends[Math.floor(npcRand() * ends.length)]; if (to === from) continue; chain = npcNodePath(M, from, to, kind); straight = false; }
    if (!chain || chain.length < 2) continue;
    return {loop: false, gen: true, map: M, straight, nodes: chain.map(c => c.id), pts: npcBuildPts(M, chain, false)};
  }
  return null;
}
// tuyến vòng của xe buýt qua các nút ids (giữa hai nút liên tiếp đi đường ngắn nhất)
function npcLoopRoute(M, ids, kind){
  M = M || MAP; const chain = [];
  for (let i = 0; i < ids.length; i++){
    const seg = npcNodePath(M, ids[i], ids[(i + 1) % ids.length], kind || 'bus'); if (!seg) return null;
    chain.push(...seg.slice(1));
  }
  // chain[k].rin là đường vào nút; nút đầu của vòng nằm ở cuối chuỗi, đưa lên đầu cho dễ đọc
  chain.unshift(chain.pop());
  return {loop: true, gen: true, nodes: chain.map(c => c.id), pts: npcBuildPts(M, chain, true)};
}

function npcObj(route, isBus, p){
  const n = {
    id: ++uid, route, idx: p.idx, x: p.x, y: p.y, a: 0, v: 0,
    kind: isBus ? 'bus' : 'bike', len: isBus ? 46 : 18, w: isBus ? 16 : 8,
    vmax: isBus ? 72 : 90 + rnd()*35, acc: isBus ? 60 : 110,
    color: isBus ? '#f2c94c' : ['#4a90e2','#7b61ff','#2bb3a3','#e86a92','#6c7a89','#59a14f','#b07aa1'][Math.floor(rnd()*7)],
    helmet: ['#ffffff','#ff5a5f','#ffd166','#06d6a0','#118ab2','#222'][Math.floor(rnd()*6)],
    name: isBus ? 'Bác tài xe buýt' : NPC_NAMES[Math.floor(rnd()*NPC_NAMES.length)],
    blockedBy: null, waitT: 0, ghostT: 0, ghostP: 0, hitT: 0, yieldWait: 0, hidden: false, respawnT: 0,
    affEp: -1, hitCool: 0
  };
  const t = route.pts[n.idx]; n.a = Math.atan2(t.y - n.y, t.x - n.x);
  return n;
}
// Tạo NPC theo tuyến tự sinh: 2 xe buýt chạy vòng cố định, 27 xe máy tuyến ngẫu nhiên (tổng 29 xe như cũ)
function makeNPCsGen(){
  npcs.length = 0;
  const near = p => Math.hypot(p.x - START.x, p.y - START.y) < 70 || npcs.some(o => Math.hypot(o.x - p.x, o.y - p.y) < 36);
  for (const ids of BUS_LOOPS){
    const route = npcLoopRoute(MAP, ids, 'bus'); let p = pointAt(route, 0);
    for (let j = 0; j < 20 && near(p); j++) p = pointAt(route, 40 * (j + 1));
    npcs.push(npcObj(route, true, p));
  }
  while (npcs.length < 29){
    const route = npcNewRoute(MAP, 'bike'); if (!route) break;
    const {L} = pathLen(route.pts, false);
    let p = null;
    for (let j = 0; j < 20; j++){ const q = pointAt(route, L * (0.08 + 0.8 * npcRand())); if (!near(q)){ p = q; break; } }
    if (p) npcs.push(npcObj(route, false, p));
  }
  makePeds();
}
function makeNPCs(){
  if (NPC_GEN.on) return makeNPCsGen();

  npcs.length = 0;
  ROUTES.forEach(route => {
    const {L} = pathLen(route.pts, route.loop);
    const count = route.n + (route.bus || 0);
    for (let k = 0; k < count; k++){
      const isBus = k < (route.bus || 0);
      let s = route.loop ? (L * k / count) : (L * (k + 0.35) / (count + 0.6));
      let p = pointAt(route, s);
      if (Math.hypot(p.x - START.x, p.y - START.y) < 70){ s += 120; p = pointAt(route, s); }   // đừng xếp xe NPC chồng lên ô đỗ lúc người chơi xuất phát
      const n = {
        id: ++uid, route, idx: p.idx, x: p.x, y: p.y, a: 0, v: 0,
        kind: isBus ? 'bus' : 'bike', len: isBus ? 46 : 18, w: isBus ? 16 : 8,
        vmax: isBus ? 72 : 90 + rnd()*35, acc: isBus ? 60 : 110,
        color: isBus ? '#f2c94c' : ['#4a90e2','#7b61ff','#2bb3a3','#e86a92','#6c7a89','#59a14f','#b07aa1'][Math.floor(rnd()*7)],
        helmet: ['#ffffff','#ff5a5f','#ffd166','#06d6a0','#118ab2','#222'][Math.floor(rnd()*6)],
        name: isBus ? 'Bác tài xe buýt' : NPC_NAMES[Math.floor(rnd()*NPC_NAMES.length)],
        blockedBy: null, waitT: 0, ghostT: 0, ghostP: 0, hitT: 0, yieldWait: 0, hidden: false, respawnT: 0,
        affEp: -1, hitCool: 0
      };
      const t = route.pts[n.idx]; n.a = Math.atan2(t.y - n.y, t.x - n.x);
      npcs.push(n);
    }
  });
  makePeds();
}
function makePeds(){
  // Người đi bộ trên vỉa hè (đi vòng quanh khối phố, phía trong các ô đỗ xe)
  peds.length = 0;
  const pb = [BLOCKS[1], BLOCKS[3], BLOCKS[4], BLOCKS[0], BLOCKS[7]];
  // Phố Chợ là phố đi bộ: có vài người dạo chợ giữa phố
  { const route = {loop:true, pts:[P(789,385), P(789,815), P(811,815), P(811,385)]};
    for (let k = 0; k < 4; k++){
      const {L} = pathLen(route.pts, true); const p = pointAt(route, L * k / 4);
      peds.push({route, idx:p.idx, x:p.x, y:p.y, v:16 + rnd()*8, stopT:0, name: PED_NAMES[Math.floor(rnd()*PED_NAMES.length)],
        color:['#e76f51','#2a9d8f','#e9c46a','#8e7dbe','#f4a261'][Math.floor(rnd()*5)]});
    } }
  // Người đi bộ qua đường ở vạch trước hai đầu Phố Chợ (bản 1.0b): đứng chờ rồi băng qua Đường Hoa Sữa / Đường Me Chua; xe phải nhường
  //   vị trí lấy từ CROSSWALKS (khai báo theo đường và quãng s); người đi từ lề này (x0, y0) sang lề kia (x1, y1), vuông góc với đường
  for (const w of CROSSWALKS){ if (w.off) continue;
    const e = w.half + 12;
    peds.push({cross: true, cw: w, hx: w.x, hy: w.y, x: w.x - w.n.x*e, y: w.y - w.n.y*e, x0: w.x - w.n.x*e, y0: w.y - w.n.y*e, x1: w.x + w.n.x*e, y1: w.y + w.n.y*e,
      dir: 1, wait: 2 + rnd() * 6, cyc: 0, v: 22, stopT: 0,
      name: PED_NAMES[Math.floor(rnd()*PED_NAMES.length)], color: ['#e76f51','#2a9d8f','#e9c46a','#8e7dbe','#f4a261'][Math.floor(rnd()*5)]});
  }
  pb.forEach((b, i) => {
    if (!b) return;
    const m = 20;
    const pts = [P(b.x1+m,b.y1+m), P(b.x2-m,b.y1+m), P(b.x2-m,b.y2-m), P(b.x1+m,b.y2-m)];
    const route = {loop:true, pts};
    for (let k = 0; k < 2; k++){
      const {L} = pathLen(pts, true); const p = pointAt(route, L * ((k*0.5 + i*0.13) % 1));
      peds.push({route, idx:p.idx, x:p.x, y:p.y, v:22 + rnd()*10, stopT:0, name: PED_NAMES[Math.floor(rnd()*PED_NAMES.length)],
        color:['#e76f51','#2a9d8f','#e9c46a','#8e7dbe','#f4a261'][Math.floor(rnd()*5)]});
    }
  });
}

function load(){
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (d){ S.xungho = d.xungho || 'anh'; S.money = d.money ?? 5000000; S.pts = d.pts ?? 12;
      S.streak = d.streak || 0; S.trips = d.trips || 0; S.stats = d.stats || {}; S.cult = clamp(d.cult ?? 70, 0, 100);
      S.view = VIEWS.includes(d.view) ? d.view : 'nav'; S.assist = d.assist !== false;
      if (d.sound) S.sound = {on: d.sound.on !== false, fx: clamp(+d.sound.fx || 0, 0, 1), voice: clamp(+d.sound.voice || 0, 0, 1), npc: d.sound.npc == null ? 0.8 : clamp(+d.sound.npc || 0, 0, 1), bike: d.sound.bike === 'ga' ? 'ga' : 'so'};
      if (d.ptsBy) S.ptsBy = {bike: d.ptsBy.bike ?? 12, car: d.ptsBy.car ?? 12}; else S.ptsBy = {bike: S.pts, car: 12};
      if (d.statsBy) S.statsBy = {bike: d.statsBy.bike || {}, car: d.statsBy.car || {}}; else S.statsBy = {bike: S.stats, car: {}};
      S.veh = d.veh === 'car' ? 'car' : 'bike';
      S.pts = S.ptsBy[S.veh]; S.stats = S.statsBy[S.veh];
      S.suspended = S.pts <= 0; }
  } catch(e){}
}
function save(){
  S.ptsBy[S.veh] = S.pts; S.statsBy[S.veh] = S.stats;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({xungho:S.xungho, money:S.money, pts:S.pts, streak:S.streak, trips:S.trips, cult:S.cult,
    stats:S.statsBy.bike, view:S.view, assist:S.assist, sound:S.sound, veh:S.veh, ptsBy:S.ptsBy, statsBy:S.statsBy})); } catch(e){}
}
function resetAll(){
  try { localStorage.removeItem(SAVE_KEY); } catch(e){}
  S.money = 5000000; S.pts = 12; S.cult = 70; S.streak = 0; S.trips = 0; S.stats = {}; S.suspended = false; S.turn = 0; S.ut = null; S.ta = null; S.spdSec = ''; S.spdSaid = false; S.spdT = 0; S.camCool = -99; S.lastSteer = -99;
  S.belt = false; S.ptsBy = {bike: 12, car: 12}; S.statsBy = {bike: {}, car: {}}; S.statsBy[S.veh] = S.stats;
  S.helmet = false; S.noHelmT = 0; S.helmSaidT = -99; S.csgtT = {}; S.call = null; S.callIn = 2; S.callAt = -1;
  player.x = START.x; player.y = START.y; player.a = START.a; player.v = 0;
  newTrip();
}

/* =========================================================
   5. TIỆN ÍCH
   ========================================================= */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const normA = a => { while (a > Math.PI) a -= 2*Math.PI; while (a <= -Math.PI) a += 2*Math.PI; return a; };
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function unit(a, b){ const d = Math.hypot(b.x - a.x, b.y - a.y) || 1; return {x: (b.x - a.x)/d, y: (b.y - a.y)/d}; }
function fmt(n){ const s = Math.round(Math.abs(n)).toLocaleString('vi-VN') + 'đ'; return n < 0 ? '−' + s : s; }
function fill(t, n){
  const x = S.xungho, X = x.charAt(0).toUpperCase() + x.slice(1);
  return t.replace(/\{x\}/g, x).replace(/\{X\}/g, X).replace(/\{n\}/g, n == null ? '' : n);
}
function stopLimit(gap){ return gap <= 0 ? 0 : Math.sqrt(2 * 260 * gap); }
function vehicles(){ return npcs.filter(n => !n.hidden).concat([player]); }
function nearestNPC(x, y, maxD){
  let best = null, bd = maxD;
  for (const n of npcs){ if (n.hidden) continue; const d = Math.hypot(n.x - x, n.y - y); if (d < bd){ bd = d; best = n; } }
  return best;
}
function chainRoot(n){
  let c = n, k = 0;
  while (c && c.blockedBy && k < 10){ c = c.blockedBy; k++; if (c === player) return player; }
  return c;
}
function ringBusy(theta, self, minV, rg){
  rg = rg || MAP.rings[0] || RB;   // vòng xuyến nào (mặc định vòng xuyến đầu tiên của MAP); tuyến tự sinh và luật vòng xuyến truyền vào
  for (const o of vehicles()){
    if (o === self) continue;
    if (o === player && S.inBay) continue;
    if (minV && Math.abs(o.v) < minV) continue;
    const r = Math.hypot(o.x - rg.x, o.y - rg.y);
    if (r < rg.rIn - 6 || r > rg.rOut + 2) continue;
    const d = normA(Math.atan2(o.y - rg.y, o.x - rg.x) - theta);
    if (d > -0.15 && d < 1.15) return o;
  }
  return null;
}
function segDist(px, py, o){
  const half = Math.max(0, o.len/2 - o.w/2), c = Math.cos(o.a), s = Math.sin(o.a);
  const ax = o.x - c*half, ay = o.y - s*half, bx = o.x + c*half, by = o.y + s*half;
  const dx = bx - ax, dy = by - ay, L2 = dx*dx + dy*dy || 1;
  const t = clamp(((px-ax)*dx + (py-ay)*dy) / L2, 0, 1);
  return Math.hypot(px - (ax + dx*t), py - (ay + dy*t));
}
// Đèn tín hiệu phía trước một xe đang đi theo hướng (ux, uy)
function approach(o, ux, uy, L){
  if (ux > 0.7 && Math.abs(o.y - L.y) < HALF && o.x < L.x - HALF) return {dist: L.x - HALF - o.x, axis:'EW'};
  if (ux < -0.7 && Math.abs(o.y - L.y) < HALF && o.x > L.x + HALF) return {dist: o.x - (L.x + HALF), axis:'EW'};
  if (uy > 0.7 && Math.abs(o.x - L.x) < HALF && o.y < L.y - HALF) return {dist: L.y - HALF - o.y, axis:'NS'};
  if (uy < -0.7 && Math.abs(o.x - L.x) < HALF && o.y > L.y + HALF) return {dist: o.y - (L.y + HALF), axis:'NS'};
  return null;
}
// Đèn phía trước người chơi (bản 1.1 bước 5): xét vạch dừng của từng nhánh (MAP.stopLines), đường góc bất kỳ
function playerLightAhead(maxD){
  const ux = Math.cos(player.a), uy = Math.sin(player.a); let best = null;
  for (const sl of MAP.stopLines){
    if (ux*sl.d.x + uy*sl.d.y <= 0.7) continue;
    const rx = player.x - sl.sx, ry = player.y - sl.sy;
    if (Math.abs(rx*sl.d.y - ry*sl.d.x) >= sl.half) continue;
    const d = -(rx*sl.d.x + ry*sl.d.y);   // còn bao xa tới vạch dừng
    if (d < -2 || d > maxD) continue;   // đã qua vạch dừng thì thôi
    if (!best || d < best.dist) best = {dist: d, state: lightOf(sl.L, sl.phase, S.now)};
  }
  return best;
}
// Vị trí của điểm (x, y) trên đường r: quãng s, lệch ngang lat (dương là bên phải theo chiều a→b), hướng dir.
// Dùng khi classify trả về một đường mà không kèm lat (góc vỉa hè bo cong ở đầu phố đi bộ).
function roadPos(r, x, y){
  let best = null;
  for (const g of r.seg){
    const t = clamp((x - g.p.x)*g.d.x + (y - g.p.y)*g.d.y, 0, g.l);
    const lat = -(x - g.p.x)*g.d.y + (y - g.p.y)*g.d.x, px = g.p.x + g.d.x*t, py = g.p.y + g.d.y*t, dd = Math.hypot(x - px, y - py);
    if (!best || dd < best.dd) best = {s: g.s0 + t, lat, dir: g.d, dd};
  }
  return best;
}

/* =========================================================
   6. SỰ KIỆN: NÓI, PHẠT, ĐỀN
   ========================================================= */
const $ = id => document.getElementById(id);
const lawEl = $('law'), bubEl = $('bubble'), warnEl = $('warn'), flashEl = $('flash');
function voiceOf(name){ return GIONG.find(g => g.khop.test(name)) || GIONG[GIONG.length - 1]; }
function say(speaker, text, name){
  const nm = name || (speaker && speaker.name) || 'Loa phường', g = voiceOf(nm);
  // chữ hiện dần theo tốc độ nói của nhân vật; nói xong thì giữ thêm 3,5 giây cho kịp đọc
  S.bubble = {speaker, text, name: nm, voice: g, shown: 0, t: Math.max(6.5, text.length / g.nhanh + 3.5)};
  $('bubName').textContent = '💬 ' + nm;
  $('bubText').textContent = '';
  bubEl.style.display = 'block';
}
// Xi-nhan: dir = -1 (trái) hoặc 1 (phải); bấm lại đúng bên đang bật thì tắt. Không tự tắt.
function setSignal(dir){
  S.turn = (S.turn === dir) ? 0 : dir;
  S.sigOnT = S.now; S.sigRunT = 0; S.blinkT = 0; S.blinkOn = S.turn !== 0;
  if (S.turn) SND.tick(true);
}
// Khung làn tại chỗ xe (bản 1.1 bước 6): hướng làn xe đang đi theo con đường (đi xuôi a→b hay ngược lại),
// lệch ngang so với tim đường tính theo chiều đó (dương là bên phải), độ thẳng hàng giữa xe và đường (dot, 0–1).
function laneFrame(c, a){
  if (!c || !c.road || !c.dir) return null;
  const dot = Math.cos(a)*c.dir.x + Math.sin(a)*c.dir.y, f = dot >= 0 ? 1 : -1;
  return {d: {x: c.dir.x*f, y: c.dir.y*f}, lat: c.lat*f, dot: Math.abs(dot), fwd: f > 0, road: c.road};
}
// Tâm làn bên phải mà trợ lái giữ xe (khoảng cách tới tim đường): đường một làn mỗi chiều là nửa của nửa bề rộng (khu cũ: 20).
// Phố một chiều cũng giữ nửa bên phải (người dùng chốt 20:22 ngày 15/11/2026), khác laneOff của chỉ đường / NPC (đi giữa phố).
const assistOff = r => r.half * (1 - 1 / (2 * Math.max(1, r.lanes || 1)));
// Quay đầu tự động (phím U / nút ↩): xe tự bật xi-nhan trái, giảm tốc đến mức bò rồi bẻ lái trái một nửa vòng cho tới khi quay ngược hướng.
// Người chơi vẫn chịu luật: đè vạch liền, đi ngược chiều, va chạm… vẫn bị phạt như thường. Bấm phanh, bấm lái hoặc bấm U lần nữa thì hủy.
// Từ bản 1.1 bước 6: quay ngược đúng theo hướng con đường đang đi (kể cả đường chéo, đường cong); ngoài đường thì làm tròn như cũ.
function uTurn(){
  if (S.ut){ endUTurn(); return; }
  const c = classify(player.x, player.y);
  if (S.suspended || S.paused || player.stun > 0 || c.t === 'bay') return;
  const f = laneFrame(c, player.a), q = Math.PI / 2;
  const target = f ? Math.atan2(-f.d.y, -f.d.x) : normA(Math.round(player.a / q) * q + Math.PI);
  S.ut = {target, end: S.now + 7, sig: S.turn !== -1};
  if (S.turn !== -1) setSignal(-1);
}
function endUTurn(){
  const u = S.ut; S.ut = null;
  if (u && u.sig && S.turn === -1) setSignal(-1);   // tắt xi-nhan do mình bật
}
// Trợ lái vào cua (bản 0.12.2): đã bật xi-nhan và sắp vào ngã tư (có trợ lái giữ làn) thì xe tự ôm cua theo
// một đường cong vào đúng làn bên phải của đường mới; người chơi lo ga, phanh, đèn. Bấm nút rẽ là tự lái lại.
// Từ bản 1.1 bước 6: chạy ở mọi nút giao của MAP (không phải vòng xuyến), nhánh vào và nhánh ra theo góc bất kỳ.
const TURN_CAP = {bike: 45, car: 36};   // tốc độ tối đa khi đang ôm cua: xe máy 15 km/h, ô tô 12 km/h
const TURN_ANG = {min: 30 * Math.PI / 180, max: 150 * Math.PI / 180};   // nhánh lệch 30°–150° về phía xi-nhan mới ôm cua
// J: tâm nút; din: hướng xe đi vào; dout: hướng nhánh ra; dir: 1 phải, -1 trái; opt: {offIn, offOut (tâm làn), gapOut, node}
function turnPath(J, din, dir, veh, dout, opt){
  opt = opt || {};
  const rn = d => ({x: -d.y, y: d.x});   // pháp tuyến bên phải theo chiều đi (trục y hướng xuống)
  if (!dout) dout = dir > 0 ? rn(din) : {x: din.y, y: -din.x};
  const a = rn(din), b = rn(dout), oi = opt.offIn == null ? 20 : opt.offIn, oo = opt.offOut == null ? 20 : opt.offOut;
  // góc C: giao điểm của tim làn vào và tim làn ra (ngã tư vuông khu cũ: J + 20 bên phải mỗi nhánh, như trước)
  const cr = (u, v) => u.x*v.y - u.y*v.x;
  const wx = b.x*oo - a.x*oi, wy = b.y*oo - a.y*oi, t = cr({x: wx, y: wy}, dout) / cr(din, dout);
  const C = {x: J.x + a.x*oi + din.x*t, y: J.y + a.y*oi + din.y*t};
  // bán kính cua (đo ở ngã tư vuông); góc rẽ khác 90° thì đoạn tiếp tuyến = bán kính × tan(nửa góc rẽ)
  const R0 = dir > 0 ? (veh === 'car' ? 36 : 20) : 40;
  const th = Math.abs(Math.atan2(cr(din, dout), din.x*dout.x + din.y*dout.y));
  const R = Math.min(90, R0 * Math.tan(th / 2));
  const E = {x: C.x - din.x*R, y: C.y - din.y*R}, X = {x: C.x + dout.x*R, y: C.y + dout.y*R};
  const pts = [{x: E.x - din.x*90, y: E.y - din.y*90}];
  for (let i = 0; i <= 12; i++){ const t = i / 12, u = 1 - t;
    pts.push({x: u*u*E.x + 2*u*t*C.x + t*t*X.x, y: u*u*E.y + 2*u*t*C.y + t*t*X.y}); }
  pts.push({x: X.x + dout.x*90, y: X.y + dout.y*90});
  return {pts, dout, J, node: opt.node, gapOut: opt.gapOut == null ? HALF : opt.gapOut, end: S.now + 9};
}
// Chọn nhánh ra cho trợ lái ôm cua tại nút nd khi xe vào từ nhánh `inArm`: các nhánh cho xe, đi được theo loại xe và chiều phố một chiều,
// lệch 30°–150° về phía xi-nhan. Chỉ đường đang dẫn rẽ về phía đó thì chọn nhánh mang tên đường của chỉ dẫn; không thì nhánh gần rẽ vuông nhất.
function turnArmChoice(nd, inArm, dir, instr){
  const din = {x: -inArm.out.x, y: -inArm.out.y}, cand = [];
  for (const arm of nd.arms){
    const r = arm.road;
    if (arm === inArm || !r.veh) continue;
    if (r.oneway && arm.end !== 'a') continue;                    // phố một chiều chỉ đi được từ a sang b
    if (S.veh === 'car' ? r.noCar : r.noBike) continue;
    const ang = Math.atan2(din.x*arm.out.y - din.y*arm.out.x, din.x*arm.out.x + din.y*arm.out.y);   // dương là rẽ phải
    if (Math.sign(ang) !== dir || Math.abs(ang) < TURN_ANG.min || Math.abs(ang) > TURN_ANG.max) continue;
    cand.push({arm, ang});
  }
  if (!cand.length) return null;
  const sideOk = instr && (dir > 0 ? /right$/ : /left$/).test(instr.type || '');
  const byName = sideOk ? cand.find(q => q.arm.road.name === instr.street) : null;
  // gần rẽ vuông nhất; hai nhánh lệch đều nhau (ví dụ 45° và 135°) thì chọn nhánh rẽ nhẹ hơn
  const lech = q => Math.abs(Math.abs(q.ang) - Math.PI/2);
  return byName || cand.reduce((p, q) => lech(q) < lech(p) - 0.02 || (Math.abs(lech(q) - lech(p)) <= 0.02 && Math.abs(q.ang) < Math.abs(p.ang)) ? q : p);
}
function turnAssistStart(){
  if (S.ta || S.ut || !S.assist || !S.turn || phoneDriving() || player.v < 0) return;
  const r = S.route && S.route.instr;
  if (r && r.type === 'uturn' && r.dist < 120) return;   // định quay đầu thì không ôm cua
  const c = classify(player.x, player.y), f = laneFrame(c, player.a);
  if (!f || !f.road.veh || f.dot < 0.93) return;          // phải đang trên đường, đi gần thẳng theo đường
  const end = f.fwd ? 'b' : 'a', nd = MAP.nodes[f.fwd ? f.road.b : f.road.a];
  if (!nd.junction) return;                                 // vòng xuyến, mép bản đồ, đầu phố đi bộ: không ôm cua
  const inArm = nd.arms.find(q => q.road === f.road && q.end === end);
  const left = f.fwd ? f.road.len - c.s : c.s, gapIn = (end === 'a' ? f.road.gapA : f.road.gapB).gap;
  if (!(left > gapIn - 4 && left < gapIn + STOPG + 50)) return;
  const ch = turnArmChoice(nd, inArm, S.turn, r && r.dist < left + 80 ? r : null);
  if (!ch) return;
  const ro = ch.arm.road;
  S.ta = turnPath({x: nd.x, y: nd.y}, {x: -inArm.out.x, y: -inArm.out.y}, S.turn, S.veh, ch.arm.out,
    {offIn: assistOff(f.road), offOut: assistOff(ro), gapOut: (ch.arm.end === 'a' ? ro.gapA : ro.gapB).gap, node: nd.id});
}
function turnAssistSteer(dt, rate){
  const T = S.ta, P = T.pts;
  let bi = 0, bd = 1e9;
  for (let i = 0; i < P.length - 1; i++){
    const a = P[i], b = P[i+1], dx = b.x - a.x, dy = b.y - a.y, L = dx*dx + dy*dy;
    const t = clamp(((player.x - a.x)*dx + (player.y - a.y)*dy) / L, 0, 1);
    const d = Math.hypot(a.x + dx*t - player.x, a.y + dy*t - player.y);
    if (d < bd){ bd = d; bi = i; }
  }
  const hdOut = Math.cos(player.a)*T.dout.x + Math.sin(player.a)*T.dout.y;
  const past = (player.x - T.J.x)*T.dout.x + (player.y - T.J.y)*T.dout.y;
  if (bd > 45 || S.now > T.end || (hdOut > 0.998 && past > T.gapOut + 30) || past > T.gapOut + 80){ S.ta = null; return; }
  // nhìn trước khoảng 18 đơn vị dọc theo đường cong
  let k = bi + 1, need = 18, q = P[k];
  while (k < P.length - 1){ const sg = Math.hypot(P[k+1].x - P[k].x, P[k+1].y - P[k].y); if (sg >= need) { q = {x: P[k].x + (P[k+1].x - P[k].x)*need/sg, y: P[k].y + (P[k+1].y - P[k].y)*need/sg}; break; } need -= sg; k++; q = P[k]; }
  const want = Math.atan2(q.y - player.y, q.x - player.x), diff = normA(want - player.a);
  player.a = normA(player.a + clamp(diff, -rate*dt, rate*dt));
}
function floatText(x, y, text, color){ S.floats.push({x, y, text, color, t: 1.8}); }
function showLaw(html, good){
  lawEl.innerHTML = '<div class="lawin">' + html + '</div><div class="lawx">chạm để ẩn</div>'; lawEl.className = good ? 'good' : ''; lawEl.style.display = 'block'; S.lawT = isTouch ? 5 : 9;
}
function warn(text){ S.warnText = text; S.warnT = 0.6; }
// Lỗi chỉ nhắc nhở (LAW[type].remind): không phạt tiền, không trừ điểm, chuyến không còn sạch
// Luật và lời thoại theo loại xe đang lái (ô tô: LAW_CAR, lời thoại có đuôi 'car' nếu có)
function lawOf(type){ return (S.veh === 'car' ? LAW_CAR : LAW)[type]; }
// Điểm văn hóa (bản 1.0): 0–100, bắt đầu 70, KHÔNG tự hồi, chỉ tăng bằng hành vi tốt; không phạt tiền (văn hóa không phải luật).
// Hành vi xấu đánh dấu chuyến đang chạy là "có làm phiền người khác" (S.trip.hurt) nên không được cộng điểm "chuyến không làm ai phải chờ".
const CULT = {jam: -3, sidewalk: -5, tailgate: -2, stopblock: -3, sigoff: -1, yield: 3, phone: 3, trip: 1, nogive: -5};
function cultAdd(delta, why){
  if (!delta) return;
  const before = S.cult;
  S.cult = clamp(S.cult + delta, 0, 100);
  if (delta < 0 && S.trip) S.trip.hurt = true;
  if (S.cult !== before) floatText(player.x, player.y - 14, '🎭 ' + (delta > 0 ? '+' : '−') + Math.abs(delta) + ' văn hóa' + (why ? ': ' + why : ''), delta > 0 ? '#2f9e6b' : '#b5651d');
  save();
}
// Khách chấm sao theo điểm văn hóa: từ 80 trở lên 5 sao và boa thêm 10–20% cước; 40–79 bình thường 4 sao; dưới 40 chỉ 1–2 sao
function cultRating(base){
  const c = S.cult;
  if (c >= 80) return {stars: 5, tip: Math.round(base * (0.1 + 0.1 * (c - 80) / 20) / 500) * 500};
  if (c >= 40) return {stars: 4, tip: 0};
  return {stars: c >= 20 ? 2 : 1, tip: 0};
}
function linesOf(key){ return (S.veh === 'car' && LINES[key + 'car']) || LINES[key]; }
function remind(type, speaker){
  const law = lawOf(type);
  S.stats[type] = (S.stats[type] || 0) + 1;
  const n = S.stats[type];
  if (S.trip) S.trip.clean = false;
  S.streak = 0;
  const who = speaker || nearestNPC(player.x, player.y, 280) || {name:'Loa phường', follow:true};
  let line = fill(pick(linesOf(type)), n);
  if (n >= 2) line = fill(pick(LINES.again), n) + line;
  say(who, line);
  showLaw(`<b>📘 ${law.name}</b>: ${law.range.toLowerCase()}<br><small>${law.ref}</small><br>💡 ${law.tip}<br>`+
    `<small>Chuyến này không còn được tính là chuyến sạch.</small>`);
  save();
}
// Lỗi do camera ngã tư chụp (phạt nguội): có tiếng máy ảnh và loé sáng
const CAM_TYPES = {red: 1, speed1: 1, speed2: 1, speed3: 1, speed4: 1};
// cam: true/false ép có hay không có tiếng máy ảnh và loé sáng (bỏ trống thì theo CAM_TYPES)
function violate(type, quipKey, speaker, cam){
  const isCam = cam === undefined ? !!CAM_TYPES[type] : cam;
  const law = lawOf(type);
  S.stats[type] = (S.stats[type] || 0) + 1;
  const n = S.stats[type];
  const hadPts = S.pts > 0;
  S.money -= law.fine; S.pts = Math.max(0, S.pts - law.pts);
  if (hadPts && S.pts === 0) suspendLicense();
  SND.whistle(); if (isCam) SND.shutter();
  if (S.trip) S.trip.clean = false;
  S.streak = 0; S.epId++; S.epAffected = 0; S.epJamSaid = false;
  S.faultUntil = Math.max(S.faultUntil, S.now + 3);
  const who = speaker || nearestNPC(player.x, player.y, 280) || {name:'Loa phường', follow:true};
  let line = fill(pick(linesOf(quipKey || type)), n);
  if (n >= 2) line = fill(pick(LINES.again), n) + line;
  say(who, line);
  const trips = Math.max(1, Math.round(law.fine / 90000));
  showLaw(`<b>📘 ${law.name}</b>: phạt ${law.range}${law.pts ? `, trừ ${law.pts} điểm GPLX` : ''}<br>`+
    `<small>${law.ref}</small><br>💡 ${law.tip}<br>`+
    `<small>Trong game bị trừ ${fmt(law.fine)}, bằng khoảng ${trips} chuyến giao hàng.${S.pts === 0 ? ' Điểm bằng lái ${VEH[S.veh].lic} đã về 0: không được lái ${VEH[S.veh].name} nữa cho tới khi kiểm tra đạt và được phục hồi điểm.' : ''}</small>`);
  floatText(player.x, player.y, '−' + fmt(law.fine).replace('−',''), '#e5484d');
  if (isCam) S.flash = 0.7;
  save();
}
function compensate(n, amount, note){
  S.money -= amount;
  floatText(n.x, n.y, '+' + fmt(amount), '#2f9e6b');
  floatText(player.x, player.y, '−' + fmt(amount) + (note ? ' ' + note : ''), '#e5484d');
  save();
}

/* =========================================================
   6b. MŨ BẢO HIỂM, ĐIỆN THOẠI, CHỐT CSGT (bản 0.11)
   ========================================================= */
const CSGT_SPK = {name: 'Chú CSGT', follow: true};
const CALL_RING = 12, CALL_TALK = 8;   // từ bản 1.0 nghe máy trong ô P được cộng điểm văn hóa thay cho tiền boa
// Đồ bảo hộ: xe máy là mũ bảo hiểm, ô tô là dây an toàn
function safetyOn(){ return S.veh === 'car' ? S.belt : S.helmet; }
function putOnHelmet(){
  if (safetyOn() || S.paused || S.suspended) return;
  if (S.veh === 'car'){ S.belt = true; floatText(player.x, player.y, '💺 Đã thắt dây an toàn', '#2f9e6b'); }
  else { S.helmet = true; floatText(player.x, player.y, '🪖 Đã đội mũ, cài quai xong', '#2f9e6b'); }
  S.noHelmT = 0; SND.tick(true);
}
// Đang cầm điện thoại khi lái? Chỉ khi đang nghe máy và KHÔNG đỗ trong ô P. Đứng giữa đường hay dừng đèn đỏ vẫn tính là đang lái.
function phoneDriving(){
  return !!(S.call && S.call.state === 'talk' && !(S.inBay && Math.abs(player.v) < 12));
}
function answerCall(){
  const c = S.call;
  if (!c || c.state !== 'ring' || S.paused || S.suspended) return;
  c.state = 'talk'; c.t = CALL_TALK; c.drove = false; c.fined = false; c.warned = false; c.dT = 0;
  SND.tick(true);
}
function endCall(){
  const c = S.call; S.call = null;
  if (!c) return;
  if (!c.drove){   // nghe máy khi đang đỗ trong ô P: khách vui, boa thêm
    S.stats.callOk = (S.stats.callOk || 0) + 1;
    cultAdd(CULT.phone, 'tấp vào ô đỗ rồi mới nghe máy');
    SND.reward(1);
    say({name: 'Khách đặt hàng', follow: true}, fill(pick(LINES.phoneok)));
    save();
  } else if (!c.fined){
    S.stats.callDrive = (S.stats.callDrive || 0) + 1;
    floatText(player.x, player.y, 'May mà chưa gặp chốt hay camera', '#6b6875');
  }
}
function updCall(dt){
  let c = S.call;
  if (!c){
    if (S.callAt > 0 && S.now >= S.callAt && !S.suspended){
      S.callAt = -1; S.call = c = {state: 'ring', t: CALL_RING, ringT: 0, drove: false, fined: false, warned: false, dT: 0};
      SND.ring();
    }
    return;
  }
  c.t -= dt;
  if (c.state === 'ring'){
    c.ringT += dt;
    if (c.ringT > 1.6){ c.ringT = 0; SND.ring(); }
    if (c.t <= 0){ S.call = null; S.stats.callMiss = (S.stats.callMiss || 0) + 1; floatText(player.x, player.y, 'Nhỡ cuộc gọi, khách sẽ gọi lại sau', '#6b6875'); }
    return;
  }
  if (phoneDriving()){
    c.drove = true; c.dT += dt;
    if (c.dT >= 3 && !c.warned && !c.fined){   // người đi đường thấy bạn cầm điện thoại: nhắc một lần mỗi cuộc gọi
      c.warned = true;
      say(nearestNPC(player.x, player.y, 280) || {name: 'Loa phường', follow: true}, fill(pick(LINES.phonewarn)));
    }
  }
  if (c.t <= 0) endCall();
}
// Qua vạch kiểm tra của chốt CSGT (cả hai chiều): đầu trần hoặc đang cầm điện thoại thì bị thổi còi, dừng xe 2 giây và phạt
function csgtCheck(prev){
  if (S.suspended || Math.abs(player.v) < 5 || classify(player.x, player.y).t === 'bay') return;
  for (const p of CSGT){
    if (p.off) continue;
    // vạch kiểm tra vuông góc với đường tại chốt; a, b: trước và sau khung hình, tính dọc theo đường
    const a = (prev.x - p.x)*p.d.x + (prev.y - p.y)*p.d.y, b = (player.x - p.x)*p.d.x + (player.y - p.y)*p.d.y;
    const lat = Math.abs((player.x - p.x)*p.n.x + (player.y - p.y)*p.n.y);
    if (lat >= p.half || !((a < 0 && b >= 0) || (a > 0 && b <= 0))) continue;
    if (S.now - (S.csgtT[p.id] ?? -99) < 8) continue;
    S.csgtT[p.id] = S.now;
    const noHelmet = !safetyOn(), onPhone = phoneDriving() && !S.call.fined;
    if (!noHelmet && !onPhone){ floatText(player.x, player.y, S.veh === 'car' ? '👮 Chốt CSGT: đã thắt dây, mời đi' : '👮 Chốt CSGT: đủ mũ, mời đi', '#2f9e6b'); continue; }
    player.v = 0; player.stun = 2;
    if (noHelmet){ const t = S.veh === 'car' ? 'belt' : 'helmet'; violate(t, t, CSGT_SPK, false); S.faultUntil = S.now; }
    if (onPhone){ S.call.fined = true; violate('phone', 'phone', CSGT_SPK, false); S.faultUntil = S.now; }
  }
}

/* =========================================================
   7. ĐƠN HÀNG
   ========================================================= */
let quiz = null;
function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function suspendLicense(){
  S.suspended = true; player.v = 0; keys.up = keys.down = keys.brake = false;
  showSuspend();
}
function showSuspend(){
  const V = VEH[S.veh];
  $('suspendCard').innerHTML = `<h2>🪪 Bằng lái hạng ${V.lic} của ${S.xungho} đã hết điểm</h2>
    <p>Xe phải dừng ngay tại chỗ. Theo <b>khoản 3 Điều 58 Luật Trật tự, an toàn giao thông đường bộ 2024</b>: bằng lái bị trừ hết điểm thì <b>không được lái xe theo bằng lái đó</b>. Sau ít nhất <b>6 tháng</b> mới được dự kiểm tra kiến thức pháp luật; đạt yêu cầu thì được phục hồi đủ 12 điểm.</p>
    <p>Trong game, 6 tháng trôi qua trong nháy mắt 😄. Làm bài kiểm tra ${QUIZ_N} câu, đúng từ ${QUIZ_PASS} câu là được hồi 12 điểm và lái tiếp.</p>
    ${S.veh === 'car' ? `<p>Bằng lái xe máy (hạng A1) có 12 điểm riêng, không bị ảnh hưởng: ${S.xungho} vẫn có thể đổi sang xe máy ở nút ❔.</p>` : ''}
    <p class="fine">Ngoài đời, bài kiểm tra cho bằng hạng A1 theo Thông tư 65/2024/TT-BCA gồm 25 câu (có câu điểm liệt, làm sai là không đạt), phải đúng từ 21 câu. Thông tư 105/2026/TT-BCA đã sửa đổi Thông tư 65, nên đề kiểm tra có thể thay đổi theo lộ trình của thông tư này.</p>
    <div class="row"><button class="btn primary" id="quizGo">Làm bài kiểm tra</button><button class="btn" id="quizReset">Chơi lại từ đầu</button></div>`;
  openOverlay('suspend');
  $('quizGo').onclick = startQuiz;
  $('quizReset').onclick = () => { resetAll(); closeOverlay('suspend'); };
}
function startQuiz(){
  quiz = {items: shuffle(QUIZ.filter(q => !q.veh || q.veh === S.veh)).slice(0, QUIZ_N).map(it => ({...it, opts: shuffle(it.a), pick: null})), i: 0};
  showQuiz();
}
function showQuiz(){
  const it = quiz.items[quiz.i];
  $('suspendCard').innerHTML = `<h2>Câu ${quiz.i + 1}/${QUIZ_N}</h2><p><b>${it.q}</b></p>` +
    it.opts.map((o, k) => `<div class="row"><button class="btn" style="width:100%;text-align:left" data-k="${k}">${o}</button></div>`).join('');
  $('suspendCard').querySelectorAll('button[data-k]').forEach(b => b.onclick = () => {
    it.pick = it.opts[+b.dataset.k]; quiz.i++;
    if (quiz.i < QUIZ_N) showQuiz(); else showQuizResult();
  });
}
function showQuizResult(){
  const right = quiz.items.filter(it => it.pick === it.a[0]).length, pass = right >= QUIZ_PASS;
  const wrong = quiz.items.filter(it => it.pick !== it.a[0]);
  $('suspendCard').innerHTML = `<h2>${pass ? '🎉 Đạt yêu cầu' : '😅 Chưa đạt'}: đúng ${right}/${QUIZ_N} câu</h2>` +
    (wrong.length ? '<p>Những câu cần nhớ lại:</p><ul>' + wrong.map(it => `<li><b>${it.q}</b><br>Đáp án: ${it.a[0]}. ${it.why}</li>`).join('') + '</ul>' : '') +
    (pass ? `<p>Bằng lái của ${S.xungho} được phục hồi đủ 12 điểm. Lần này đi cẩn thận nha!</p>`
          : `<p>Ngoài đời, không đạt thì phải chờ thêm 7 ngày làm việc mới được kiểm tra lại. Trong game, bạn làm lại ngay được.</p>`) +
    `<div class="row"><button class="btn primary" id="quizNext">${pass ? 'Lái tiếp' : 'Làm lại bài kiểm tra'}</button></div>`;
  $('quizNext').onclick = () => {
    if (pass){ S.pts = 12; S.suspended = false; save(); closeOverlay('suspend'); SND.reward(3); }
    else startQuiz();
  };
}

function newTrip(){
  let d, tries = 0;
  do { d = pick(DESTS); tries++; } while ((Math.hypot(d.bay.cx - player.x, d.bay.cy - player.y) < 420 || (S.trip && S.trip.dest === d)) && tries < 50);
  S.trip = {dest: d, fx: player.x, fy: player.y, clean: true, t0: S.now};
  S.route = computeRoute();
  S.trip.len = S.route ? S.route.remain : Math.hypot(d.bay.cx - player.x, d.bay.cy - player.y);   // quãng đường dự kiến, để tính cước
  SND.announceTrip();
  // cứ 2–3 chuyến thì có một cuộc gọi của khách, đổ chuông sau khi nhận chuyến khoảng 6–14 giây
  if (--S.callIn <= 0 && !S.call){ S.callAt = S.now + 6 + Math.random() * 8; S.callIn = 2 + (Math.random() < 0.5 ? 1 : 0); }
}
function arrive(){
  const t = S.trip, dd = Math.hypot(t.dest.bay.cx - t.fx, t.dest.bay.cy - t.fy);
  // cước theo quãng đường thật (bảng FARE trong luat.js), cộng thưởng đi sạch (phần trăm của cước)
  const fp = farePay(S.veh, Math.max(t.len || 0, dd)), base = fp.pay;
  let pay = base, bonus = 0;
  if (t.clean){
    S.streak++;
    bonus = Math.round(base * (0.5 + 0.25 * Math.min(S.streak - 1, 6)) / 1000) * 1000;
    pay += bonus;
    if (S.streak % 5 === 0 && S.pts < 12){ S.pts++; }
  }
  // khách chấm sao và boa thêm theo điểm văn hóa (bản 1.0); chuyến không làm ai phải chờ được +1 văn hóa sau khi chấm
  const rate = cultRating(base); pay += rate.tip;
  if (!t.hurt) cultAdd(CULT.trip, 'chuyến không làm ai phải chờ');
  S.money += pay; S.trips++;
  SND.reward(t.clean ? S.streak : 0);
  const cust = {name: 'Khách ở ' + t.dest.name, x: t.dest.bay.cx, y: t.dest.bay.cy};
  // vừa đỗ ngược chiều ngay tại điểm giao: khách nhắc luôn, bảng thông báo ghi kèm căn cứ
  const wrongPark = S.parkDirBay === t.dest.bay;
  say(cust, fill(pick(linesOf(wrongPark ? 'parkdir' : rate.stars <= 2 ? 'cultlow' : t.clean ? 'praise' : 'meh'))));
  showLaw(`<b>📦 Giao hàng thành công tới ${t.dest.name}</b><br>Tiền công ${fmt(base)} (quãng đường quy đổi ${fp.km.toFixed(1).replace('.', ',')} km)` +
    (t.clean ? ` + thưởng đi sạch ${fmt(bonus)} (chuỗi ${S.streak} chuyến sạch)` : ` (chuyến có vi phạm hoặc bị nhắc nên không có thưởng)`) +
    `<br>Khách chấm ${'⭐'.repeat(rate.stars)}${rate.tip ? ' và boa thêm ' + fmt(rate.tip) + ' vì bạn đi có văn hóa' : rate.stars <= 2 ? ' vì điểm văn hóa của bạn đang thấp (' + S.cult + '/100)' : ''}` +
    (wrongPark ? `<br>⚠️ ${lawOf('parkdir').name}: ${lawOf('parkdir').remind ? lawOf('parkdir').range.toLowerCase() : 'phạt ' + lawOf('parkdir').range}. 💡 ${lawOf('parkdir').tip}<br><small>${lawOf('parkdir').ref}</small>` : '') +
    (t.clean && S.streak % 5 === 0 ? `<br>🪪 5 chuyến sạch liên tiếp: được hồi 1 điểm GPLX.` : ''), true);
  floatText(player.x, player.y, '+' + fmt(pay), '#2f9e6b');
  newTrip(); save();
}

/* =========================================================
   8. CHỈ ĐƯỜNG (kiểu ứng dụng dẫn đường)
   ========================================================= */
const UTURN_COST = 250;
function projOn(p, a, b){
  const dx = b.x - a.x, dy = b.y - a.y, L2 = dx*dx + dy*dy || 1;
  const t = clamp(((p.x - a.x)*dx + (p.y - a.y)*dy) / L2, 0, 1);
  return {x: a.x + dx*t, y: a.y + dy*t};
}
function nearestSeg(p){
  let best = 0, bd = 1e9;
  SEGS.forEach((s, i) => { const d = dist(p, projOn(p, N[s.a], N[s.b])); if (d < bd){ bd = d; best = i; } });
  return best;
}
function sameDir(a, b){ return a.x*b.x + a.y*b.y > 0.5; }
function trimOf(id){ return id === 'F' ? R_OFF : DEAD[id] ? 0 : HALF; }
function segOff(a, b){ const s = SEGS[segIdx(a, b)]; return s && s.oneway ? 0 : 20; }
function segName(a, b){ const s = SEGS[segIdx(a, b)]; return s ? s.name : ''; }
// điểm trên làn bên phải của hướng đi d, tại vị trí tim đường pos
function lanePt(pos, d, off){ return {x: pos.x - d.y*off, y: pos.y + d.x*off}; }
function along(p, d, k){ return {x: p.x + d.x*k, y: p.y + d.y*k}; }

function computeRouteOld(){
  const t = S.trip; if (!t) return null;
  const dest = t.dest, ds = SEGS[dest.seg], dp = dest.bay.proj, bayC = {x: dest.bay.cx, y: dest.bay.cy};
  const P0 = {x: player.x, y: player.y}, hd = {x: Math.cos(player.a), y: Math.sin(player.a)};
  let atNode = null;
  for (const id in N){ if (DEAD[id]) continue; if (dist(P0, N[id]) <= (id === 'F' ? RB.rOut : HALF + 2)) atNode = id; }
  const cost = {}, prev = {}, startInfo = {}, cands = [];
  for (const id in N) cost[id] = Infinity;
  const UTC = VEH[S.veh].utCost;
  let si = -1, pr = null, UT = UTC;
  const addStart = (id, c, uturn, other) => { if (c < cost[id]){ cost[id] = c; prev[id] = null; startInfo[id] = {uturn, other}; } };
  if (atNode) addStart(atNode, 0, false, null);
  else {
    si = nearestSeg(P0); const s = SEGS[si], a = N[s.a], b = N[s.b];
    pr = projOn(P0, a, b);
    const dab = unit(a, b), fwd = hd.x*dab.x + hd.y*dab.y;
    const horiz = a.y === b.y;
    if (lineType(horiz ? 'h' : 'v', horiz ? a.y : a.x, horiz ? pr.x : pr.y) === 'solid') UT = UTC + 200;
    addStart(s.b, dist(pr, b) + (fwd < -0.2 ? UT : 0), fwd < -0.2, s.a);
    if (!s.oneway) addStart(s.a, dist(pr, a) + (fwd > 0.2 ? UT : 0), fwd > 0.2, s.b);
    if (si === dest.seg){
      const al = (dp.x - pr.x)*dab.x + (dp.y - pr.y)*dab.y, sgn = al >= 0 ? 1 : -1;
      const td = {x: dab.x * sgn, y: dab.y * sgn};
      if (!(s.oneway && sgn < 0) && sameDir(td, dest.bay.dir)){ const ut = fwd * sgn < -0.2;
        cands.push({type:'direct', cost: Math.abs(al) + (ut ? UT : 0), uturn: ut, sgn}); }
    }
  }
  const done = {};
  for (;;){
    let u = null;
    for (const id in N) if (!done[id] && cost[id] < Infinity && (u === null || cost[id] < cost[u])) u = id;
    if (u === null) break;
    done[u] = true;
    for (const s of SEGS){
      let v = null;
      if (s.a === u) v = s.b; else if (s.b === u && !s.oneway) v = s.a;
      if (!v) continue;
      // từ nút xuất phát mà quay ngược lại đúng đoạn vừa đi là quay đầu ở nút giao (trừ vòng xuyến): tính thêm chi phí quay đầu
      const c = cost[u] + dist(N[u], N[v]) + (u !== 'F' && prev[u] == null && startInfo[u] && startInfo[u].other === v ? UTC : 0);
      if (c < cost[v]){ cost[v] = c; prev[v] = u; }
    }
  }
  // tới nút rồi quay ngược lại đúng đoạn vừa đi cũng tính là quay đầu
  const back = (node, next) => (node !== 'F' && (prev[node] || (startInfo[node] && startInfo[node].other)) === next ? UTC : 0);
  // chỉ nhận hướng tiếp cận trùng chiều xe chạy của ô đỗ (đỗ bên phải theo chiều đi)
  if (sameDir(unit(N[ds.a], N[ds.b]), dest.bay.dir))
    cands.push({type:'via', node: ds.a, next: ds.b, cost: cost[ds.a] + dist(N[ds.a], dp) + back(ds.a, ds.b)});
  if (!ds.oneway && sameDir(unit(N[ds.b], N[ds.a]), dest.bay.dir))
    cands.push({type:'via', node: ds.b, next: ds.a, cost: cost[ds.b] + dist(N[ds.b], dp) + back(ds.b, ds.a)});
  cands.sort((x, y) => x.cost - y.cost);
  const cand = cands[0];
  if (!cand || !(cand.cost < Infinity)) return null;

  const pts = [P0]; let travel = hd, instr = null;
  const arriveInstr = (d, tr) => { const r = {x: -tr.y, y: tr.x};
    return {type:'arrive', dist: d, side: (r.x*(bayC.x - dp.x) + r.y*(bayC.y - dp.y)) > 0 ? 'phải' : 'trái'}; };

  if (cand.type === 'direct'){
    const s = SEGS[si], from = cand.sgn > 0 ? N[s.a] : N[s.b], to = cand.sgn > 0 ? N[s.b] : N[s.a];
    const d = unit(from, to), off = s.oneway ? 0 : 20;
    if (cand.uturn) pts.push(lanePt(along(pr, d, 25), d, off));
    pts.push(lanePt(dp, d, off)); pts.push(bayC); travel = d;
    instr = cand.uturn ? {type:'uturn', dist: 0} : arriveInstr(dist(pr, dp), d);
  } else {
    const chain = []; let id = cand.node;
    while (id){ chain.unshift(id); id = prev[id]; }
    const root = chain[0], info = startInfo[root] || {uturn:false, other:null};
    let prevId = info.other;
    if (!atNode){
      const d = unit(N[prevId], N[root]);
      pts.push(lanePt(along(pr, d, Math.min(25, dist(pr, N[root]))), d, segOff(prevId, root)));
    }
    // dựng đường vẽ
    for (let k = 0; k < chain.length; k++){
      const cur = chain[k], n = N[cur], nextId = chain[k+1] || cand.next;
      if (prevId && !(atNode && k === 0)){
        const d = unit(N[prevId], n);
        pts.push(lanePt(along(n, d, -trimOf(cur)), d, segOff(prevId, cur)));
      }
      const d2 = unit(n, N[nextId]);
      if (cur === 'F'){
        const a0 = (prevId && !(atNode && k === 0)) ? ENTRY[RING_SIDE[prevId]] : Math.atan2(P0.y - RB.y, P0.x - RB.x);
        for (const q of arc(a0, EXITA[RING_SIDE[nextId]])) pts.push(q);
      }
      pts.push(lanePt(along(n, d2, trimOf(cur)), d2, segOff(cur, nextId)));
      prevId = cur;
      if (k === chain.length - 1){ pts.push(lanePt(dp, d2, segOff(cur, nextId))); pts.push(bayC); travel = d2; }
    }
    // lời chỉ dẫn kế tiếp
    if (info.uturn) instr = {type:'uturn', dist: 0};
    else {
      let acc = 0, curP = P0, inDir = atNode ? hd : unit(pr, N[root]);
      if (!atNode && dist(pr, N[root]) < 1) inDir = hd;
      let fromId = info.other;
      for (let k = 0; k < chain.length && !instr; k++){
        const cur = chain[k], n = N[cur], nextId = chain[k+1] || cand.next, d2 = unit(n, N[nextId]);
        const dNode = Math.max(0, dist(curP, n) - trimOf(cur));
        if (cur === 'F'){
          const from = fromId && !(atNode && k === 0) ? RING_SIDE[fromId] : null, to = RING_SIDE[nextId];
          if (from) instr = {type:'ring', dist: acc + dNode, exitNo: ((RING_CCW.indexOf(to) - RING_CCW.indexOf(from) + 4) % 4) || 4, street: segName(cur, nextId)};
          else instr = {type:'ringexit', dist: 0, street: segName(cur, nextId)};
          break;
        }
        const ang = Math.atan2(inDir.x*d2.y - inDir.y*d2.x, inDir.x*d2.x + inDir.y*d2.y);
        if (Math.abs(ang) < 0.6){ acc += dist(curP, n); curP = n; inDir = d2; fromId = cur; continue; }
        instr = {type: Math.abs(ang) > 2.5 ? 'uturn' : (ang > 0 ? 'right' : 'left'), dist: acc + dNode, street: segName(cur, nextId)};
      }
      if (!instr) instr = arriveInstr(acc + dist(curP, dp), travel);
    }
  }
  let remain = 0;
  for (let i = 1; i < pts.length; i++) remain += dist(pts[i-1], pts[i]);
  return {pts, instr, remain};
}

/* ---------------------------------------------------------
   8b. CHỈ ĐƯỜNG TRÊN MAP (bản 1.1, bước 3): chạy trên đồ thị nút/đường do dungBanDo() dựng, đường góc bất kỳ, đường cong,
   vòng xuyến bao nhiêu lối ra cũng được. Kết quả cùng dạng với bộ cũ ({pts, instr, remain}); computeRouteOld giữ tới bước 7.
   Hướng rẽ theo góc giữa đường đang đi và đường sắp vào: dưới 30° đi thẳng, 30–60° đi chếch, 60–143° rẽ, trên 143° quay đầu
   (người dùng chốt 18:40 ngày 15/11/2026).
   --------------------------------------------------------- */
const NAV_ANG = {straight: Math.PI/6, bear: Math.PI/3, uturn: 2.5};
const ROUTE = {useMap: true};
// đường xe đang lái được đi: không phải phố đi bộ, không có biển cấm loại xe này
const roadOk = r => r.veh && !(S.veh === 'car' && r.noCar) && !(S.veh !== 'car' && r.noBike);
// hướng ra khỏi nút id theo đường r (nhánh của nút)
const armOut = (r, id) => r.a === id ? r.dirA : r.dirB;
const otherEnd = (r, id) => r.a === id ? r.b : r.a;
function mapTrim(nd){
  if (nd.kind === 'ring') return nd.ring.rOut + 4;
  if (nd.kind === 'end') return 0;
  return Math.max(0, ...nd.arms.filter(a => a.road.veh).map(a => a.half));
}
const laneOff = r => r.oneway ? 0 : r.half / 2;
// chiếu điểm lên các đường được đi, lấy đường gần nhất
function projAllowed(p, M){
  let best = null;
  for (const r of M.roads){ if (!roadOk(r)) continue;
    for (const g of r.seg){
      const t = clamp((p.x - g.p.x)*g.d.x + (p.y - g.p.y)*g.d.y, 0, g.l);
      const q = {x: g.p.x + g.d.x*t, y: g.p.y + g.d.y*t}, dd = dist(p, q);
      if (!best || dd < best.dd - 1e-9) best = {road: r, s: g.s0 + t, pt: q, dir: g.d, dd};
    } }
  return best;
}
// các điểm uốn của đường cong nằm giữa quãng s0 và s1 (theo chiều đi), đã dời sang làn bên phải
// m0, m1: bỏ các điểm uốn nằm trong khoảng m0 tính từ đầu đi, m1 tính từ đầu đến (phần nằm trong nút giao, vòng xuyến)
function bendPts(r, s0, s1, m0, m1){
  const out = [], sg = s1 >= s0 ? 1 : -1;
  m0 = m0 || 0; m1 = m1 || 0;
  for (let i = 1; i < r.seg.length; i++){ const g = r.seg[i];
    if ((g.s0 - s0) * sg > m0 + 1e-6 && (s1 - g.s0) * sg > m1 + 1e-6){
      const pa = r.seg[i-1].d, pb = g.d, dd = unit({x: 0, y: 0}, {x: (pa.x + pb.x)*sg, y: (pa.y + pb.y)*sg});
      out.push(lanePt(g.p, dd, laneOff(r))); } }
  return sg > 0 ? out : out.reverse();
}
// góc (trên màn hình) của điểm trong vòng xuyến nơi xe vào / ra theo nhánh có hướng out
function ringAng(nd, out, enter){
  const off = 20, k = Math.sqrt(Math.max(0, nd.ring.rLane*nd.ring.rLane - off*off)), sg = enter ? 1 : -1;
  return Math.atan2(out.y*k - sg*out.x*off, out.x*k + sg*out.y*off);
}
function ringArcAt(nd, a, b){
  while (b >= a) b -= 2*Math.PI;
  const n = Math.max(2, Math.ceil((a - b) / 0.22)), pts = [];
  for (let i = 1; i <= n; i++){ const th = a + (b - a) * i / n; pts.push({x: nd.x + nd.ring.rLane*Math.cos(th), y: nd.y + nd.ring.rLane*Math.sin(th)}); }
  return pts;
}
// thứ tự lối ra khi đi vòng ngược chiều kim đồng hồ (góc màn hình giảm dần) từ nhánh vào tới nhánh ra
function ringExitNo(nd, inRoad, outRoad){
  const ang = r => Math.atan2(armOut(r, nd.id).y, armOut(r, nd.id).x);
  const a0 = ang(inRoad), down = r => { let d = a0 - ang(r); while (d <= 1e-9) d += 2*Math.PI; return d; };
  const exits = nd.arms.map(a => a.road).filter(r => roadOk(r) && !(r.oneway && r.b === nd.id));
  const target = down(outRoad);
  return exits.filter(r => down(r) <= target + 1e-9).length || exits.length;
}
function destOnMap(dest, M){
  let best = null;
  for (const r of M.roads){ if (!r.veh) continue;
    for (const g of r.seg){
      const p = dest.bay.proj, t = clamp((p.x - g.p.x)*g.d.x + (p.y - g.p.y)*g.d.y, 0, g.l);
      const dd = Math.hypot(p.x - g.p.x - g.d.x*t, p.y - g.p.y - g.d.y*t);
      if (!best || dd < best.dd) best = {road: r, s: g.s0 + t, dd};
    } }
  return best;
}

function computeRouteMap(M){
  M = M || MAP;
  const t = S.trip; if (!t) return null;
  const dest = t.dest, dm = destOnMap(dest, M), ds = dm.road, dS = dm.s, dp = dest.bay.proj, bayC = {x: dest.bay.cx, y: dest.bay.cy};
  const P0 = {x: player.x, y: player.y}, hd = {x: Math.cos(player.a), y: Math.sin(player.a)};
  const NODE = M.nodes, G = M.graph.N;
  let atNode = null;
  for (const id in G){ const nd = NODE[id]; if (nd.kind === 'end') continue;
    if (dist(P0, nd) <= (nd.kind === 'ring' ? nd.ring.rOut : mapTrim(nd) + 2)) atNode = id; }
  const cost = {}, prevN = {}, prevR = {}, startInfo = {}, cands = [];
  for (const id in G) cost[id] = Infinity;
  const UTC = VEH[S.veh].utCost;
  let st = null, UT = UTC;
  const addStart = (id, c, uturn, road) => { if (c < cost[id]){ cost[id] = c; prevN[id] = null; prevR[id] = null; startInfo[id] = {uturn, road}; } };
  if (atNode) addStart(atNode, 0, false, null);
  else {
    st = projAllowed(P0, M); if (!st) return null;
    const r = st.road, fwd = hd.x*st.dir.x + hd.y*st.dir.y;
    if (M.lineAt(r, st.s) === 'solid') UT = UTC + 200;
    addStart(r.b, r.len - st.s + (fwd < -0.2 ? UT : 0), fwd < -0.2, r);
    if (!r.oneway) addStart(r.a, st.s + (fwd > 0.2 ? UT : 0), fwd > 0.2, r);
    if (r === ds){
      const al = dS - st.s, sgn = al >= 0 ? 1 : -1, dd = M.pointAt(r, dS).dir, td = {x: dd.x*sgn, y: dd.y*sgn};
      if (!(r.oneway && sgn < 0) && sameDir(td, dest.bay.dir)){ const ut = fwd * sgn < -0.2;
        cands.push({type:'direct', cost: Math.abs(al) + (ut ? UT : 0), uturn: ut, sgn}); }
    }
  }
  const done = {};
  for (;;){
    let u = null;
    for (const id in G) if (!done[id] && cost[id] < Infinity && (u === null || cost[id] < cost[u])) u = id;
    if (u === null) break;
    done[u] = true;
    for (const arm of NODE[u].arms){ const r = arm.road; if (!roadOk(r)) continue;
      if (r.oneway && r.b === u) continue;
      const v = otherEnd(r, u);
      // từ nút xuất phát mà quay ngược lại đúng đường vừa đi là quay đầu ở nút giao (trừ vòng xuyến)
      const c = cost[u] + r.len + (NODE[u].kind !== 'ring' && prevN[u] == null && startInfo[u] && startInfo[u].road === r ? UTC : 0);
      if (c < cost[v]){ cost[v] = c; prevN[v] = u; prevR[v] = r; }
    }
  }
  const back = (node, r) => (NODE[node].kind !== 'ring' && (prevR[node] || (startInfo[node] && startInfo[node].road)) === r ? UTC : 0);
  const dDir = M.pointAt(ds, dS).dir;
  if (roadOk(ds) && sameDir(dDir, dest.bay.dir))
    cands.push({type:'via', node: ds.a, road: ds, cost: cost[ds.a] + dS + back(ds.a, ds)});
  if (roadOk(ds) && !ds.oneway && sameDir({x: -dDir.x, y: -dDir.y}, dest.bay.dir))
    cands.push({type:'via', node: ds.b, road: ds, cost: cost[ds.b] + (ds.len - dS) + back(ds.b, ds)});
  cands.sort((x, y) => x.cost - y.cost);
  const cand = cands[0];
  if (!cand || !(cand.cost < Infinity)) return null;

  const pts = [P0]; let instr = null, travel = hd;
  const arriveInstr = (d, tr) => { const rr = {x: -tr.y, y: tr.x};
    return {type:'arrive', dist: d, side: (rr.x*(bayC.x - dp.x) + rr.y*(bayC.y - dp.y)) > 0 ? 'phải' : 'trái'}; };

  if (cand.type === 'direct'){
    const r = st.road, d0 = M.pointAt(r, dS).dir, d = {x: d0.x*cand.sgn, y: d0.y*cand.sgn}, sd = st.dir, sdd = {x: sd.x*cand.sgn, y: sd.y*cand.sgn};
    if (cand.uturn) pts.push(lanePt(along(st.pt, sdd, 25), sdd, laneOff(r)));
    pts.push(...bendPts(r, st.s, dS));
    pts.push(lanePt(dp, d, laneOff(r))); pts.push(bayC); travel = d;
    instr = cand.uturn ? {type:'uturn', dist: 0} : arriveInstr(Math.abs(dS - st.s), d);
  } else {
    // chuỗi nút từ điểm xuất phát tới nút trước điểm giao, kèm đường đi vào mỗi nút
    const chain = []; let id = cand.node;
    while (id){ chain.unshift({id, rin: prevR[id] || null}); id = prevN[id]; }
    const root = chain[0].id, info = startInfo[root] || {uturn: false, road: null};
    if (!atNode) chain[0].rin = info.road;
    const sTo = (r, node) => r.a === node ? 0 : r.len;   // quãng s của nút trên đường r
    if (!atNode){
      const r = info.road, sR = sTo(r, root), sg = sR > st.s ? 1 : -1, d = {x: st.dir.x*sg, y: st.dir.y*sg};
      pts.push(lanePt(along(st.pt, d, Math.min(25, Math.abs(sR - st.s))), d, laneOff(r)));
      pts.push(...bendPts(r, st.s + sg*25, sR, 0, mapTrim(NODE[root])));
    }
    for (let k = 0; k < chain.length; k++){
      const cur = chain[k].id, nd = NODE[cur], rin = chain[k].rin, rout = k + 1 < chain.length ? chain[k+1].rin : cand.road;
      const hasIn = rin && !(atNode && k === 0), tr = mapTrim(nd);
      if (hasIn){ if (k > 0) pts.push(...bendPts(rin, sTo(rin, chain[k-1].id), sTo(rin, cur), mapTrim(NODE[chain[k-1].id]), tr));
        const din = armOut(rin, cur), d = {x: -din.x, y: -din.y};
        pts.push(lanePt(along(nd, d, -tr), d, laneOff(rin))); }
      const d2 = armOut(rout, cur);
      if (nd.kind === 'ring'){
        const a0 = hasIn ? ringAng(nd, armOut(rin, cur), true) : Math.atan2(P0.y - nd.y, P0.x - nd.x);
        pts.push(...ringArcAt(nd, a0, ringAng(nd, d2, false)));
      }
      pts.push(lanePt(along(nd, d2, tr), d2, laneOff(rout)));
      if (k === chain.length - 1){
        pts.push(...bendPts(rout, sTo(rout, cur), dS, tr, 0));
        const dd = M.pointAt(rout, dS).dir, sg = rout.a === cur ? 1 : -1; travel = {x: dd.x*sg, y: dd.y*sg};
        pts.push(lanePt(dp, travel, laneOff(rout))); pts.push(bayC);
      }
    }
    // lời chỉ dẫn kế tiếp
    if (info.uturn) instr = {type:'uturn', dist: 0};
    else {
      let acc = 0;
      for (let k = 0; k < chain.length && !instr; k++){
        const cur = chain[k].id, nd = NODE[cur], rin = chain[k].rin, rout = k + 1 < chain.length ? chain[k+1].rin : cand.road;
        const d2 = armOut(rout, cur);
        // quãng đường tới nút: chặng đầu tính thẳng từ xe như bộ cũ, các chặng sau theo chiều dài đường
        const leg = k === 0 ? dist(P0, nd) : rin.len;
        const dNode = Math.max(0, leg - mapTrim(nd));
        let inDir;
        if (atNode && k === 0) inDir = hd;
        else { const o = armOut(rin, cur); inDir = {x: -o.x, y: -o.y}; if (k === 0 && dist(st.pt, nd) < 1) inDir = hd; }
        if (nd.kind === 'ring'){
          if (rin && !(atNode && k === 0)) instr = {type:'ring', dist: acc + dNode, exitNo: ringExitNo(nd, rin, rout), street: rout.name};
          else instr = {type:'ringexit', dist: 0, street: rout.name};
          break;
        }
        const ang = Math.atan2(inDir.x*d2.y - inDir.y*d2.x, inDir.x*d2.x + inDir.y*d2.y), aa = Math.abs(ang);
        if (aa < NAV_ANG.straight){
          // ngã năm, ngã ba lệch: còn nhánh khác cũng gần hướng thẳng thì đọc rõ tên đường để khỏi nhầm
          const rival = nd.junction && nd.arms.some(a => a.road !== rout && a.road !== rin && roadOk(a.road) && !(a.road.oneway && a.road.b === cur) &&
            Math.abs(Math.atan2(inDir.x*a.out.y - inDir.y*a.out.x, inDir.x*a.out.x + inDir.y*a.out.y)) < NAV_ANG.bear);
          if (rival){ instr = {type:'straight', dist: acc + dNode, street: rout.name}; break; }
          acc += leg; continue;
        }
        const side = ang > 0 ? 'right' : 'left';
        instr = {type: aa > NAV_ANG.uturn ? 'uturn' : aa < NAV_ANG.bear ? 'bear' + side : side, dist: acc + dNode, street: rout.name};
      }
      if (!instr){
        const last = chain[chain.length - 1].id;
        instr = arriveInstr(acc + Math.abs(dS - sTo(cand.road, last)), travel);
      }
    }
  }
  let remain = 0;
  for (let i = 1; i < pts.length; i++) remain += dist(pts[i-1], pts[i]);
  return {pts, instr, remain};
}
function computeRoute(){ return ROUTE.useMap ? computeRouteMap() : computeRouteOld(); }

/* =========================================================
   9. CẬP NHẬT NPC
   ========================================================= */
function lightLimit(n, ux, uy){
  let lim = Infinity;
  for (const L of LIGHTS){
    const ap = approach(n, ux, uy, L);
    if (!ap || ap.dist > 210) continue;
    const st = lightOf(L, ap.axis, S.now), front = ap.dist - STOPG - n.len/2;
    if (front < -1) continue;   // đầu xe đã qua vạch dừng: đi tiếp
    // đèn vàng: chỉ đi tiếp nếu kịp qua vạch trước khi đèn đỏ, không thì dừng
    const c = ((S.now + L.off) % CYCLE + CYCLE) % CYCLE, remain = (ap.axis === 'NS' ? 10 : 21) - c;
    const makeIt = front <= 1 || (front + 2) / Math.max(n.v, 5) < remain - 0.05;
    if (st === 'red' || (st === 'yellow' && !makeIt)) lim = Math.min(lim, stopLimit(front - 3));
  }
  return lim;
}
// Tuyến tự sinh: nhìn trước dọc theo tuyến tới 210 đơn vị, gặp mốc vạch dừng thì xét đèn của đúng nhánh đó
function routeLightLimit(n){
  const pts = n.route.pts, m = pts.length; let lim = Infinity, acc = 0, prev = n;
  for (let k = 0; k < m && acc <= 210; k++){
    const j = n.route.loop ? (n.idx + k) % m : n.idx + k; if (j >= m) break;
    const q = pts[j]; acc += Math.hypot(q.x - prev.x, q.y - prev.y); prev = q;
    if (!q.stop) continue;
    const L = q.stop.L, ph = q.stop.phase, front = acc - n.len/2;
    if (front < -1 || acc > 210) continue;
    const st = lightOf(L, ph, S.now);
    const c = ((S.now + L.off) % CYCLE + CYCLE) % CYCLE, remain = (ph === 'NS' ? 10 : 21) - c;
    const makeIt = front <= 1 || (front + 2) / Math.max(n.v, 5) < remain - 0.05;
    if (st === 'red' || (st === 'yellow' && !makeIt)) lim = Math.min(lim, stopLimit(front - 3));
  }
  return lim;
}
function updNPC(n, dt){
  if (n.hidden){
    n.respawnT -= dt;
    if (n.route.gen && !n.route.loop && n.route.done){ const nr = npcNewRoute(n.route.map || MAP, n.kind); if (nr) n.route = nr; }   // tuyến tự sinh: nhận tuyến mới
    const p0 = n.route.pts[0];
    if (n.respawnT <= 0 && !vehicles().some(o => Math.hypot(o.x - p0.x, o.y - p0.y) < 45)){
      n.hidden = false; n.x = p0.x; n.y = p0.y; n.idx = 1; n.v = n.vmax * 0.6;
      const t = n.route.pts[1]; n.a = Math.atan2(t.y - n.y, t.x - n.x);
    }
    return;
  }
  let tgt = n.route.pts[n.idx], dx = tgt.x - n.x, dy = tgt.y - n.y, d = Math.hypot(dx, dy);
  if (d < 3){
    n.idx++;
    if (n.idx >= n.route.pts.length){
      if (n.route.loop) n.idx = 0;
      else { n.hidden = true; n.respawnT = 1 + Math.random()*4; n.blockedBy = null; n.route.done = true; return; }
    }
    tgt = n.route.pts[n.idx]; dx = tgt.x - n.x; dy = tgt.y - n.y; d = Math.hypot(dx, dy) || 1;
  }
  const ux = dx / d, uy = dy / d;
  let allowed = n.vmax, blocker = null;

  allowed = Math.min(allowed, n.route.gen ? routeLightLimit(n) : lightLimit(n, ux, uy));

  if (tgt.yieldAt !== undefined && d < 45){
    if (n.yieldWait < 5 && ringBusy(tgt.yieldAt, n, 0, tgt.ring)){ allowed = Math.min(allowed, stopLimit(d - 2)); n.yieldWait += dt; }
  } else n.yieldWait = 0;

  for (const o of vehicles()){
    if (o === n) continue;
    if (o !== player && n.ghostT > 0) continue;
    if (o === player && (n.ghostP > 0 || S.inBay)) continue;   // xe đỗ trong ô P không cản ai
    const rx = o.x - n.x, ry = o.y - n.y;
    const f = rx*ux + ry*uy, l = Math.abs(rx*uy - ry*ux);
    if (f <= 0 || f > 140 || l > 15) continue;
    const lim = stopLimit(f - (n.len + o.len)/2 - 6);
    if (lim < allowed){ allowed = lim; blocker = o; }
  }
  // người đi bộ đang qua vạch ở hai đầu Phố Chợ: xe NPC dừng nhường (không tính là bị xe nào chặn)
  for (const p of peds){
    if (!crossOnRoad(p)) continue;
    const rx = p.x - n.x, ry = p.y - n.y, f = rx*ux + ry*uy, l = Math.abs(rx*uy - ry*ux);
    if (f > 0 && f < 100 && l < 16) allowed = Math.min(allowed, stopLimit(f - 14));
  }
  n.blockedBy = (blocker && allowed < n.vmax * 0.5) ? blocker : null;

  if (n.hitT > 0){ n.hitT -= dt; allowed = 0; }
  if (n.v < allowed) n.v = Math.min(allowed, n.v + n.acc*dt); else n.v = Math.max(allowed, n.v - 420*dt);

  if (n.v < 3 && n.blockedBy) n.waitT += dt; else n.waitT = 0;
  if (n.waitT > 4 && n.blockedBy && n.blockedBy !== player){ n.ghostT = 2; n.waitT = 0; }
  if (n.waitT > 6 && n.blockedBy === player && S.now >= S.faultUntil){ n.ghostP = 3; n.waitT = 0; }
  if (n.ghostT > 0) n.ghostT -= dt;
  if (n.ghostP > 0) n.ghostP -= dt;
  if (n.hitCool > 0) n.hitCool -= dt;

  const step = Math.min(n.v * dt, d);
  n.x += ux * step; n.y += uy * step;
  n.a += normA(Math.atan2(uy, ux) - n.a) * Math.min(1, dt * 10);
}
// Người đang ở trên mặt đường (hoặc sắp bước xuống) tại vạch qua đường: xe phải nhường
const crossOnRoad = p => p.cross && Math.abs((p.x - p.cw.x)*p.cw.n.x + (p.y - p.cw.y)*p.cw.n.y) < p.cw.half + 6;
function updCrosser(p, dt){
  if (p.wait > 0){ p.wait -= dt; return; }
  const tx = p.dir > 0 ? p.x1 : p.x0, ty = p.dir > 0 ? p.y1 : p.y0, dd = Math.hypot(tx - p.x, ty - p.y), st = Math.min(p.v * dt, dd);
  if (dd > 0){ p.x += (tx - p.x) / dd * st; p.y += (ty - p.y) / dd * st; }
  if (dd - st < 0.5){ p.dir = -p.dir; p.wait = 5 + Math.random() * 8; p.cyc++; }
}
function updPed(p, dt){
  if (p.cross){ if (p.stopT > 0){ p.stopT -= dt; return; } updCrosser(p, dt); return; }
  if (p.stopT > 0){ p.stopT -= dt; return; }
  const t = p.route.pts[p.idx], dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
  if (d < 2){ p.idx = (p.idx + 1) % p.route.pts.length; return; }
  const st = Math.min(p.v * dt, d); p.x += dx/d*st; p.y += dy/d*st;
}

/* =========================================================
   10. NGƯỜI CHƠI VÀ LUẬT
   ========================================================= */
const keys = {up:false, down:false, brake:false, left:false, right:false, rev:false};   // rev: nút/phím R, số lùi (chỉ lùi khi xe đã dừng hẳn rồi nhấn lại)
const VMAX = 165;   // 55 km/h (km/h = vận tốc / 3): tốc độ tối đa của xe máy
// Thông số từng loại xe (4 đơn vị = 1 m; vận tốc 3 = 1 km/h)
//   len, w: dài, rộng · vmax: tốc độ tối đa · accLo/accHi: tăng tốc dưới/trên vận tốc accSw · brake: phanh
//   crawl, crawlAcc: giữ phím rẽ mà không ga thì tự bò tới vận tốc crawl (crawlAcc phải lớn hơn lực hãm 70) · turnR: bán kính quay vòng nhỏ nhất (đơn vị bản đồ)
//   rMax: tốc độ góc lớn nhất (rad/s), giảm dần về rHi khi vận tốc từ v1 lên v2 · hitR: bán kính va chạm · utCost: chỉ đường "ngại" quay đầu cỡ nào
const VEH = {
  bike: {name: 'xe máy', lic: 'A1', len: 18, w: 8, vmax: VMAX, accLo: 115, accHi: 70, accSw: 115, brake: 330, crawl: 33, crawlAcc: 115,
         turnR: 10, rMax: 3.3, rHi: 2.4, v1: 40, v2: 80, hitR: 8, utCost: 250},
  // ô tô con: dài 5 m, rộng 2,5 m (vẽ hơi to cho dễ nhìn); tối đa 70 km/h; quay vòng nhỏ nhất bán kính khoảng 5,5 m
  car:  {name: 'ô tô', lic: 'B', len: 20, w: 10, vmax: 210, accLo: 70, accHi: 45, accSw: 120, brake: 300, crawl: 24, crawlAcc: 140,
         turnR: 22, rMax: 1.5, rHi: 0.9, v1: 40, v2: 150, hitR: 5, utCost: 5000}   // utCost lớn: chỉ đường dẫn ô tô đi vòng (vòng xuyến, quanh khối phố) thay vì quay đầu
};
function setVehicle(v){
  if (!VEH[v] || v === S.veh){ player.len = VEH[S.veh].len; player.w = VEH[S.veh].w; return; }
  S.ptsBy[S.veh] = S.pts; S.statsBy[S.veh] = S.stats;
  S.veh = v; S.pts = S.ptsBy[v]; S.stats = S.statsBy[v]; S.suspended = S.pts <= 0;
  player.len = VEH[v].len; player.w = VEH[v].w; player.v = 0; S.turn = 0; S.ut = null; S.ta = null; S.noHelmT = 0;
  document.body.classList.toggle('car', v === 'car');
  hudCache = {}; S.route = computeRoute(); save(); resize();
}
// Các điểm dọc thân xe người chơi (đuôi, giữa, đầu) để tính va chạm với ô tô dài
function bodyPts(x, y, a){
  const V = VEH[S.veh], k = Math.max(0, V.len / 2 - V.w / 2), c = Math.cos(a), sn = Math.sin(a);
  return k ? [{x: x - c*k, y: y - sn*k}, {x, y}, {x: x + c*k, y: y + sn*k}] : [{x, y}];
}
function laneAssist(c, dt){
  // Thả phím rẽ ra thì xe tự nắn thẳng theo làn bên phải của hướng đang đi
  const ca = Math.cos(player.a), sa = Math.sin(player.a);
  let base = null, e = 0, k = 45, lim = 0.3;
  if (c.t === 'bay'){   // trong ô đỗ: giữ xe thẳng giữa ô theo chiều của ô; chạy hết ô thì tự nhập lại làn
    const b = c.bay, d = b.dir;
    if (ca*d.x + sa*d.y < 0.8) return;
    base = Math.atan2(d.y, d.x); e = (player.x - b.cx) * -d.y + (player.y - b.cy) * d.x; k = 28;
  }
  // trên đường (ngang, dọc, chéo hay cong): nắn theo hướng đường tại chỗ xe, về tâm làn bên phải (bản 1.1 bước 6)
  else if (c.road && c.road.veh && c.dir){
    const f = laneFrame(c, player.a);
    if (f.dot > 0.8){ base = Math.atan2(f.d.y, f.d.x); e = f.lat - assistOff(f.road); }
  }
  if (base === null) return;
  const target = base - clamp(e / k, -lim, lim);
  player.a = normA(player.a + normA(target - player.a) * Math.min(1, dt * 3.5));
}
function reasonToStop(){
  const la = playerLightAhead(150);
  if (la && la.state !== 'green') return true;
  const ux = Math.cos(player.a), uy = Math.sin(player.a);
  for (const n of npcs){
    if (n.hidden) continue;
    const rx = n.x - player.x, ry = n.y - player.y, f = rx*ux + ry*uy, l = Math.abs(rx*uy - ry*ux);
    if (f > 0 && f < 60 && l < 16) return true;
  }
  return false;
}
function updPlayer(dt){
  const prev = {x: player.x, y: player.y, a: player.a};
  const prevC = classify(prev.x, prev.y), V = VEH[S.veh];
  S.inBay = prevC.t === 'bay';
  // Space và nút PHANH: chỉ phanh, dừng hẳn thì đứng yên. Phím ↓ / S: phanh, dừng rồi giữ tiếp thì lùi chậm.
  const braking = keys.down || keys.brake || keys.rev;
  // R: đang chạy tới thì chỉ phanh (khoá lại tới khi nhả R), dừng hẳn rồi nhấn R lần nữa mới lùi
  if (!keys.rev) S.revLock = false; else if (player.v > 0.5) S.revLock = true;
  if (player.stun > 0) player.stun -= dt;
  else {
    if (keys.up) player.v += (player.v < V.accSw ? V.accLo : V.accHi) * dt;   // xe máy: quá 38 km/h thì tăng tốc chậm lại
    if (keys.brake){ const b = V.brake * dt; player.v = Math.abs(player.v) <= b ? 0 : player.v - Math.sign(player.v) * b; }
    else if (keys.down) player.v -= (player.v > 0 ? V.brake : 80) * dt;
    else if (keys.rev){
      if (S.revLock || player.v > 0){ const b = V.brake * dt; player.v = Math.abs(player.v) <= b ? 0 : player.v - Math.sign(player.v) * b; }
      else player.v -= 80 * dt;
    }
  }
  if (S.suspended){ player.v = 0; }
  if ((!keys.up && !braking) || player.stun > 0){
    const fr = 70 * dt; player.v = Math.abs(player.v) <= fr ? 0 : player.v - Math.sign(player.v) * fr;
  }
  // Cua chậm (quay đầu, rẽ gắt): giữ phím rẽ mà không bấm ga thì xe tự giữ khoảng 11 km/h, khỏi phải nhấp nhả GA
  if ((keys.left || keys.right) && !keys.up && !braking && player.v >= 0 && player.v < V.crawl && player.stun <= 0 && !S.suspended){
    player.v = Math.min(V.crawl, player.v + V.crawlAcc * dt);
  }
  if (S.ut){
    const u = S.ut;
    if (S.now > u.end || player.stun > 0 || S.suspended || keys.brake || keys.down || keys.left || keys.right || Math.abs(normA(u.target - player.a)) < 0.2) endUTurn();
    else if (player.v < V.crawl) player.v = Math.min(V.crawl, player.v + V.crawlAcc * dt);
    else if (player.v > V.crawl + 8) player.v -= V.brake * 0.6 * dt;
  }
  turnAssistStart();
  if (S.ta){
    if (keys.left || keys.right) S.ta = null;   // người chơi tự lái
    else {
      const cap = TURN_CAP[S.veh];
      if (player.v > cap) player.v = Math.max(cap, player.v - V.brake * 0.8 * dt);
      // đã vào trong ngã tư thì giữ xe bò tiếp cho khỏi đứng giữa giao lộ (trước vạch dừng thì không tự chạy)
      const inJ = prevC.t === 'junction' && prevC.node === S.ta.node;
      if (inJ && !braking && player.v < V.crawl) player.v = Math.min(V.crawl, player.v + V.crawlAcc * dt);
    }
  }
  const vmax = prevC.t === 'off' ? 45 : V.vmax;
  if (player.v > vmax) player.v = Math.max(vmax, player.v - 320 * dt);
  player.v = Math.max(player.v, -35);
  if (player.stun <= 0){
    const steer = S.ut ? -1 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    // Tốc độ góc: đi chậm thì quay vòng hẹp (bán kính khoảng 2,5 m = 10 đơn vị, như xe máy thật); từ 13 km/h trở lên giảm dần về 2,4 rad/s ở 27 km/h
    const sv = Math.abs(player.v);
    // ô tô quay vòng rộng hơn nhiều (bán kính nhỏ nhất khoảng 5,5 m) và càng nhanh càng khó bẻ lái
    let rate = sv <= V.v1 ? Math.min(sv / V.turnR, V.rMax) : V.rMax - (V.rMax - V.rHi) * clamp((sv - V.v1) / (V.v2 - V.v1), 0, 1);
    if (phoneDriving()) rate *= 0.7;   // một tay cầm điện thoại: lái khó hơn
    if (S.ta && !S.ut){ S.lastSteer = S.now; turnAssistSteer(dt, rate); }
    else if (steer){ S.lastSteer = S.now; player.a = normA(player.a + steer * rate * dt * Math.sign(player.v || 1)); }
    // Trợ lái chờ 1 giây sau khi nhả phím rẽ; đang bật xi-nhan (6 giây đầu, ngoài ô đỗ) thì không giành lái vì có thể đang định rẽ hoặc quay đầu
    else if (S.assist && !phoneDriving() && player.v > 20 && S.now - S.lastSteer > 1 && !(S.turn !== 0 && S.now - S.sigOnT < 6 && prevC.t !== 'bay')) laneAssist(prevC, dt);
  }
  const nx = clamp(player.x + Math.cos(player.a) * player.v * dt, 8, MAP.W - 8);
  const ny = clamp(player.y + Math.sin(player.a) * player.v * dt, 8, MAP.H - 8);
  // Va vào nhà: bật lại. Nếu xe đã lỡ chạm sẵn (ví dụ vừa xoay thân xe vào tường) thì vẫn cho đi để thoát ra, không kẹt.
  const houseAt = (x, y, a) => S.veh === 'car' ? bodyPts(x, y, a).some(q => hitsHouse(q.x, q.y, V.w / 2)) : hitsHouse(x, y, 7);
  if (houseAt(nx, ny, player.a) && !houseAt(player.x, player.y, player.a)){ player.v *= -0.25; }
  else { player.x = nx; player.y = ny; }
  // Đảo giữa vòng xuyến: đẩy xe ra ngoài mép đảo và cho trượt dọc theo mép (trước đây xe bật lùi rồi kẹt cứng)
  // (bản 1.1 bước 6: áp dụng cho mọi vòng xuyến của MAP)
  { const pad = S.veh === 'car' ? V.w / 2 : 3; let hit = false;
    for (const g of MAP.rings) for (const q of bodyPts(player.x, player.y, player.a)){
      const dx = q.x - g.x, dy = q.y - g.y, d = Math.hypot(dx, dy) || 1, need = g.rIn + pad - d;
      if (need > 0){ player.x += dx / d * need; player.y += dy / d * need; hit = true; }
    }
    if (hit && !S.islandHit){ player.v *= 0.5; SND.thud(); }
    S.islandHit = hit; }

  // vô lăng ô tô xoay theo hướng lái: có bấm rẽ thì xoay hết cỡ, trợ lái tự đánh thì xoay theo tốc độ quay thực của xe
  { const yaw = normA(player.a - prev.a) / Math.max(dt, 1e-4) * (player.v < 0 ? -1 : 1);
    const tgt = keys.left || keys.right ? (keys.right ? 1 : 0) * 90 - (keys.left ? 1 : 0) * 90 : clamp(yaw / 2.4, -1, 1) * 90;
    S.wheel = (S.wheel || 0) + (tgt - (S.wheel || 0)) * Math.min(1, dt * 9); }
  // va chạm với NPC (xe đang đỗ trong ô P thì không tính)
  if (!S.inBay) for (const n of npcs){
    if (n.hidden || n.ghostP > 0 || n.ghostT > 0) continue;
    let d = 1e9, hp = player;
    for (const q of bodyPts(player.x, player.y, player.a)){ const dq = segDist(q.x, q.y, n); if (dq < d){ d = dq; hp = q; } }
    const minD = V.hitR + n.w/2;
    if (d >= minD) continue;
    const ang = Math.atan2(hp.y - n.y, hp.x - n.x);
    player.x += Math.cos(ang) * (minD - d + 1); player.y += Math.sin(ang) * (minD - d + 1);
    if (n.hitCool > 0 || S.now < S.crashCool) continue;
    n.hitCool = 2; n.hitT = 2; n.v = 0; player.v *= -0.3; player.stun = 0.8;
    SND.thud();
    S.crashCool = S.now + 6; // tối đa một lần xử lý va chạm mỗi 6 giây
    const ahead = (n.x - prev.x) * Math.cos(player.a) + (n.y - prev.y) * Math.sin(player.a) > 0;
    if (S.now < S.faultUntil){
      violate('crash', 'crash', n);
      compensate(n, 1500000, 'đền va chạm');
    } else if (ahead && Math.abs(player.v) > 3){
      say(n, fill(pick(LINES.bump)));
      compensate(n, 200000, 'đền xe');
      if (S.trip) S.trip.clean = false;
      S.streak = 0;
    } else {
      say(n, fill(pick(LINES.victim)));
      S.money += 200000; floatText(player.x, player.y, '+' + fmt(200000) + ' được đền', '#2f9e6b'); save();
    }
  }
  // người đi bộ trên vỉa hè
  if (!S.inBay) for (const p of peds){
    if ((S.veh === 'car' ? segDist(p.x, p.y, player) < player.w / 2 + 1 : Math.hypot(p.x - player.x, p.y - player.y) < 2)){   // xe máy: 2 đơn vị = 0,5 m
      p.stopT = 1.2;
      if (p.cross){   // đụng người đang qua vạch: không nhường người đi bộ
        if (p.hitCyc !== p.cyc){ p.hitCyc = p.cyc; say(p, fill(pick(LINES.crossbump))); cultAdd(CULT.nogive, 'không nhường người đi bộ'); }
      } else
      if (S.now - S.sidewalkSaidT > 8){ S.sidewalkSaidT = S.now; say(p, fill(pick(linesOf('sidewalk')))); cultAdd(CULT.sidewalk, 'leo vỉa hè'); }
      if (!(p.slowT > S.now)){ player.v *= 0.6; p.slowT = S.now + 1.5; }   // chậm lại một lần mỗi lần gặp, để còn lách tránh được
    }
  }
  // Người đi bộ đang qua vạch ở hai đầu Phố Chợ: dừng lại nhường được +3; lao vào vạch khi họ đang qua là không nhường (−5), mỗi lượt qua tính một lần
  { const ca = Math.cos(player.a), sa = Math.sin(player.a), spd = Math.abs(player.v);
    if (spd > 24) S.lastMoveT = S.now;   // đang chạy: để biết người chơi vừa dừng lại vì người đi bộ chứ không phải đang đỗ sẵn
    for (const p of peds){
      if (!crossOnRoad(p) || S.inBay) continue;
      const dxp = p.x - player.x, dyp = p.y - player.y, f = dxp*ca + dyp*sa, l = Math.abs(dxp*sa - dyp*ca);
      if (l < 22 && f > 0 && f < 70 && spd < 12 && S.now - S.lastMoveT < 4 && p.yieldCyc !== p.cyc){ p.yieldCyc = p.cyc; say(p, fill(pick(LINES.crossthanks))); cultAdd(CULT.yield, 'nhường người đi bộ'); SND.reward(1); }
      const w = p.cw, ox = player.x - w.x, oy = player.y - w.y;   // dọc đường cách vạch dưới 34 và đang ở trên mặt đường
      if (Math.abs(ox*w.d.x + oy*w.d.y) < 34 && Math.abs(ox*w.n.x + oy*w.n.y) < w.half && spd > 24 && p.hitCyc !== p.cyc && p.failCyc !== p.cyc && p.yieldCyc !== p.cyc){
        p.failCyc = p.cyc; say(p, fill(pick(LINES.crossbump))); cultAdd(CULT.nogive, 'không nhường người đi bộ');
      }
    }
    // Bám đuôi: xe người chơi chạy từ 20 km/h trở lên mà cách xe phía trước dưới 0,6 giây (liên tục 1,5 giây) thì bị nhắc, trừ văn hóa; mỗi 10 giây một lần
    let best = null, bg = 1e9;
    for (const n of npcs){
      if (n.hidden || n.ghostT > 0) continue;
      const rx = n.x - player.x, ry = n.y - player.y, f = rx*ca + ry*sa, l = Math.abs(rx*sa - ry*ca);
      if (f <= 0 || l > 12) continue;
      const gap = f - (n.len + player.len) / 2; if (gap < bg){ bg = gap; best = n; }
    }
    if (best && player.v > 60 && bg > 0 && bg / player.v < 0.6 && best.v > 15 && !S.inBay) S.tailT += dt; else S.tailT = Math.max(0, S.tailT - dt);
    if (S.tailT > 1.5 && S.now - S.tailCool > 10){
      S.tailT = 0; S.tailCool = S.now; say(best, fill(pick(LINES.tailgate))); cultAdd(CULT.tailgate, 'bám đuôi');
    } }
  checkRules(prev, prevC, dt);
}

// Bậc phạt quá tốc độ: xe máy 3 bậc (5–<10, 10–20, >20); ô tô 4 bậc (5–<10, 10–20, >20–35, >35)
function speedType(over){
  if (S.veh === 'car') return over > 35 ? 'speed4' : over > 20 ? 'speed3' : over >= 10 ? 'speed2' : 'speed1';
  return over > 20 ? 'speed3' : over >= 10 ? 'speed2' : 'speed1';
}
function checkRules(prev, prevC, dt){
  const c = classify(player.x, player.y);
  const sp = Math.abs(player.v);
  const sgn = player.v >= 0 ? 1 : -1;
  const mx = Math.cos(player.a) * sgn, my = Math.sin(player.a) * sgn; // hướng chuyển động thật

  // 1) Vượt đèn đỏ: đầu xe vượt qua VẠCH DỪNG khi đèn hướng mình đang đỏ
  //    (đầu xe đã qua vạch dừng lúc đèn vàng thì được đi tiếp, đúng như luật)
  //    Từ bản 1.1 bước 5: mỗi nhánh xe của mỗi nút có đèn có một vạch dừng riêng (MAP.stopLines), theo hướng nhánh, góc bất kỳ
  const nose = {x: player.x + mx * 9, y: player.y + my * 9}, pNose = {x: prev.x + mx * 9, y: prev.y + my * 9};
  if (sp > 5) for (const sl of MAP.stopLines){
    const dx = sl.d.x, dy = sl.d.y;
    if (mx*dx + my*dy < 0.3) continue;
    const lat = Math.abs((nose.x - sl.sx)*dy - (nose.y - sl.sy)*dx);
    if (lat >= sl.half) continue;
    const before = (pNose.x - sl.sx)*dx + (pNose.y - sl.sy)*dy, after = (nose.x - sl.sx)*dx + (nose.y - sl.sy)*dy;
    if (before < 0 && after >= 0){
      // camera chụp tốc độ đúng lúc đầu xe qua vạch dừng (cả đèn xanh lẫn đèn đỏ), so với giới hạn của đoạn đường vừa đi qua
      const si = MAP.speedInfo(prevC);
      if (si && S.now >= S.camCool){
        const over = sp / 3 - si.limit;
        if (over >= 5){
          S.camCool = S.now + 3;
          violate(speedType(over), si.child ? 'speedcamschool' : 'speedcam');
        }
      }
      // camera cũng chụp người đang cầm điện thoại khi qua vạch dừng (mỗi cuộc gọi chỉ phạt một lần)
      if (phoneDriving() && !S.call.fined){ S.call.fined = true; violate('phone', 'phonecam', null, true); }
      if (lightOf(sl.L, sl.phase, S.now) === 'red') violate('red');
    }
  }

  // 1b) Chốt CSGT kiểm tra mũ bảo hiểm và điện thoại; người đi đường nhắc nếu thấy đầu trần
  csgtCheck(prev);
  if (!safetyOn() && sp > 20 && player.stun <= 0) S.noHelmT += dt; else if (safetyOn()) S.noHelmT = 0;
  if (S.noHelmT > 8 && S.now - S.helmSaidT > 45){
    const nb = nearestNPC(player.x, player.y, 200);
    if (nb){ S.helmSaidT = S.now; say(nb, fill(pick(linesOf('helmetnpc')))); }
  }

  // 2) Đi vào đường có biển cấm loại xe đang lái (bản 1.1 bước 5: đọc cờ noCar / noBike của đường trên MAP).
  //    Phố Chợ là phố đi bộ (biển P.104 cấm xe máy, P.103a cấm ô tô); bản 1.2 có thêm hẻm cấm ô tô.
  const ban = c.road && (S.veh === 'car' ? c.road.noCar : c.road.noBike) ? c.road : null;
  if (ban){
    if (c.t === 'ped') warn(S.veh === 'car' ? '⛔ ' + ban.name + ' là phố đi bộ, có biển cấm ô tô: lùi ra và đi đường khác' : '⛔ ' + ban.name + ' là phố đi bộ, có biển cấm xe máy: lùi ra và đi đường khác');
    else warn('⛔ ' + ban.name + ' có biển cấm ' + (S.veh === 'car' ? 'ô tô' : 'xe máy') + ': lùi ra và đi đường khác');
    if (sp > 10 && player.stun <= 0 && !S.pedEp && S.now > S.pedCool){ S.pedEp = true; violate('noentry'); }
    if (S.pedEp) S.faultUntil = Math.max(S.faultUntil, S.now + 1);
  } else if (S.pedEp){ S.pedEp = false; S.pedCool = S.now + 4; }

  // 3) Vạch giữa đường (bản 1.1 bước 5: theo hướng đường c.dir, lệch ngang c.lat và MAP.lineAt, đường góc bất kỳ)
  //    Vạch liền: sang phần đường ngược chiều là bị phạt ngay.
  //    Vạch đứt: được cắt qua để rẽ, vượt, vào ô đỗ; chạy lâu bên phần đường ngược chiều mới bị phạt.
  //    Phố một chiều: không có phần đường ngược chiều, mà đi ngược hướng của phố là lỗi đi ngược chiều (wrongway).
  let wrong = false, zone = 'broken', against = false;
  const rd = c.road && c.road.veh && (c.t === 'h' || c.t === 'v' || c.t === 'road') ? c.road : null;
  if (rd && sp > 15 && player.stun <= 0){   // bị dội ngược sau va chạm thì không tính
    const ps = c.lat != null ? c : roadPos(rd, player.x, player.y);
    const along = mx*ps.dir.x + my*ps.dir.y;
    if (rd.oneway) against = along < -0.6;
    else {
      if ((along > 0.6 && ps.lat < -3) || (along < -0.6 && ps.lat > 3)) wrong = true;
      zone = MAP.lineAt(rd, ps.s);
    }
  }
  if (against){
    S.wwT += dt;
    if (S.wwT > 0.6 && !S.wwEp){ S.wwEp = true; violate('wrongway'); }
    if (S.wwEp) S.faultUntil = Math.max(S.faultUntil, S.now + 1);
  } else { S.wwT = 0; if (!rd || !rd.oneway) S.wwEp = false; }   // mỗi lần vào phố một chiều chỉ phạt một lần
  if (wrong){
    S.wrongT += dt; S.okT = 0;
    if (zone === 'solid'){
      S.solidT += dt;
      if (S.solidT > 0.3 && !S.sideEp){ S.sideEp = true; violate('line'); }
    } else {
      S.solidT = 0;
      if (S.wrongT > 3.5 && !S.sideEp){ S.sideEp = true; violate('lane'); }
      else if (S.wrongT > 1.2 && !S.sideEp) warn('⚠️ Bạn đang ở phần đường ngược chiều. Vạch đứt chỉ để vượt hoặc rẽ, xong phải về làn ngay.');
    }
    if (S.sideEp) S.faultUntil = Math.max(S.faultUntil, S.now + 1);
  } else {
    S.okT += dt; S.solidT = 0;
    if (S.okT > 1.2){ S.wrongT = 0; S.sideEp = false; }
  }

  // 4) Vòng xuyến: nhường xe bên trái khi vào, và không đi ngược chiều vòng (bản 1.1 bước 5: xét mọi vòng xuyến của MAP)
  for (const rg of MAP.rings){
    const pr = Math.hypot(prev.x - rg.x, prev.y - rg.y), cr = Math.hypot(player.x - rg.x, player.y - rg.y);
    if (pr > rg.rOut && cr <= rg.rOut && sp > 15){
      const th = Math.atan2(player.y - rg.y, player.x - rg.x);
      const other = ringBusy(th, player, 12, rg);
      if (other && Math.hypot(other.x - player.x, other.y - player.y) < 110) violate('ring', 'ring', other);
    }
  }
  const rgc = c.t === 'ring' ? MAP.ringOf(c.node) : null;
  if (rgc && sp > 15 && player.stun <= 0){
    const rx = player.x - rgc.x, ry = player.y - rgc.y, r = Math.hypot(rx, ry) || 1;
    const tang = (rx * my - ry * mx) / r; // > 0: đi theo chiều kim đồng hồ (sai)
    if (tang > 0.45){ S.ringWrongT += dt; } else S.ringWrongT = Math.max(0, S.ringWrongT - dt);
    if (S.ringWrongT > 0.6){
      if (!S.ringEp){ S.ringEp = true; violate('lane', 'ringwrong'); }
      S.faultUntil = Math.max(S.faultUntil, S.now + 1);
    }
  } else if (c.t !== 'ring'){ S.ringWrongT = 0; S.ringEp = false; }

  // 5) Dừng giữa đường làm người khác phải chờ: chỉ nhắc nhẹ, chưa phạt
  const onRoad = c.t === 'h' || c.t === 'v' || c.t === 'road' || c.t === 'junction' || c.t === 'ring';
  if (onRoad && sp < 3 && player.stun <= 0 && !reasonToStop()) S.stopT += dt; else S.stopT = 0;
  if (S.stopT > 4 && S.now - S.stopSaidT > 20){
    const blocked = npcs.find(n => !n.hidden && n.blockedBy === player && n.waitT > 1.5);
    if (blocked){ S.stopSaidT = S.now; say(blocked, fill(pick(LINES.stopping))); cultAdd(CULT.stopblock, 'dừng giữa đường làm người khác chờ'); }
  }

  // 5b) Tốc độ giữa hai ngã tư: chỉ NHẮC NHỞ, không phạt và không làm mất "chuyến sạch" (quyết định ngày 14/11/2026).
  //     Việc phạt nằm ở camera tại vạch dừng ngã tư có đèn (mục 1). Vượt từ 5 km/h trở lên liên tục 3 giây thì NPC nhắc một lần mỗi đoạn.
  //     Đoạn đường và giới hạn lấy từ MAP.speedInfo; đoạn có trẻ em (đường khai báo child: true) dùng câu nhắc riêng.
  { const si = MAP.speedInfo(c);
    if (si){
      if (si.id !== S.spdSec){ S.spdSec = si.id; S.spdSaid = false; S.spdT = 0; S.spdMax = 0; }
      S.spdLimit = si.limit; S.spdChild = si.child;
    }
    const onRd = si || c.t === 'junction' || c.t === 'ring';
    const over = sp / 3 - S.spdLimit;
    if (onRd && over >= 5 && player.stun <= 0 && !S.spdSaid){
      S.spdT += dt; S.spdMax = Math.max(S.spdMax, over);
      if (S.spdT >= 3){
        S.spdSaid = true;
        say(nearestNPC(player.x, player.y, 280) || {name:'Loa phường', follow:true}, fill(pick(S.spdChild ? LINES.speedwarnschool : LINES.speedwarn)));
      }
    } else if (over < 5){ S.spdT = 0; S.spdMax = 0; }
  }

  // 6) Xi-nhan. Chỉ bắt khi RẼ Ở NGÃ TƯ (một lượt rẽ đi qua nút giao và quay xe quá khoảng 50 độ) hoặc QUAY ĐẦU (quá khoảng 137 độ).
  //    Cắt vạch đứt để vượt xe không tính (đó là lỗi khác). Trợ lái chỉ nắn nhẹ trên đường thẳng nên không bị tính là rẽ.
  //    Phải bật đúng bên và bật TRƯỚC khi bắt đầu rẽ (cho phép trễ 0,25 giây).
  const sigZone = (c.t === 'junction' || c.t === 'h' || c.t === 'v' || c.t === 'road');
  if (!sigZone){ S.sigAcc = 0; S.sigStraightT = 0; S.sigEp = false; S.turnBegan = false; S.sigInJ = false; }
  else if (sp > 8 && player.stun <= 0){
    if (c.t === 'junction') S.sigInJ = true;   // lượt rẽ này đi qua nút giao
    const dth = normA(player.a - prev.a), rate = Math.abs(dth) / Math.max(dt, 1e-4);
    S.sigAcc += dth;
    if (rate > 0.3){
      S.sigStraightT = 0;
      if (!S.turnBegan){ S.turnBegan = true; S.turnStartT = S.now; }
    } else {
      S.sigStraightT += dt;
      if (S.sigStraightT > 1.2){ S.sigAcc = 0; S.sigEp = false; S.turnBegan = false; S.sigInJ = false; }
    }
    const need = Math.sign(S.sigAcc), thr = S.sigInJ ? 0.9 : 2.4;
    if (!S.sigEp && Math.abs(S.sigAcc) >= thr){
      S.sigEp = true;
      if (!(S.turn === need && S.sigOnT <= S.turnStartT + 0.25)) violate('signal');
    }
    // xi-nhan còn bật mà cứ đi thẳng lâu: NPC nhắc, không phạt
    if (S.turn !== 0 && rate <= 0.3 && sp > 10){
      S.sigRunT += dt;
      if (S.sigRunT > 10 && S.now - S.sigOffSaidT > 30){
        S.sigOffSaidT = S.now; S.sigRunT = 0;
        say(nearestNPC(player.x, player.y, 280) || {name:'Loa phường', follow:true}, fill(pick(LINES.signaloff)));
        cultAdd(CULT.sigoff, 'quên tắt xi-nhan');
      }
    } else if (rate > 0.3) S.sigRunT = 0;
  }

  // Đỗ trong ô P mà đầu xe ngược chiều đi của làn: chỉ nhắc (mỗi lần vào ô nhắc một lần)
  if (c.t === 'bay' && sp < 12){
    const d = c.bay.dir;
    if (Math.cos(player.a)*d.x + Math.sin(player.a)*d.y < -0.5 && S.parkDirBay !== c.bay){
      S.parkDirBay = c.bay; if (lawOf('parkdir').remind) remind('parkdir'); else violate('parkdir');
    }
  } else if (c.t !== 'bay') S.parkDirBay = null;

  // Giao hàng: đỗ trong ô P của điểm giao và dừng lại
  const t = S.trip;
  if (t && c.t === 'bay' && c.bay === t.dest.bay && sp < 12) arrive();
}

// Ai bị ảnh hưởng (kẹt xe vì người chơi) thì được đền
function updJam(dt){
  S.jamTick += dt;
  if (S.jamTick < 0.5) return;
  S.jamTick = 0;
  if (S.now >= S.faultUntil) return;
  for (const n of npcs){
    if (n.hidden || n.v > 8 || n.affEp === S.epId) continue;
    if (chainRoot(n) !== player) continue;
    n.affEp = S.epId; S.epAffected++;
    S.stats.affected = (S.stats.affected || 0) + 1;
    compensate(n, n.kind === 'bus' ? 100000 : 50000, 'đền kẹt xe');
    if (S.epAffected <= 3) cultAdd(CULT.jam, 'làm kẹt xe');
    if (S.epAffected >= 3 && !S.epJamSaid){ S.epJamSaid = true; say(n, fill(pick(LINES.jam))); }
  }
}

function step(dt){
  if (S.paused) return;
  S.now += dt;
  for (const n of npcs) updNPC(n, dt);
  for (const p of peds) updPed(p, dt);
  updPlayer(dt);
  updCall(dt);
  updJam(dt);
  if (S.turn !== 0){   // đèn xi-nhan nháy 0,7 giây một nhịp, mỗi lần đổi trạng thái có một tiếng tích/tắc
    S.blinkT += dt;
    const on = (S.blinkT % 0.7) < 0.35;
    if (on !== S.blinkOn){ S.blinkOn = on; SND.tick(on); }
  } else S.blinkOn = false;
  S.routeT -= dt;
  if (S.routeT <= 0){ S.routeT = 0.1; S.route = computeRoute(); }
  if (S.bubble){
    const b = S.bubble;
    if (b.shown < b.text.length){
      const from = Math.floor(b.shown);
      b.shown = Math.min(b.text.length, b.shown + dt * b.voice.nhanh);
      const to = Math.floor(b.shown);
      // mỗi khi bắt đầu một tiếng mới (sau dấu cách) thì bíp một tiếng
      for (let i = from; i < to; i++){
        if (/\S/.test(b.text[i]) && (i === 0 || /\s/.test(b.text[i-1]))){
          const word = b.text.slice(i).split(/\s/)[0].replace(/[.,!?…:;"“”()]/g, '');
          if (word) SND.npcSyllable(b.voice, word);
        }
      }
      $('bubText').textContent = b.text.slice(0, to);
    }
    b.t -= dt; if (b.t <= 0){ S.bubble = null; bubEl.style.display = 'none'; }
  }
  for (const f of S.floats){ f.t -= dt; f.rise = (f.rise || 0) + 14 * dt; }
  S.floats = S.floats.filter(f => f.t > 0);
  if (S.flash > 0) S.flash -= dt;
  if (S.warnT > 0) S.warnT -= dt;
  if (S.lawT > 0){ S.lawT -= dt; if (S.lawT <= 0) lawEl.style.display = 'none'; }
}

/* =========================================================
   11. VẼ
   ========================================================= */
const canvas = $('game'), stage = $('stage'), mini = $('mini');
const ctx = canvas.getContext('2d'), mctx = mini.getContext('2d');
let VW = 800, VH = 600, DPR = 1, RES = 1, CW = 800, CH = 600, zoom = 1, camX = START.x, camY = START.y, camA = START.a, ancX = 400, ancY = 300;
let isTouch = false;
// Ba kiểu nhìn: 'nav' dẫn đường (nghiêng 57°), 'bike' sau tay lái (thấp, sát xe, có ghi đông), 'map' từ trên xuống
const TILT = 57, TILT_BIKE = 75;
const tilted = () => S.view !== 'map';
function resize(){
  DPR = window.devicePixelRatio || 1;
  VW = window.innerWidth || 800; VH = window.innerHeight || 600;
  const nav = tilted(), bike = S.view === 'bike';
  const tilt = bike ? TILT_BIKE : TILT, persp = Math.round(VH * (bike ? 0.9 : 1.3)), originY = bike ? 0.46 : 0.7;
  if (nav){
    CW = Math.round(VW * 2.4); CH = Math.round(VH * (bike ? 2.6 : 2.0));
    zoom = clamp(VW / 600, 1.7, 2.2) * (bike ? 1.9 : 1);
    // góc nhìn sau tay lái: canvas cao hơn nên giảm bớt độ nét cho nhẹ máy (vật ở gần vốn đã to)
    RES = clamp(Math.sqrt((bike ? 2.2e6 : 3e6) / (CW * CH)), bike ? 0.55 : 0.7, Math.min(DPR, 2));
    ancX = CW / 2; ancY = CH - VH * (isTouch ? 0.33 : 0.2);
    if (bike){
      // đặt xe của người chơi đúng dưới đồng hồ trên ghi đông: tìm khoảng cách d trên canvas sao cho điểm đó chiếu lên màn hình ở độ cao mong muốn
      // ô tô trên điện thoại: bảng đồng hồ nhỏ nằm phía TRÊN hàng nút nên xe đặt cao hơn nó, để thấy làn phía trước (bản 0.12.4)
      const want = isTouch && S.veh === 'car' ? VH - 300 : VH - (isTouch ? 92 : 0) - Math.min(560, VW) * 0.14;
      const th = tilt * Math.PI / 180, oy = VH * originY;
      const scr = d => oy + (VH - d * Math.cos(th) - oy) * persp / (persp + d * Math.sin(th));
      let lo = 0, hi = CH;
      for (let i = 0; i < 30; i++){ const m = (lo + hi) / 2; if (scr(m) > want) lo = m; else hi = m; }
      ancY = CH - (lo + hi) / 2;
    }
  } else {
    CW = VW; CH = VH; zoom = clamp(Math.min(VW / 660, VH / 560), 0.72, 1.6);
    RES = Math.min(DPR, 2); ancX = VW / 2; ancY = VH / 2;
  }
  canvas.width = Math.round(CW * RES); canvas.height = Math.round(CH * RES);
  const st = canvas.style;
  st.width = CW + 'px'; st.height = CH + 'px'; st.left = Math.round((VW - CW) / 2) + 'px'; st.top = (VH - CH) + 'px';
  st.transform = nav ? 'rotateX(' + tilt + 'deg)' : 'none';
  stage.style.perspective = nav ? persp + 'px' : 'none';
  document.body.classList.toggle('bike', bike);
  stage.style.perspectiveOrigin = '50% ' + Math.round(originY * 100) + '%';
  mini.width = Math.round(180 * Math.min(DPR, 2)); mini.height = Math.round(135 * Math.min(DPR, 2));
  // nút hiện kiểu nhìn sẽ chuyển sang khi bấm
  $('viewBtn').innerHTML = S.view === 'nav' ? (S.veh === 'car' ? '🚗<span class="lbl"> Sau vô lăng</span>' : '🏍️<span class="lbl"> Sau tay lái</span>') : bike ? '🗺️<span class="lbl"> Bản đồ</span>' : '🧭<span class="lbl"> Dẫn đường</span>';
}
function rr(c, x, y, w, h, r){
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
// Vẽ một vật "đứng thẳng" trên màn hình tại điểm (x, y) của bản đồ: biển báo, cột đèn, chữ
function up(x, y, fn){
  ctx.save(); ctx.translate(x, y); ctx.rotate(camA + Math.PI/2);
  if (tilted()) ctx.scale(1, S.view === 'bike' ? 2.2 : 1.35);
  fn(); ctx.restore();
}
function label(x, y, text, opt){
  opt = opt || {};
  if (tilted() && Math.hypot(x - player.x, y - player.y) > (S.view === 'bike' ? 420 : 620)) return;   // quá xa thì chữ nhỏ không đọc được, bỏ qua cho nhẹ máy
  const fs = (opt.size || 13) / zoom;
  up(x, y, () => {
    ctx.font = (opt.bold ? '700 ' : '600 ') + fs + 'px "Segoe UI", Roboto, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + fs * 1.1, h = fs * 1.7;
    if (opt.bg !== false){ ctx.fillStyle = opt.bg || 'rgba(255,250,242,.92)'; rr(ctx, -w/2, -h/2, w, h, h/2.4); ctx.fill(); }
    ctx.fillStyle = opt.color || '#2b2a33'; ctx.fillText(text, 0, fs * 0.06);
  });
}

function drawGroundOld(){
  ctx.fillStyle = '#e9e1d3'; ctx.fillRect(0, 0, W, H);
  for (const b of BLOCKS){ ctx.fillStyle = '#cfe6c4'; ctx.fillRect(b.x1 + SIDE, b.y1 + SIDE, b.x2 - b.x1 - 2*SIDE, b.y2 - b.y1 - 2*SIDE); }
  // đường
  ctx.fillStyle = '#5b6170';
  for (const h of HR) ctx.fillRect(-EXT, h.y - HALF, W + 2*EXT, HALF*2);
  for (const v of VR) ctx.fillRect(v.x - HALF, -EXT, HALF*2, H + 2*EXT);
  ctx.beginPath(); ctx.arc(RB.x, RB.y, RB.rOut, 0, Math.PI*2); ctx.fill();
  // bo cong góc vỉa hè: phủ màu đường vào góc vuông rồi vẽ lại cung vỉa hè
  for (const c of CORNERS){
    ctx.fillStyle = '#5b6170';
    ctx.fillRect(Math.min(c.ex, c.ex + c.dx*CURB), Math.min(c.ey, c.ey + c.dy*CURB), CURB, CURB);
    ctx.fillStyle = '#e9e1d3';
    ctx.beginPath(); ctx.moveTo(c.cx, c.cy); ctx.arc(c.cx, c.cy, CURB, 0, Math.PI*2); ctx.fill();
  }
  // Phố Chợ: phố đi bộ lát gạch (không phải lòng đường cho xe)
  { const y0 = OW.y1 + HALF, y1 = OW.y2 - HALF;
    ctx.fillStyle = '#e3d2ad'; ctx.fillRect(OW.x - OW.half, y0, OW.half*2, y1 - y0);
    ctx.strokeStyle = 'rgba(160,130,90,.45)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = y0; y <= y1; y += 14){ ctx.moveTo(OW.x - OW.half, y); ctx.lineTo(OW.x + OW.half, y); }
    for (let x = OW.x - OW.half + 11; x < OW.x + OW.half; x += 11){ ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    ctx.stroke();
    ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath();   // vạch đỏ đứt ở hai đầu phố
    ctx.moveTo(OW.x - OW.half, y0); ctx.lineTo(OW.x + OW.half, y0); ctx.moveTo(OW.x - OW.half, y1); ctx.lineTo(OW.x + OW.half, y1);
    ctx.stroke(); ctx.setLineDash([]); }
  // ô đỗ xe
  for (const b of BAYS){
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2); ctx.setLineDash([]);
    ctx.save(); ctx.translate(b.cx, b.cy); ctx.rotate(Math.atan2(b.dir.y, b.dir.x) + Math.PI/2);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('P', 0, 0); ctx.restore();
  }
  // đảo vòng xuyến
  ctx.fillStyle = '#9fd38b'; ctx.beginPath(); ctx.arc(RB.x, RB.y, RB.rIn, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#f2efe6'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(RB.x, RB.y, RB.rIn, 0, Math.PI*2); ctx.stroke();
  for (let i = 0; i < 10; i++){ const a = i/10*Math.PI*2; ctx.fillStyle = ['#ff6b6b','#ffd43b','#ff8fd1'][i % 3];
    ctx.beginPath(); ctx.arc(RB.x + Math.cos(a)*28, RB.y + Math.sin(a)*28, 5, 0, Math.PI*2); ctx.fill(); }
  ctx.fillStyle = '#2f9e6b'; ctx.beginPath(); ctx.arc(RB.x, RB.y, 12, 0, Math.PI*2); ctx.fill();

  // vạch vàng giữa đường: liền gần nút giao, đứt ở giữa đoạn
  ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 3;
  for (const cl of CENTER_LINES) for (const r of cl.runs){
    ctx.setLineDash(r.type === 'broken' ? [14, 12] : []);
    ctx.beginPath();
    if (cl.axis === 'h'){ ctx.moveTo(r.a, cl.fixed); ctx.lineTo(r.b, cl.fixed); } else { ctx.moveTo(cl.fixed, r.a); ctx.lineTo(cl.fixed, r.b); }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // vạch người đi bộ (trang trí) và vạch dừng nhuộm màu đèn
  for (const L of LIGHTS){
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    for (let i = -3; i <= 3; i++){
      ctx.fillRect(L.x - CW_FAR, L.y + i*11 - 3, 12, 6); ctx.fillRect(L.x + CW_NEAR, L.y + i*11 - 3, 12, 6);
      ctx.fillRect(L.x + i*11 - 3, L.y - CW_FAR, 6, 12); ctx.fillRect(L.x + i*11 - 3, L.y + CW_NEAR, 6, 12);
    }
    const sd = HALF + STOPG;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff'; ctx.beginPath();
    ctx.moveTo(L.x - sd, L.y + 1); ctx.lineTo(L.x - sd, L.y + HALF);
    ctx.moveTo(L.x + sd, L.y - HALF); ctx.lineTo(L.x + sd, L.y - 1); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.beginPath();
    ctx.moveTo(L.x + 1, L.y + sd); ctx.lineTo(L.x + HALF, L.y + sd);
    ctx.moveTo(L.x - HALF, L.y - sd); ctx.lineTo(L.x - 1, L.y - sd); ctx.stroke();
  }
  // vạch người đi bộ qua đường ở hai đầu Phố Chợ (bản 1.0b): các sọc trắng song song với chiều xe chạy như vạch ở ngã tư, xe phải nhường người đang qua
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (const h of HR) for (let i = -3; i <= 3; i++) ctx.fillRect(800 - 14, h.y + i*11 - 3, 28, 6);
  // vạch nhường đường ở cửa vào vòng xuyến
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath();
  ctx.moveTo(1160, RB.y - RB.rOut - 2); ctx.lineTo(1200, RB.y - RB.rOut - 2);
  ctx.moveTo(1200, RB.y + RB.rOut + 2); ctx.lineTo(1240, RB.y + RB.rOut + 2);
  ctx.moveTo(RB.x - RB.rOut - 2, 900); ctx.lineTo(RB.x - RB.rOut - 2, 940);
  ctx.moveTo(RB.x + RB.rOut + 2, 860); ctx.lineTo(RB.x + RB.rOut + 2, 900); ctx.stroke();
  // ranh giới khu chơi thử
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]); ctx.beginPath();
  for (const h of HR){ ctx.moveTo(2, h.y - HALF); ctx.lineTo(2, h.y + HALF); ctx.moveTo(W - 2, h.y - HALF); ctx.lineTo(W - 2, h.y + HALF); }
  for (const v of VR){ ctx.moveTo(v.x - HALF, 2); ctx.lineTo(v.x + HALF, 2); ctx.moveTo(v.x - HALF, H - 2); ctx.lineTo(v.x + HALF, H - 2); }
  ctx.stroke(); ctx.setLineDash([]);
}

/* Nền tĩnh vẽ theo mảnh (bản 1.1, bước 2): veNen() trong js/ve-nen.js vẽ nền từ MAP vào từng mảnh 512 × 512 đơn vị
   một lần (khi mảnh đầu tiên lọt vào tầm nhìn); mỗi khung hình chỉ dán các mảnh gần máy quay.
   NEN.on = false thì quay về bộ vẽ cũ (drawGroundOld, sẽ xoá ở bước 7). */
const NEN = {on: true, size: 512, pad: 3, k: 0, tiles: new Map(), built: 0, frame: 0, keep: 20};
const nenOk = () => NEN.on && typeof document.createElement === 'function';
// k: số điểm ảnh của mảnh cho mỗi đơn vị bản đồ; đổi nhiều (đổi kiểu nhìn, đổi cỡ màn hình) thì vẽ lại mảnh
function nenSetScale(k){
  k = clamp(k, 0.6, 2);
  if (!NEN.k || k > NEN.k * 1.3 || k < NEN.k * 0.6){ NEN.k = k; NEN.tiles.clear(); }
}
function nenTile(i, j){
  const key = i + ',' + j; let t = NEN.tiles.get(key); if (t) return t;
  const P = NEN.size + 2*NEN.pad, n = Math.ceil(P * NEN.k), c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), x0 = -EXT + i*NEN.size - NEN.pad, y0 = -EXT + j*NEN.size - NEN.pad, kk = n / P;
  g.setTransform(kk, 0, 0, kk, -x0*kk, -y0*kk);
  veNen(g, MAP, {W, H, EXT, SIDE, blocks: BLOCKS});
  t = {c, x0, y0, P, f: NEN.frame}; NEN.tiles.set(key, t); NEN.built++;
  return t;
}
function drawGround(){
  if (!nenOk()) return drawGroundOld();
  nenSetScale(RES * zoom); NEN.frame++;
  const ci = Math.ceil((W + 2*EXT) / NEN.size), cj = Math.ceil((H + 2*EXT) / NEN.size);
  // mảnh nào có hình tròn bao quanh chạm khung vẽ thì dán (đổi toạ độ bản đồ sang toạ độ khung vẽ giống phép biến đổi trong render)
  const ca = Math.cos(-camA - Math.PI/2), sa = Math.sin(-camA - Math.PI/2), R = NEN.size * 0.7072 * zoom;
  for (let j = 0; j < cj; j++) for (let i = 0; i < ci; i++){
    const mx = -EXT + (i + 0.5)*NEN.size - camX, my = -EXT + (j + 0.5)*NEN.size - camY;
    const sx = ancX + zoom*(mx*ca - my*sa), sy = ancY + zoom*(mx*sa + my*ca);
    if (sx < -R || sx > CW + R || sy < -R || sy > CH + R) continue;
    if (tilted() && Math.abs(sx - CW/2) > VW*0.58 + (CW/2 - VW*0.58) * clamp(sy / CH, 0, 1) + R) continue;   // ngoài hình thang nhìn thấy (xem phần cắt ở render)
    const t = nenTile(i, j); t.f = NEN.frame; ctx.drawImage(t.c, t.x0, t.y0, t.P, t.P);
  }
  // giữ tối đa NEN.keep mảnh trong bộ nhớ (điện thoại): bỏ các mảnh lâu chưa dùng
  if (NEN.tiles.size > NEN.keep) for (const [key, t] of NEN.tiles) if (t.f < NEN.frame - 30 && NEN.tiles.size > NEN.keep) NEN.tiles.delete(key);
}

function drawRoute(){
  const r = S.route; if (!r || r.pts.length < 2) return;
  const pts = [{x: player.x, y: player.y}].concat(r.pts.slice(1));
  // vạch chấm mảnh, trong suốt: chỉ hướng mà không che làn đường
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(52,125,246,.45)'; ctx.lineWidth = 2.6; ctx.setLineDash([2, 9]);
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
  ctx.setLineDash([]);
  // mũi tên nhỏ dọc đường đi, mỗi 55 đơn vị bản đồ
  ctx.strokeStyle = 'rgba(52,125,246,.6)'; ctx.lineWidth = 2.2;
  let acc = 30;
  for (let i = 1; i < pts.length; i++){
    const a = pts[i-1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 0.01) continue;
    const ux = (b.x - a.x)/L, uy = (b.y - a.y)/L;
    while (acc <= L){
      const x = a.x + ux*acc, y = a.y + uy*acc;
      ctx.beginPath(); ctx.moveTo(x - ux*5 - uy*4, y - uy*5 + ux*4); ctx.lineTo(x, y); ctx.lineTo(x - ux*5 + uy*4, y - uy*5 - ux*4); ctx.stroke();
      acc += 55;
    }
    acc -= L;
  }
  ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
}

function drawDest(){
  const t = S.trip; if (!t) return;
  const b = t.dest.bay, k = 0.5 + 0.5*Math.sin(S.now*5);
  ctx.fillStyle = 'rgba(47,200,120,' + (0.25 + 0.3*k) + ')'; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = '#2f9e6b'; ctx.lineWidth = 2.5; ctx.strokeRect(b.x - 1, b.y - 1, b.w + 2, b.h + 2);
}

function drawHouses(){
  const nav = tilted();
  const U = nav ? {x: Math.cos(camA), y: Math.sin(camA)} : {x: 0, y: -1};
  const hgt = S.view === 'bike' ? 20 : nav ? 12 : 5;
  // chỉ vẽ những nhà nằm trong vùng nhìn thấy
  const seen = h => {
    const cx = h.x + h.w/2 - camX, cy = h.y + h.h/2 - camY, R = (h.w + h.h) * 0.5 * zoom;
    if (!nav) return Math.abs(cx) * zoom < VW/2 + R && Math.abs(cy) * zoom < VH/2 + R;
    const f = cx*U.x + cy*U.y, l = Math.abs(cx*U.y - cy*U.x), d = (CH - ancY) + f * zoom;
    if (d < -R || d > CH + R) return false;
    return l * zoom < VW*0.58 + (CW/2 - VW*0.58) * clamp(d / CH, 0, 1) + R;
  };
  const list = HOUSES.filter(seen).sort((a, b) => ((b.x + b.w/2)*U.x + (b.y + b.h/2)*U.y) - ((a.x + a.w/2)*U.x + (a.y + a.h/2)*U.y));
  const NORMALS = [[0,-1],[1,0],[0,1],[-1,0]];
  for (const h of list){
    const hh = h.stall ? hgt * 0.45 : hgt, ox = U.x * hh, oy = U.y * hh;
    const c = [[h.x, h.y], [h.x + h.w, h.y], [h.x + h.w, h.y + h.h], [h.x, h.y + h.h]];
    ctx.fillStyle = h.stall ? '#b9b2a6' : h.dark;
    for (let i = 0; i < 4; i++){
      if (NORMALS[i][0]*U.x + NORMALS[i][1]*U.y >= 0) continue;   // chỉ vẽ mặt tường quay về phía người nhìn
      const p = c[i], q = c[(i+1) % 4];
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.lineTo(q[0] + ox, q[1] + oy); ctx.lineTo(p[0] + ox, p[1] + oy); ctx.closePath(); ctx.fill();
    }
    if (h.stall){
      const cols = [['#ff6b6b','#fff'],['#4dabf7','#fff'],['#ffd43b','#fff'],['#69db7c','#fff']][h.awn];
      ctx.fillStyle = cols[1]; ctx.fillRect(h.x + ox, h.y + oy, h.w, h.h);
      ctx.fillStyle = cols[0]; for (let i = 0; i < 6; i += 2) ctx.fillRect(h.x + ox + i*h.w/6, h.y + oy, h.w/6, h.h);
    } else {
      ctx.fillStyle = h.color; ctx.fillRect(h.x + ox, h.y + oy, h.w, h.h);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(h.x + ox + 6, h.y + oy + 6, h.w - 12, 5);
    }
  }
}

function drawBike(o, body, helmet, glow, sig){
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
  if (glow){ ctx.fillStyle = 'rgba(52,125,246,.25)'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI*2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,.18)'; rr(ctx, -8, -3, 18, 8, 3); ctx.fill();
  ctx.fillStyle = '#2b2a33'; rr(ctx, -9, -1.5, 18, 3, 1.5); ctx.fill();
  ctx.fillStyle = body; rr(ctx, -6, -4, 12, 8, 3); ctx.fill();
  ctx.fillStyle = helmet; ctx.beginPath(); ctx.arc(-1, 0, 4, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff6cc'; ctx.fillRect(8, -1.5, 2, 3);
  if (sig && S.blinkOn){   // đèn xi-nhan phía bên đang bật (bên phải của xe là hướng +y)
    const y = sig * 6;
    ctx.fillStyle = 'rgba(255,170,0,.35)'; ctx.beginPath(); ctx.arc(7, y, 5, 0, Math.PI*2); ctx.arc(-9, y, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffae00'; ctx.beginPath(); ctx.arc(7, y, 2.2, 0, Math.PI*2); ctx.arc(-9, y, 2.2, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
// Ô tô con của người chơi nhìn từ trên xuống: thân, kính trước/sau, gương, đèn; đèn xi-nhan ở bốn góc
function drawCar(o, glow, sig){
  const L = o.len, Wd = o.w, hl = L/2, hw = Wd/2;
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
  if (glow){ ctx.fillStyle = 'rgba(52,125,246,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, hl + 3, hw + 3, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, 0, hl + 3, hw + 3, 0, 0, Math.PI*2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,.2)'; rr(ctx, -hl + 1.5, -hw + 1.5, L, Wd, 3); ctx.fill();
  ctx.fillStyle = '#ff8a3d'; rr(ctx, -hl, -hw, L, Wd, 3); ctx.fill();
  ctx.fillStyle = '#c0703a'; ctx.fillRect(-hl + 1, -hw - 1.2, 2, 1.2); ctx.fillRect(-hl + 1, hw, 2, 1.2);
  ctx.fillStyle = '#2b2a33'; ctx.fillRect(hl - 7.5, -hw - 1.3, 1.6, 1.3); ctx.fillRect(hl - 7.5, hw, 1.6, 1.3);   // gương
  ctx.fillStyle = '#9fd0f0'; rr(ctx, hl - 7, -hw + 1.2, 3.2, Wd - 2.4, 1); ctx.fill();   // kính trước
  ctx.fillStyle = '#ffb47a'; rr(ctx, -hl + 5, -hw + 1.2, L - 12.5, Wd - 2.4, 1.5); ctx.fill();   // nóc xe
  ctx.fillStyle = '#9fd0f0'; rr(ctx, -hl + 2.2, -hw + 1.4, 2.4, Wd - 2.8, 1); ctx.fill();   // kính sau
  ctx.fillStyle = '#fff6cc'; ctx.fillRect(hl - 1, -hw + 0.8, 1, 2); ctx.fillRect(hl - 1, hw - 2.8, 1, 2);
  ctx.fillStyle = '#e5484d'; ctx.fillRect(-hl, -hw + 0.8, 1, 2); ctx.fillRect(-hl, hw - 2.8, 1, 2);
  if (sig && S.blinkOn){
    const y = sig * hw;
    ctx.fillStyle = 'rgba(255,170,0,.35)'; ctx.beginPath(); ctx.arc(hl - 1, y, 4.5, 0, Math.PI*2); ctx.arc(-hl + 1, y, 4.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffae00'; ctx.beginPath(); ctx.arc(hl - 1, y, 1.8, 0, Math.PI*2); ctx.arc(-hl + 1, y, 1.8, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
function drawBus(o){
  ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; rr(ctx, -21, -6, 46, 16, 4); ctx.fill();
  ctx.fillStyle = o.color; rr(ctx, -23, -8, 46, 16, 4); ctx.fill();
  ctx.fillStyle = '#7fb3d5'; for (let i = 0; i < 5; i++) ctx.fillRect(-18 + i*8, -6, 5, 12);
  ctx.fillStyle = '#fff6cc'; ctx.fillRect(21, -6, 2, 3); ctx.fillRect(21, 3, 2, 3);
  ctx.restore();
}
function drawAgents(){
  for (const p of peds){
    ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.arc(p.x + 1, p.y + 2, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3a2e2a'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI*2); ctx.fill();
  }
  for (const n of npcs){
    if (n.hidden) continue;
    if (n.ghostP > 0 || n.ghostT > 0) ctx.globalAlpha = 0.55;
    if (n.kind === 'bus') drawBus(n); else drawBike(n, n.color, n.helmet, false);
    ctx.globalAlpha = 1;
  }
  if (S.veh === 'car'){ if (S.view !== 'bike') drawCar(player, true, S.turn); return; }   // góc sau vô lăng: xe của mình là vô lăng và bảng đồng hồ ở mép dưới màn hình
  if (S.view === 'bike') return;   // góc nhìn sau tay lái: xe của mình là ghi đông ở mép dưới màn hình
  drawBike(player, '#ff8a3d', S.helmet ? '#ffffff' : '#3a2e2a', true, S.turn);   // đầu trần thì vẽ tóc sẫm thay vì mũ trắng
  ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.a); ctx.fillStyle = '#c0703a'; ctx.fillRect(-11, -4, 6, 8); ctx.restore();
}

function signDisc(x, y, fillC, draw){
  up(x, y, () => {
    ctx.fillStyle = '#555'; ctx.fillRect(-1, -14, 2, 14);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -21, 8.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = fillC; ctx.beginPath(); ctx.arc(0, -21, 7, 0, Math.PI*2); ctx.fill();
    draw();
  });
}
function signSquare(x, y, draw){
  up(x, y, () => {
    ctx.fillStyle = '#555'; ctx.fillRect(-1, -13, 2, 13);
    ctx.fillStyle = '#fff'; rr(ctx, -8, -29, 16, 16, 3); ctx.fill();
    ctx.fillStyle = '#2f6fde'; rr(ctx, -7, -28, 14, 14, 2.5); ctx.fill();
    draw();
  });
}
const ARROW = {trai: '←', thang: '↑', phai: '→'};
function drawSignboards(){
  for (const sb of SIGNBOARDS){
    if (tilted() && Math.hypot(sb.x - player.x, sb.y - player.y) > (S.view === 'bike' ? 420 : 560)) continue;   // xa quá thì chữ không đọc được
    // biển nhỏ lại (bản 0.12.1) và mờ đi khi xe tới gần, để không che hướng đi
    const near = Math.hypot(sb.x - player.x, sb.y - player.y), alpha = near < 90 ? 0.35 : near < 180 ? 0.35 + (near - 90) / 90 * 0.6 : 0.95;
    up(sb.x, sb.y, () => {
      ctx.globalAlpha = alpha; ctx.scale(0.62, 0.62);
      const rh = 9.2, w = 66, h = sb.rows.length * rh + 5, top = -14 - h;
      ctx.fillStyle = '#555'; ctx.fillRect(-1, -14, 2, 14);
      ctx.fillStyle = '#fff'; rr(ctx, -w/2 - 1, top - 1, w + 2, h + 2, 3.5); ctx.fill();
      ctx.fillStyle = '#1b6fb8'; rr(ctx, -w/2, top, w, h, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 6.4px "Segoe UI", Roboto, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      sb.rows.forEach((r, i) => {
        const y = top + 2.5 + rh * (i + 0.5);
        ctx.fillText(ARROW[r.k], -w/2 + 3, y); ctx.fillText(r.name, -w/2 + 13, y);
      });
      ctx.globalAlpha = 1;
    });
  }
}
// Chốt CSGT: vạch kiểm tra cam dạng đứt ngang đường, vài cọc tiêu, chòi và chú CSGT bên vỉa hè
function drawCSGT(){
  for (const p of CSGT){
    if (tilted() && Math.hypot(p.x - player.x, p.y - player.y) > (S.view === 'bike' ? 520 : 700)) continue;
    if (p.off) continue;
    ctx.save(); ctx.strokeStyle = 'rgba(255,140,0,.75)'; ctx.lineWidth = 2.2; ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.moveTo(p.x - p.n.x*p.half, p.y - p.n.y*p.half); ctx.lineTo(p.x + p.n.x*p.half, p.y + p.n.y*p.half);
    ctx.stroke(); ctx.restore();
    for (const k of [6, 16, 26]){   // cọc tiêu dọc vạch kiểm tra, sát mép đường phía chòi
      const cx = p.x + p.n.x*(p.half - k), cy = p.y + p.n.y*(p.half - k);
      up(cx, cy, () => { ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(4, 0); ctx.lineTo(-4, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(-2.2, -5, 4.4, 1.8); });
    }
    up(p.cabinPt.x, p.cabinPt.y, () => {
      ctx.fillStyle = '#2f6fde'; rr(ctx, -9, -26, 18, 22, 2); ctx.fill();
      ctx.fillStyle = '#ffd43b'; rr(ctx, -11, -30, 22, 5, 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-9, -17, 18, 2.4);
      ctx.fillStyle = '#d9d36a'; rr(ctx, 11, -12, 6, 12, 2); ctx.fill();   // chú CSGT mặc áo vàng
      ctx.fillStyle = '#f1c9a5'; ctx.beginPath(); ctx.arc(14, -15, 3, 0, Math.PI*2); ctx.fill();
    });
    label(p.cabinPt.x, p.cabinPt.y + 26, '👮 CHỐT CSGT', {size: 12, bold: true, bg: '#2f6fde', color: '#fff'});
  }
}
function drawUprights(){
  drawCSGT();
  // cột đèn tín hiệu, mỗi hướng đi vào có một cột bên tay phải người lái
  for (const L of LIGHTS){
    const posts = [
      {x: L.x - HALF - 10, y: L.y + HALF + 10, axis:'EW'}, {x: L.x + HALF + 10, y: L.y - HALF - 10, axis:'EW'},
      {x: L.x + HALF + 10, y: L.y + HALF + 10, axis:'NS'}, {x: L.x - HALF - 10, y: L.y - HALF - 10, axis:'NS'}
    ];
    for (const p of posts){
      const st = lightOf(L, p.axis, S.now);
      up(p.x, p.y, () => {
        ctx.fillStyle = '#555'; ctx.fillRect(-1, -14, 2, 14);
        ctx.fillStyle = '#2b2a33'; rr(ctx, -5, -40, 10, 27, 3); ctx.fill();
        // camera phạt nguội gắn trên đỉnh cột đèn
        ctx.fillStyle = '#3a4a5c'; rr(ctx, -6, -47, 12, 6, 2); ctx.fill();
        ctx.fillStyle = '#9bd1ff'; ctx.beginPath(); ctx.arc(0, -44, 1.8, 0, Math.PI*2); ctx.fill();
        ['red','yellow','green'].forEach((c, i) => {
          const on = st === c, cy = -35 + i*8.2;
          if (on){ ctx.fillStyle = ({red:'rgba(255,77,79,.3)', yellow:'rgba(255,197,61,.3)', green:'rgba(82,196,26,.3)'})[c];
            ctx.beginPath(); ctx.arc(0, cy, 8, 0, Math.PI*2); ctx.fill(); }
          ctx.fillStyle = on ? ({red:'#ff4d4f', yellow:'#ffc53d', green:'#5ad12c'})[c] : '#4a4955';
          ctx.beginPath(); ctx.arc(0, cy, 3.2, 0, Math.PI*2); ctx.fill();
        });
      });
    }
  }
  // Phố Chợ là phố đi bộ: ở hai đầu có biển P.104 "Cấm xe máy" (bên trái) và P.103a "Cấm ô tô" (bên phải)
  const banDisc = (x, y, icon) => signDisc(x, y, '#e5484d', () => {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -21, 5.2, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.strokeStyle = '#222'; icon();
    ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4, -25); ctx.lineTo(4, -17); ctx.stroke();   // gạch chéo đỏ
  });
  const iconRider = () => {   // người lái xe máy
    ctx.beginPath(); ctx.arc(0.4, -24.2, 1.2, 0, Math.PI*2); ctx.fill();
    ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(0.2, -22.9); ctx.lineTo(-0.6, -20.6); ctx.moveTo(0.3, -22.2); ctx.lineTo(2.2, -21); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(-2.8, -18.8, 1.4, 0, Math.PI*2); ctx.moveTo(4.2, -18.8); ctx.arc(2.8, -18.8, 1.4, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.8, -18.8); ctx.lineTo(-1, -20.6); ctx.lineTo(2.2, -20.6); ctx.lineTo(2.8, -18.8); ctx.stroke();
  };
  const iconCar = () => {   // ô tô nhìn nghiêng
    rr(ctx, -4, -21.2, 8, 3.2, 1); ctx.fill(); rr(ctx, -2.4, -23.4, 4.6, 2.6, 1); ctx.fill();
    ctx.beginPath(); ctx.arc(-2.3, -17.9, 1, 0, Math.PI*2); ctx.arc(2.3, -17.9, 1, 0, Math.PI*2); ctx.fill();
  };
  for (const y of [OW.y1 + HALF + 10, OW.y2 - HALF - 10]){
    banDisc(OW.x - 33, y, iconRider); banDisc(OW.x + 33, y, iconCar);
    label(OW.x, y + (y < 600 ? 22 : -22), 'PHỐ ĐI BỘ', {size: 12, bold: true, bg: '#1b6fb8', color: '#fff'});
  }
  // biển hạn chế tốc độ P.127 và biển W.225 "Trẻ em"
  for (const sp of SPEED_SIGNS){
    if (tilted() && Math.hypot(sp.x - player.x, sp.y - player.y) > (S.view === 'bike' ? 420 : 560)) continue;
    if (sp.kind === 'limit'){
      signDisc(sp.x, sp.y, '#e5484d', () => {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -21, 5.6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.font = '800 7.4px "Segoe UI", Roboto, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(sp.v), 0, -20.8);
      });
    } else {
      up(sp.x, sp.y, () => {
        ctx.fillStyle = '#555'; ctx.fillRect(-1, -14, 2, 14);
        ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(10, -15); ctx.lineTo(-10, -15); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(7.4, -17); ctx.lineTo(-7.4, -17); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#222';   // hai em nhỏ
        for (const dx of [-2.6, 2.6]){
          ctx.beginPath(); ctx.arc(dx, -23.2, 1.1, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(dx, -22); ctx.lineTo(dx - 1.5, -18.4); ctx.lineTo(dx + 1.5, -18.4); ctx.closePath(); ctx.fill();
        }
      });
    }
  }
  // biển chỉ dẫn hướng đi trước các ngã tư
  drawSignboards();
  // biển vòng xuyến trước mỗi cửa vào
  for (const [x, y] of [[1150, RB.y - 128], [1250, RB.y + 128], [RB.x - 128, 950], [RB.x + 128, 850]])
    signDisc(x, y, '#2f6fde', () => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++){ const a0 = i*2.09; ctx.beginPath(); ctx.arc(0, -21, 4, a0, a0 + 1.4); ctx.stroke(); } });
  // biển P ở mỗi ô đỗ
  for (const b of BAYS){
    const px = b.w > b.h ? b.x + 6 : (b.side === 'E' ? b.x + b.w + 3 : b.x - 3);
    const py = b.w > b.h ? (b.side === 'S' ? b.y + b.h + 3 : b.y - 3) : b.y + 6;
    signSquare(px, py, () => { ctx.fillStyle = '#fff'; ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('P', 0, -20.5); });
  }
  // tên đường
  const names = [[HR[0].name, 690, 246], [HR[0].name, 1390, 246], [HR[1].name, 620, 954], [HR[1].name, 1420, 846],
    [VR[0].name, 346, 640], [VR[0].name, 454, 140], [VR[1].name, 1146, 560], [VR[1].name, 1254, 1100], [OW.name + ' (đi bộ)', 762, 480]];
  for (const [t, x, y] of names) label(x, y, t, {size: 12, bg: 'rgba(43,42,51,.62)', color: '#fff'});
  label(925, 395, '🛒 CHỢ HOA SỮA', {size: 14, bold: true, color: '#b5482b'});
  for (const h of HR){ label(34, h.y, 'Hết khu chơi thử', {size: 11}); label(W - 34, h.y, 'Hết khu chơi thử', {size: 11}); }
  for (const v of VR){ label(v.x, 22, 'Hết khu chơi thử', {size: 11}); label(v.x, H - 22, 'Hết khu chơi thử', {size: 11}); }
  // tên điểm giao
  const cur = S.trip && S.trip.dest;
  for (const d of DESTS){
    if (Math.hypot(d.lx - player.x, d.ly - player.y) < 42) continue;   // đừng che mất xe của người chơi
    if (d === cur) label(d.lx, d.ly, '📍 ' + d.icon + ' ' + d.name, {size: 14, bold: true, bg: '#2f9e6b', color: '#fff'});
    else label(d.lx, d.ly, d.icon + ' ' + d.name, {size: 12});
  }
  // người bị ảnh hưởng, người đang nói
  const fs = 15 / zoom;
  for (const n of npcs){
    if (n.hidden) continue;
    if (n.affEp === S.epId && S.now < S.faultUntil + 2) up(n.x, n.y, () => { ctx.font = fs + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('😤', 0, -9); });
  }
  const b = S.bubble;
  if (b && b.speaker && b.speaker.x !== undefined && !b.speaker.follow)
    up(b.speaker.x, b.speaker.y, () => { ctx.font = (fs*1.25) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💬', 0, -11); });
  // số tiền bay lên
  for (const f of S.floats) up(f.x, f.y, () => {
    ctx.globalAlpha = clamp(f.t, 0, 1); ctx.font = '700 ' + (14 / zoom) + 'px "Segoe UI", Roboto, sans-serif'; ctx.textAlign = 'center';
    const y = -14 - (f.rise || 0);
    ctx.lineWidth = 3 / zoom; ctx.strokeStyle = '#fff'; ctx.strokeText(f.text, 0, y); ctx.fillStyle = f.color; ctx.fillText(f.text, 0, y);
    ctx.globalAlpha = 1;
  });
}

function drawMini(){
  const c = mctx, mw = mini.width, mh = mini.height, s = mw / W;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#cfe6c4'; c.fillRect(0, 0, mw, mh);
  c.fillStyle = '#7d8290';
  for (const h of HR) c.fillRect(0, (h.y - HALF)*s, mw, HALF*2*s);
  for (const v of VR) c.fillRect((v.x - HALF)*s, 0, HALF*2*s, mh);
  c.fillStyle = '#e3d2ad'; c.fillRect((OW.x - OW.half)*s, (OW.y1 + HALF)*s, OW.half*2*s, (OW.y2 - OW.y1 - 2*HALF)*s); c.fillStyle = '#7d8290';
  c.beginPath(); c.arc(RB.x*s, RB.y*s, RB.rOut*s, 0, Math.PI*2); c.fill();
  const r = S.route;
  if (r && r.pts.length > 1){
    c.strokeStyle = '#347df6'; c.lineWidth = Math.max(2, 26*s); c.lineJoin = 'round'; c.beginPath(); c.moveTo(player.x*s, player.y*s);
    for (let i = 1; i < r.pts.length; i++) c.lineTo(r.pts[i].x*s, r.pts[i].y*s); c.stroke();
  }
  if (S.trip){ const b = S.trip.dest.bay; c.fillStyle = '#2f9e6b'; c.beginPath(); c.arc(b.cx*s, b.cy*s, 36*s + Math.sin(S.now*6)*6*s, 0, Math.PI*2); c.fill(); }
  c.save(); c.translate(player.x*s, player.y*s); c.rotate(player.a);
  c.fillStyle = '#ff8a3d'; c.strokeStyle = '#fff'; c.lineWidth = 8*s;
  c.beginPath(); c.moveTo(52*s, 0); c.lineTo(-34*s, -32*s); c.lineTo(-18*s, 0); c.lineTo(-34*s, 32*s); c.closePath(); c.stroke(); c.fill(); c.restore();
}

function render(dt){
  dt = dt || 0.016;
  const nav = tilted();
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  ctx.save();
  if (nav){ ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(CW, 0); ctx.lineTo(CW/2 + VW*0.58, CH); ctx.lineTo(CW/2 - VW*0.58, CH); ctx.closePath(); ctx.clip(); }
  ctx.fillStyle = '#cfe6c4'; ctx.fillRect(0, 0, CW, CH);
  if (nav){
    camX = player.x; camY = player.y;
    camA = normA(camA + normA(player.a - camA) * Math.min(1, dt * 4.5));
  } else {
    const halfW = VW / 2 / zoom, halfH = VH / 2 / zoom;
    camX += (clamp(player.x, Math.min(halfW, W/2), Math.max(W - halfW, W/2)) - camX) * 0.15;
    camY += (clamp(player.y, Math.min(halfH, H/2), Math.max(H - halfH, H/2)) - camY) * 0.15;
    camA = -Math.PI / 2;
  }
  ctx.translate(ancX, ancY); ctx.scale(zoom, zoom); ctx.rotate(-camA - Math.PI/2); ctx.translate(-camX, -camY);
  drawGround(); drawDest(); drawRoute(); drawHouses(); drawAgents(); drawUprights();
  ctx.setTransform(RES, 0, 0, RES, 0, 0);
  if (nav){
    const g = ctx.createLinearGradient(0, 0, 0, CH * 0.36);
    g.addColorStop(0, 'rgba(223,238,222,1)'); g.addColorStop(0.35, 'rgba(223,238,222,.85)'); g.addColorStop(1, 'rgba(223,238,222,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH * 0.36);
  }
  ctx.restore();
  drawMini(); updHUD();
}

/* =========================================================
   12. GIAO DIỆN
   ========================================================= */
const ICONS = {
  straight: '<path d="M12 21V4M6 10l6-6 6 6"/>',
  left: '<path d="M16 21V11H6M10 7l-4 4 4 4"/>',
  right: '<path d="M8 21V11h10M14 7l4 4-4 4"/>',
  bearleft: '<path d="M14 21v-7L8 8M8 14V8h6"/>',
  bearright: '<path d="M10 21v-7l6-6M10 8h6v6"/>',
  uturn: '<path d="M17 21V10a5 5 0 0 0-10 0v7M3 13l4 4 4-4"/>',
  ring: '<circle cx="12" cy="11" r="4.5"/><path d="M12 21v-5.5M12 6.5V2M9 4.5L12 2l3 2.5"/>',
  park: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 17V7.5h3a2.8 2.8 0 0 1 0 5.6h-3"/>'
};
function meters(px){ return Math.max(0, Math.round(px / 4 / 5) * 5); }
function navText(){
  const r = S.route, t = S.trip;
  if (!r || !t) return {icon:'straight', main:'Đang tìm đường…', sub:''};
  const i = r.instr, m = meters(i.dist), pre = m >= 15 ? m + ' m · ' : '';
  let icon = 'straight', main = '';
  if (S.inBay && classify(player.x, player.y).bay === t.dest.bay){ icon = 'park'; main = 'Dừng hẳn xe để giao hàng'; }
  else if (i.type === 'uturn'){ icon = 'uturn'; main = m >= 15 ? pre + 'Quay đầu xe ở nút giao phía trước (bấm ↩)' : 'Quay đầu xe ở đoạn vạch đứt, khi đường trống (bấm ↩)'; }
  else if (i.type === 'left'){ icon = 'left'; main = pre + 'Rẽ trái vào ' + i.street; }
  else if (i.type === 'right'){ icon = 'right'; main = pre + 'Rẽ phải vào ' + i.street; }
  else if (i.type === 'bearleft'){ icon = 'bearleft'; main = pre + 'Đi chếch trái vào ' + i.street; }
  else if (i.type === 'bearright'){ icon = 'bearright'; main = pre + 'Đi chếch phải vào ' + i.street; }
  else if (i.type === 'straight'){ icon = 'straight'; main = pre + 'Đi thẳng vào ' + i.street; }
  else if (i.type === 'ring'){ icon = 'ring'; main = pre + 'Vào vòng xuyến, ra ở lối thứ ' + i.exitNo + ' (' + i.street + ')'; }
  else if (i.type === 'ringexit'){ icon = 'ring'; main = 'Ra khỏi vòng xuyến vào ' + i.street; }
  else if (m > 25){ icon = 'straight'; main = m + ' m · Đi thẳng, điểm giao ở bên ' + i.side; }
  else { icon = 'park'; main = 'Tấp vào ô P bên ' + i.side + ' rồi dừng lại'; }
  const sub = '📦 ' + t.dest.icon + ' ' + t.dest.name + ' · còn ' + meters(r.remain) + ' m' + (t.clean ? '' : ' · ⚠️ đã vi phạm');
  return {icon, main, sub};
}
let hudCache = {};
function setHTML(id, html){ if (hudCache[id] !== html){ hudCache[id] = html; $(id).innerHTML = html; } }
function updHUD(){
  const n = navText();
  setHTML('navIcon', '<svg viewBox="0 0 24 24">' + ICONS[n.icon] + '</svg>');
  setHTML('navMain', n.main); setHTML('navSub', n.sub);
  setHTML('money', `💰 <b>${fmt(S.money)}</b>${S.money < 0 ? ' (nợ phạt)' : ''}`);
  const mc = 'chip' + (S.money < 0 ? ' neg' : ''); if (hudCache.mc !== mc){ hudCache.mc = mc; $('money').className = mc; }
  setHTML('pts', `🪪<span class="lbl"> GPLX</span> ${VEH[S.veh].lic} <b>${S.pts}/12</b>`);
  { const ck = S.cult + '|' + (S.cult >= 80 ? 2 : S.cult < 40 ? 0 : 1); if (hudCache.cult !== ck){ hudCache.cult = ck; setHTML('cult', `🎭<span class="lbl"> Văn hóa</span> <b>${S.cult}</b>`); $('cult').className = 'chip' + (S.cult >= 80 ? ' good' : S.cult < 40 ? ' near' : ''); } }
  setHTML('streak', `⭐<span class="lbl"> Chuỗi sạch</span> <b>${S.streak}</b>`);
  const kmhF = Math.abs(player.v) / 3, over = kmhF - S.spdLimit;
  setHTML('speed', `${S.veh === 'car' ? '🚗' : '🏍️'} <b>${Math.round(kmhF)}</b> km/h<span class="lim"> · tối đa ${S.spdLimit}</span>${S.veh === 'car' ? (player.v < -1 ? ' · số lùi' : '') : S.sound.bike === 'ga' ? '' : ' · số ' + (S.gear || 1)}`);
  { const sc = 'chip' + (over >= 5 ? ' over' : over > 0 ? ' near' : ''); if (hudCache.sc !== sc){ hudCache.sc = sc; $('speed').className = sc; } }
  // đèn xi-nhan trên thanh thông tin và trên ghi đông
  { const L = S.turn < 0 && S.blinkOn, R = S.turn > 0 && S.blinkOn, sk = (S.turn || 0) + '|' + (S.blinkOn ? 1 : 0);
    if (hudCache.sig !== sk){ hudCache.sig = sk;
      $('sigchip').style.display = S.turn ? 'inline-block' : 'none';
      $('sigL').style.opacity = L ? '1' : '.25'; $('sigR').style.opacity = R ? '1' : '.25';
      $('sigCkL').setAttribute('opacity', L ? '1' : '0'); $('sigCkR').setAttribute('opacity', R ? '1' : '0');
      $('sigCkLCar').setAttribute('opacity', L ? '1' : '0'); $('sigCkRCar').setAttribute('opacity', R ? '1' : '0'); } }
  // mũ bảo hiểm và cuộc gọi: chip trên cùng và hai nút lớn (nút nằm cạnh bản đồ nhỏ)
  { const car = S.veh === 'car', hk = safetyOn() ? '' : car ? '💺 Chưa thắt dây an toàn' : '🪖 Chưa đội mũ';
    if (hudCache.helm !== hk){ hudCache.helm = hk; $('helmchip').style.display = hk ? 'inline-block' : 'none'; $('helmchip').textContent = hk; $('helmBtn').style.display = hk ? 'block' : 'none';
      $('helmBtn').innerHTML = car ? '💺 Thắt dây an toàn <span class="key">(H)</span>' : '🪖 Đội mũ <span class="key">(H)</span>'; } }
  { const uk = (S.ut ? 'u' : '') + (S.inBay ? 'b' : '');
    if (hudCache.ut !== uk){ hudCache.ut = uk; $('utBtn').style.display = S.inBay ? 'none' : 'block'; setHTML('utTxt', S.ut ? '✖ Hủy quay đầu' : '↩️ Quay đầu'); } }
  { const c = S.call, drv = phoneDriving();
    const ck = !c ? '' : c.state === 'ring' ? 'ring' : 'talk' + Math.ceil(c.t) + (drv ? 'd' : 'p');
    if (hudCache.call !== ck){ hudCache.call = ck;
      const el = $('callchip');
      el.style.display = c ? 'inline-block' : 'none';
      el.textContent = !c ? '' : c.state === 'ring' ? '📞 Khách đang gọi…' : '📞 Đang nghe máy · ' + Math.ceil(c.t) + ' giây' + (drv ? ' · ⚠️ vừa lái vừa nghe' : ' · đang đỗ, khách vui');
      el.className = 'chip' + (drv ? ' over' : '');
      $('callBtn').style.display = c && c.state === 'ring' ? 'block' : 'none'; } }
  // cảnh báo: sai phần đường (ưu tiên), rồi tới đèn phía trước
  let w = '';
  if (S.warnT > 0) w = S.warnText;
  else if (!S.inBay){
    const la = playerLightAhead(230);
    if (la && la.state === 'red') w = '🔴 Đèn đỏ phía trước: dừng trước vạch dừng';
    else if (la && la.state === 'yellow') w = '🟡 Đèn vàng: giảm tốc và dừng trước vạch dừng';
    else if (over >= 5) w = '🚨 Quá tốc độ: ' + Math.round(kmhF) + ' km/h, biển cho phép tối đa ' + S.spdLimit + '. Nhả ga, giảm tốc trước ngã tư kẻo camera chụp' + (S.spdLimit <= 30 ? ' (khu trường có trẻ em!)' : '');
    else if (over > 0) w = '⚠️ Hơi quá giới hạn ' + S.spdLimit + ' km/h một chút, nhả ga nhé';
    else if (phoneDriving()) w = '📵 Đang cầm điện thoại khi lái: qua chốt CSGT hoặc camera ngã tư là bị phạt. Tấp vào ô P đi!';
    else if (S.call && S.call.state === 'ring') w = '📞 Khách gọi! Muốn nghe thì tấp vào ô P rồi bấm "Nghe máy" (vừa lái vừa nghe là vi phạm)';
    else if (!safetyOn()) w = S.veh === 'car' ? '💡 Bạn chưa thắt dây an toàn: bấm nút 💺' + (isTouch ? '' : ' (phím H)') + ' kẻo qua chốt CSGT bị phạt'
                                              : '💡 Bạn chưa đội mũ bảo hiểm: bấm nút 🪖 Đội mũ' + (isTouch ? '' : ' (phím H)') + ' kẻo qua chốt CSGT bị phạt';
    else {   // sắp rẽ hoặc quay đầu mà chưa bật xi-nhan đúng bên: nhắc
      const i = S.route && S.route.instr;
      if (i && /^(left|right|bearleft|bearright|uturn)$/.test(i.type) && (i.type === 'uturn' || i.dist <= 240)){
        const want = /right$/.test(i.type) ? 1 : -1;
        if (S.turn !== want) w = '💡 Bật xi-nhan ' + (want > 0 ? 'phải' : 'trái') + ' trước khi ' + (i.type === 'uturn' ? 'quay đầu' : 'rẽ') + ' (' + (isTouch ? 'nút xi-nhan nhỏ phía trên nút mũi tên' : 'phím ' + (want > 0 ? 'E' : 'Q')) + ')';
      }
    }
  }
  // đồng hồ trên ghi đông (góc nhìn sau tay lái): kim quay 0–80 km/h (xe chạy tối đa 55 km/h); số chuyển đỏ khi chạy quá giới hạn
  if (S.view === 'bike' && S.veh === 'bike'){
    const kmh = Math.round(Math.abs(player.v) / 3), ov = over >= 5 ? 2 : over > 0 ? 1 : 0, ck = kmh + '|' + (S.sound.bike === 'ga' ? '' : S.gear || 1) + '|' + ov + '|' + S.spdLimit;
    if (hudCache.ck !== ck){ hudCache.ck = ck;
      $('needle').setAttribute('transform', 'rotate(' + (-128 + Math.min(kmh, 80) / 80 * 256).toFixed(1) + ' 200 74)');
      $('ckSpeed').textContent = kmh; $('ckSpeed').setAttribute('fill', ov === 2 ? '#ff6b6b' : ov === 1 ? '#ffd666' : '#fffaf2');
      $('ckUnit').textContent = 'km/h' + (S.sound.bike === 'ga' ? '' : ' · số ' + (S.gear || 1));
    }
  }
  // bảng đồng hồ và vô lăng ô tô (góc sau vô lăng): kim 0–80 km/h, số D/R/P, vô lăng xoay theo hướng lái
  if (S.view === 'bike' && S.veh === 'car'){
    const kmh = Math.round(Math.abs(player.v) / 3), ov = over >= 5 ? 2 : over > 0 ? 1 : 0, g = player.v < -1 ? 'R' : Math.abs(player.v) < 1 ? 'P' : 'D',
      wa = Math.round(S.wheel || 0), ck = kmh + '|' + g + '|' + ov + '|' + S.spdLimit + '|' + wa;
    if (hudCache.ckc !== ck){ hudCache.ckc = ck;
      $('needleCar').setAttribute('transform', 'rotate(' + (-128 + Math.min(kmh, 80) / 80 * 256).toFixed(1) + ' 200 112)');
      $('ckSpeedCar').textContent = kmh; $('ckSpeedCar').setAttribute('fill', ov === 2 ? '#ff6b6b' : ov === 1 ? '#ffd666' : '#fffaf2');
      $('gearCar').textContent = g; $('gearCar').setAttribute('fill', g === 'R' ? '#ff9f6b' : g === 'P' ? '#7ee0a1' : '#fffaf2');
      $('wheelCar').setAttribute('transform', 'rotate(' + wa + ' 200 192)');
    }
  }
  if (hudCache.warn !== w){ hudCache.warn = w; warnEl.textContent = w; warnEl.style.display = w ? 'block' : 'none'; }
  const fo = S.flash > 0 ? String(Math.min(1, S.flash * 2).toFixed(2)) : '0';
  if (hudCache.flash !== fo){ hudCache.flash = fo; flashEl.style.opacity = fo; }
}
function renderBook(){
  const car = S.veh === 'car';
  const cultBlock = `<div class="lawitem"><span class="cnt ${S.cult >= 80 ? 'z' : S.cult < 40 ? 'nz' : 'z'}">${S.cult}/100</span><b>🎭 Điểm văn hóa giao thông</b><br>Bắt đầu 70, dùng chung cho cả hai xe, không phạt tiền và không tự hồi: chỉ tăng bằng hành vi tốt. Từ 80 trở lên khách chấm 5 sao và boa thêm 10–20% cước; dưới 40 khách chỉ chấm 1–2 sao.<br>➖ Làm kẹt xe −3 mỗi xe (tối đa 3 xe mỗi lần), leo vỉa hè gặp người đi bộ −5, dừng giữa đường làm người khác chờ −3, bám đuôi −2, quên tắt xi-nhan −1.<br>➕ Nhường người đi bộ qua vạch +3, tấp vào ô P rồi mới nghe điện thoại +3, chuyến đi không làm ai phải chờ +1.<br><span class="fine">Văn hóa là điều ai cũng mong ở nhau chứ không phải điều luật: người đi đúng luật vẫn có thể thiếu văn hóa.</span></div>`;
  $('bookList').innerHTML = cultBlock + `<p class="fine">Đang xem luật cho <b>${VEH[S.veh].name}</b> (bằng lái hạng ${VEH[S.veh].lic}, ${S.pts}/12 điểm). Đổi xe ở nút ❔ để xem luật của xe kia.</p>` + (car ? LAW_ORDER_CAR : LAW_ORDER).map(k => {
    const L = lawOf(k), c = S.stats[k] || 0;
    return `<div class="lawitem"><span class="cnt ${c ? 'nz' : 'z'}">${c ? 'Bạn đã mắc ' + c + ' lần' : 'Chưa mắc lần nào 👍'}</span>`+
      `<b>${L.name}</b><br>${L.remind ? L.range : 'Phạt ' + L.range}${L.pts ? ', trừ ' + L.pts + ' điểm GPLX' : ''}<br>💡 ${L.tip}<br><span class="fine">${L.ref}</span></div>`;
  }).join('') + `<p class="fine">Số người bạn làm kẹt xe và đã phải đền: ${S.stats.affected || 0}. Tổng số đơn đã giao: ${S.trips}.</p>`;
}
function openOverlay(id){ $(id).classList.remove('hidden'); S.paused = true; }
function closeOverlay(id){ $(id).classList.add('hidden'); S.paused = false; if (S.suspended && id !== 'suspend') showSuspend(); }

function setupInput(){
  const map = {ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down', KeyR:'rev', Space:'brake', ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right'};
  window.addEventListener('keydown', e => {
    const k = map[e.code]; if (k){ keys[k] = true; e.preventDefault(); }
    if (!e.repeat && !S.paused){ if (e.code === 'KeyQ') setSignal(-1); else if (e.code === 'KeyE') setSignal(1); else if (e.code === 'KeyH') putOnHelmet(); else if (e.code === 'KeyC') answerCall(); else if (e.code === 'KeyU') uTurn(); }   // Q: xi-nhan trái, E: xi-nhan phải
  });
  window.addEventListener('keyup', e => { const k = map[e.code]; if (k){ keys[k] = false; e.preventDefault(); } });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  // nút cảm ứng: có 2 nút cùng làm một việc (▲ và GA), nên đếm số nút đang giữ
  const held = {};
  document.querySelectorAll('.cbtn').forEach(b => {
    const k = b.dataset.k; let down = false;
    if (k === 'left' || k === 'right') return;   // hai nút rẽ xử lý riêng ở dưới (trượt ngón vẫn giữ)
    const on = e => { if (!down){ down = true; held[k] = (held[k] || 0) + 1; } keys[k] = true; b.classList.add('on'); e.preventDefault(); };
    const off = e => { if (down){ down = false; held[k] = Math.max(0, (held[k] || 1) - 1); } keys[k] = held[k] > 0; b.classList.remove('on'); e.preventDefault(); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });
  // hai nút rẽ ◀ ▶ nằm cạnh nhau: đặt ngón vào là giữ, trượt ngón sang nút kia hay lệch ra ngoài mép vẫn tính là đang giữ; chỉ nhấc ngón lên mới nhả
  const steerBox = document.querySelector('.steer');
  if (steerBox){
    const bl = steerBox.querySelector('[data-k=left]'), br = steerBox.querySelector('[data-k=right]');
    let pid = null;
    const setSide = e => { const r = steerBox.getBoundingClientRect(), left = e.clientX < r.left + r.width / 2;
      keys.left = left; keys.right = !left; bl.classList.toggle('on', left); br.classList.toggle('on', !left); };
    const release = e => { if (e.pointerId !== pid) return; pid = null; keys.left = keys.right = false; bl.classList.remove('on'); br.classList.remove('on'); e.preventDefault(); };
    // ngón mới đặt vào luôn thay ngón cũ (nếu ngón cũ bị "kẹt" vì trình duyệt không báo lúc nhấc tay)
    steerBox.addEventListener('pointerdown', e => { pid = e.pointerId; try { steerBox.setPointerCapture(pid); } catch(_){} setSide(e); e.preventDefault(); });
    steerBox.addEventListener('pointermove', e => { if (e.pointerId === pid) setSide(e); });
    steerBox.addEventListener('pointerup', release); steerBox.addEventListener('pointercancel', release);
    steerBox.addEventListener('lostpointercapture', release);
    window.addEventListener('pointerup', release, true); window.addEventListener('pointercancel', release, true);
    // chốt chặn cuối: không còn ngón nào chạm vào vùng nút rẽ thì nhả lái
    const touchCheck = e => { if (pid === null) return; const r = steerBox.getBoundingClientRect();
      const still = [...e.touches].some(t => t.clientX >= r.left - 60 && t.clientX <= r.right + 60 && t.clientY >= r.top - 60 && t.clientY <= r.bottom + 60);
      if (!still){ pid = null; keys.left = keys.right = false; bl.classList.remove('on'); br.classList.remove('on'); } };
    window.addEventListener('touchend', touchCheck, true); window.addEventListener('touchcancel', touchCheck, true);
    document.addEventListener('visibilitychange', () => { if (document.hidden){ pid = null; keys.left = keys.right = false; bl.classList.remove('on'); br.classList.remove('on'); } });
  }
  // hai nút xi-nhan nhỏ trên điện thoại: chạm một lần để bật, chạm lại để tắt
  document.querySelectorAll('.sbtn').forEach(b => {
    b.addEventListener('pointerdown', e => { if (!S.paused) setSignal(+b.dataset.s); e.preventDefault(); });
  });
  // nút Đội mũ và Nghe máy
  $('helmBtn').addEventListener('pointerdown', e => { putOnHelmet(); e.preventDefault(); });
  $('callBtn').addEventListener('pointerdown', e => { answerCall(); e.preventDefault(); });
  isTouch = ('ontouchstart' in window) || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  if (isTouch) document.body.classList.add('touch');
  $('go').addEventListener('click', () => { S.xungho = $('xungho').value; S.assist = !!$('assist').checked; setVehicle($('veh').value); save(); closeOverlay('start');
    SND.init(); if (S.suspended) showSuspend(); else SND.announceTrip(); });
  $('helpBtn').addEventListener('click', () => { $('veh').value = S.veh; openOverlay('start'); });
  // âm thanh: trình duyệt chỉ cho phát tiếng sau khi người chơi bấm hoặc gõ phím
  // iPhone chỉ cho bật tiếng khi nhấc tay khỏi màn hình (touchend) hoặc bấm (click), không phải lúc vừa chạm xuống
  const unlock = () => { SND.init(); syncSound(); };
  window.addEventListener('touchend', unlock); window.addEventListener('click', unlock); window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) SND.init(); });
  const syncSound = () => { $('muteBtn').textContent = S.sound.on ? '🔊' : '🔇'; $('sndOn').checked = S.sound.on;
    $('sndFx').value = S.sound.fx; $('sndVoice').value = S.sound.voice; $('sndNpc').value = S.sound.npc; $('sndBike').value = S.sound.bike || 'so'; $('sndStatus').textContent = SND.audioStatus() + ' ' + SND.voiceStatus(); };
  syncSound();
  // nút loa: tắt hoặc bật tiếng ngay (phím M); nút bên cạnh mở bảng chỉnh âm thanh
  const toggleMute = () => { SND.init(); S.sound.on = !S.sound.on; if (!S.sound.on) SND.stopVoice(); SND.applyVolume(); syncSound(); save(); };
  $('muteBtn').addEventListener('click', toggleMute);
  window.addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) toggleMute(); });
  $('soundBtn').addEventListener('click', () => { SND.init(); syncSound(); $('soundPanel').classList.toggle('open'); });
  $('sndOn').addEventListener('change', () => { S.sound.on = $('sndOn').checked; if (!S.sound.on) SND.stopVoice(); SND.applyVolume(); syncSound(); save(); });
  $('sndFx').addEventListener('input', () => { S.sound.fx = +$('sndFx').value; SND.applyVolume(); save(); });
  $('sndVoice').addEventListener('input', () => { S.sound.voice = +$('sndVoice').value; save(); });
  $('sndNpc').addEventListener('input', () => { S.sound.npc = +$('sndNpc').value; save(); });
  $('sndBike').addEventListener('change', () => { S.sound.bike = $('sndBike').value; save(); });
  $('sndTest').addEventListener('click', () => { SND.init(); SND.reward(2); say({name:'Bác xe ôm', follow:true}, fill('Chào {x}! Đi đường nhớ nhường nhịn nha, nhanh một phút chậm cả đời đó.'));
    setTimeout(() => SND.speak('Còn 100 mét nữa, rẽ phải vào Đường Cầu Vồng', true), 4200); });
  $('utBtn').addEventListener('click', uTurn);
  lawEl.addEventListener('click', () => { lawEl.style.display = 'none'; S.lawT = 0; });
  $('bookBtn').addEventListener('click', () => { renderBook(); openOverlay('book'); });
  $('bookClose').addEventListener('click', () => closeOverlay('book'));
  $('resetBtn').addEventListener('click', () => { resetAll(); renderBook(); });
  $('viewBtn').addEventListener('click', () => { S.view = VIEWS[(VIEWS.indexOf(S.view) + 1) % VIEWS.length]; hudCache.ck = null; camX = player.x; camY = player.y; camA = player.a; save(); resize(); });
  window.addEventListener('resize', resize);
}

/* =========================================================
   13. KHỞI ĐỘNG
   ========================================================= */
load();
$('xungho').value = S.xungho;
$('assist').checked = S.assist;
$('veh').value = S.veh;
player.len = VEH[S.veh].len; player.w = VEH[S.veh].w; document.body.classList.toggle('car', S.veh === 'car');
makeNPCs();
newTrip();
setupInput();
resize();
let last = 0;
function frame(ts){
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  step(dt); render(dt); SND.update(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Dùng cho việc kiểm tra tự động
window.__TP = {useMap, getMap: () => MAP, classifyOld, CROSSWALKS, playerLightAhead, roadPos, NPC_GEN, BUS_LOOPS, npcNewRoute, npcLoopRoute, npcBuildPts, npcNodePath, npcStraightPath, routeLightLimit, makeNPCs, ROUTE, computeRouteOld, computeRouteMap, NAV_ANG, drawGround, NEN, nenTile, drawGroundOld, veNen, MAP, NODES, ROADS, dungBanDo, N, SEGS, DEAD, CORNERS, BLOCKS, cultAdd, cultRating, CULT, uTurn, turnPath, turnArmChoice, laneFrame, assistOff, farePay, $, LAW_ORDER_CAR, VEH, setVehicle, safetyOn, speedType, lawOf, CSGT, putOnHelmet, answerCall, phoneDriving, csgtCheck, say, voiceOf, SND, QUIZ, suspendLicense, S, player, npcs, peds, keys, step, classify, lightOf, LIGHTS, RB, violate, newTrip, render, resize, computeRoute, DESTS, BAYS, lineType, navText, HALF, OW, setSignal, SIGNBOARDS, speedInfo, SPEED_SIGNS, SCHOOL, LAW, VMAX};
