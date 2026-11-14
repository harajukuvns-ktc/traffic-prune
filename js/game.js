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
  money: 5000000, pts: 12, streak: 0, trips: 0, stats: {},
  faultUntil: -1, epId: 0, epAffected: 0, epJamSaid: false,
  trip: null, route: null, routeT: 0, bubble: null, floats: [], flash: 0, lawT: 0, warnT: 0, warnText: '',
  wrongT: 0, okT: 0, solidT: 0, sideEp: false, ringWrongT: 0, ringEp: false, wwEp: false,
  jamTick: 0, sidewalkSaidT: -99, crashCool: -1, inBay: false, stopT: 0, stopSaidT: -99, suspended: false,
  sound: {on: true, fx: 0.7, voice: 0.9, npc: 0.8, bike: 'so'}, gear: 1,
  // xi-nhan: turn = -1 (trái), 0 (tắt), 1 (phải); không tự tắt. sigAcc: tổng góc đã quay; sigEp: đã xét lỗi lượt rẽ này
  turn: 0, sigInJ: false, blinkT: 0, sigOnT: -99, sigAcc: 0, sigStraightT: 0, sigEp: false, turnBegan: false, turnStartT: -99, sigRunT: 0, sigOffSaidT: -99, blinkOn: false,
  pedEp: false, pedCool: -99,
  // tốc độ: spdSec = đoạn đường đang đi, spdSaid = đoạn này đã nhắc nhở rồi, spdT = thời gian đã chạy quá, spdMax = mức vượt lớn nhất, spdLimit = giới hạn hiện tại (km/h)
  // camCool = mốc thời gian chống bị camera chụp hai lần liền
  spdSec: '', spdSaid: false, spdT: 0, spdMax: 0, spdLimit: 40, camCool: -99
};
const START = {x: DESTS[0].bay.cx, y: DESTS[0].bay.cy, a: 0};
const player = {x: START.x, y: START.y, a: START.a, v: 0, len: 18, w: 8, isPlayer: true, stun: 0, name: 'Bạn'};
const npcs = [], peds = [];
let uid = 0;

function makeNPCs(){
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
      S.streak = d.streak || 0; S.trips = d.trips || 0; S.stats = d.stats || {};
      S.view = VIEWS.includes(d.view) ? d.view : 'nav'; S.assist = d.assist !== false;
      if (d.sound) S.sound = {on: d.sound.on !== false, fx: clamp(+d.sound.fx || 0, 0, 1), voice: clamp(+d.sound.voice || 0, 0, 1), npc: d.sound.npc == null ? 0.8 : clamp(+d.sound.npc || 0, 0, 1), bike: d.sound.bike === 'ga' ? 'ga' : 'so'};
      S.suspended = S.pts <= 0; }
  } catch(e){}
}
function save(){
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({xungho:S.xungho, money:S.money, pts:S.pts, streak:S.streak, trips:S.trips,
    stats:S.stats, view:S.view, assist:S.assist, sound:S.sound})); } catch(e){}
}
function resetAll(){
  try { localStorage.removeItem(SAVE_KEY); } catch(e){}
  S.money = 5000000; S.pts = 12; S.streak = 0; S.trips = 0; S.stats = {}; S.suspended = false; S.turn = 0; S.spdSec = ''; S.spdSaid = false; S.spdT = 0; S.camCool = -99;
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
function ringBusy(theta, self, minV){
  for (const o of vehicles()){
    if (o === self) continue;
    if (o === player && S.inBay) continue;
    if (minV && Math.abs(o.v) < minV) continue;
    const r = Math.hypot(o.x - RB.x, o.y - RB.y);
    if (r < RB.rIn - 6 || r > RB.rOut + 2) continue;
    const d = normA(Math.atan2(o.y - RB.y, o.x - RB.x) - theta);
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
function playerLightAhead(maxD){
  const ux = Math.cos(player.a), uy = Math.sin(player.a); let best = null;
  for (const L of LIGHTS){
    const ap = approach(player, ux, uy, L);
    if (!ap) continue;
    const d = ap.dist - STOPG;
    if (d < -2 || d > maxD) continue;   // đã qua vạch dừng thì thôi
    if (!best || d < best.dist) best = {dist: d, state: lightOf(L, ap.axis, S.now)};
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
function floatText(x, y, text, color){ S.floats.push({x, y, text, color, t: 1.8}); }
function showLaw(html, good){
  lawEl.innerHTML = html; lawEl.className = good ? 'good' : ''; lawEl.style.display = 'block'; S.lawT = 9;
}
function warn(text){ S.warnText = text; S.warnT = 0.6; }
// Lỗi chỉ nhắc nhở (LAW[type].remind): không phạt tiền, không trừ điểm, chuyến không còn sạch
function remind(type, speaker){
  const law = LAW[type];
  S.stats[type] = (S.stats[type] || 0) + 1;
  const n = S.stats[type];
  if (S.trip) S.trip.clean = false;
  S.streak = 0;
  const who = speaker || nearestNPC(player.x, player.y, 280) || {name:'Loa phường', follow:true};
  let line = fill(pick(LINES[type]), n);
  if (n >= 2) line = fill(pick(LINES.again), n) + line;
  say(who, line);
  showLaw(`<b>📘 ${law.name}</b>: ${law.range.toLowerCase()}<br><small>${law.ref}</small><br>💡 ${law.tip}<br>`+
    `<small>Chuyến này không còn được tính là chuyến sạch.</small>`);
  save();
}
// Lỗi do camera ngã tư chụp (phạt nguội): có tiếng máy ảnh và loé sáng
const CAM_TYPES = {red: 1, speed1: 1, speed2: 1, speed3: 1};
function violate(type, quipKey, speaker){
  const law = LAW[type];
  S.stats[type] = (S.stats[type] || 0) + 1;
  const n = S.stats[type];
  const hadPts = S.pts > 0;
  S.money -= law.fine; S.pts = Math.max(0, S.pts - law.pts);
  if (hadPts && S.pts === 0) suspendLicense();
  SND.whistle(); if (CAM_TYPES[type]) SND.shutter();
  if (S.trip) S.trip.clean = false;
  S.streak = 0; S.epId++; S.epAffected = 0; S.epJamSaid = false;
  S.faultUntil = Math.max(S.faultUntil, S.now + 3);
  const who = speaker || nearestNPC(player.x, player.y, 280) || {name:'Loa phường', follow:true};
  let line = fill(pick(LINES[quipKey || type]), n);
  if (n >= 2) line = fill(pick(LINES.again), n) + line;
  say(who, line);
  const trips = Math.max(1, Math.round(law.fine / 90000));
  showLaw(`<b>📘 ${law.name}</b>: phạt ${law.range}${law.pts ? `, trừ ${law.pts} điểm GPLX` : ''}<br>`+
    `<small>${law.ref}</small><br>💡 ${law.tip}<br>`+
    `<small>Trong game bị trừ ${fmt(law.fine)}, bằng khoảng ${trips} chuyến giao hàng.${S.pts === 0 ? ' Điểm GPLX đã về 0: không được lái xe nữa cho tới khi kiểm tra đạt và được phục hồi điểm.' : ''}</small>`);
  floatText(player.x, player.y, '−' + fmt(law.fine).replace('−',''), '#e5484d');
  if (CAM_TYPES[type]) S.flash = 0.7;
  save();
}
function compensate(n, amount, note){
  S.money -= amount;
  floatText(n.x, n.y, '+' + fmt(amount), '#2f9e6b');
  floatText(player.x, player.y, '−' + fmt(amount) + (note ? ' ' + note : ''), '#e5484d');
  save();
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
  $('suspendCard').innerHTML = `<h2>🪪 Bằng lái của ${S.xungho} đã hết điểm</h2>
    <p>Xe phải dừng ngay tại chỗ. Theo <b>khoản 3 Điều 58 Luật Trật tự, an toàn giao thông đường bộ 2024</b>: bằng lái bị trừ hết điểm thì <b>không được lái xe theo bằng lái đó</b>. Sau ít nhất <b>6 tháng</b> mới được dự kiểm tra kiến thức pháp luật; đạt yêu cầu thì được phục hồi đủ 12 điểm.</p>
    <p>Trong game, 6 tháng trôi qua trong nháy mắt 😄. Làm bài kiểm tra ${QUIZ_N} câu, đúng từ ${QUIZ_PASS} câu là được hồi 12 điểm và lái tiếp.</p>
    <p class="fine">Ngoài đời, bài kiểm tra cho bằng hạng A1 theo Thông tư 65/2024/TT-BCA gồm 25 câu (có câu điểm liệt, làm sai là không đạt), phải đúng từ 21 câu. Thông tư 105/2026/TT-BCA đã sửa đổi Thông tư 65, nên đề kiểm tra có thể thay đổi theo lộ trình của thông tư này.</p>
    <div class="row"><button class="btn primary" id="quizGo">Làm bài kiểm tra</button><button class="btn" id="quizReset">Chơi lại từ đầu</button></div>`;
  openOverlay('suspend');
  $('quizGo').onclick = startQuiz;
  $('quizReset').onclick = () => { resetAll(); closeOverlay('suspend'); };
}
function startQuiz(){
  quiz = {items: shuffle(QUIZ).slice(0, QUIZ_N).map(it => ({...it, opts: shuffle(it.a), pick: null})), i: 0};
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
  SND.announceTrip();
}
function arrive(){
  const t = S.trip, dd = Math.hypot(t.dest.bay.cx - t.fx, t.dest.bay.cy - t.fy);
  const base = 30000 + Math.round(dd * 55 / 1000) * 1000;
  let pay = base, bonus = 0;
  if (t.clean){
    S.streak++;
    bonus = Math.round(base * (0.5 + 0.25 * Math.min(S.streak - 1, 6)) / 1000) * 1000;
    pay += bonus;
    if (S.streak % 5 === 0 && S.pts < 12){ S.pts++; }
  }
  S.money += pay; S.trips++;
  SND.reward(t.clean ? S.streak : 0);
  const cust = {name: 'Khách ở ' + t.dest.name, x: t.dest.bay.cx, y: t.dest.bay.cy};
  // vừa đỗ ngược chiều ngay tại điểm giao: khách nhắc luôn, bảng thông báo ghi kèm căn cứ
  const wrongPark = S.parkDirBay === t.dest.bay;
  say(cust, fill(pick(LINES[wrongPark ? 'parkdir' : t.clean ? 'praise' : 'meh'])));
  showLaw(`<b>📦 Giao hàng thành công tới ${t.dest.name}</b><br>Tiền công ${fmt(base)}` +
    (t.clean ? ` + thưởng đi sạch ${fmt(bonus)} (chuỗi ${S.streak} chuyến sạch)` : ` (chuyến có vi phạm hoặc bị nhắc nên không có thưởng)`) +
    (wrongPark ? `<br>⚠️ ${LAW.parkdir.name}: ${LAW.parkdir.range.toLowerCase()}. 💡 ${LAW.parkdir.tip}<br><small>${LAW.parkdir.ref}</small>` : '') +
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

function computeRoute(){
  const t = S.trip; if (!t) return null;
  const dest = t.dest, ds = SEGS[dest.seg], dp = dest.bay.proj, bayC = {x: dest.bay.cx, y: dest.bay.cy};
  const P0 = {x: player.x, y: player.y}, hd = {x: Math.cos(player.a), y: Math.sin(player.a)};
  let atNode = null;
  for (const id in N){ if (DEAD[id]) continue; if (dist(P0, N[id]) <= (id === 'F' ? RB.rOut : HALF + 2)) atNode = id; }
  const cost = {}, prev = {}, startInfo = {}, cands = [];
  for (const id in N) cost[id] = Infinity;
  let si = -1, pr = null, UT = UTURN_COST;
  const addStart = (id, c, uturn, other) => { if (c < cost[id]){ cost[id] = c; prev[id] = null; startInfo[id] = {uturn, other}; } };
  if (atNode) addStart(atNode, 0, false, null);
  else {
    si = nearestSeg(P0); const s = SEGS[si], a = N[s.a], b = N[s.b];
    pr = projOn(P0, a, b);
    const dab = unit(a, b), fwd = hd.x*dab.x + hd.y*dab.y;
    const horiz = a.y === b.y;
    if (lineType(horiz ? 'h' : 'v', horiz ? a.y : a.x, horiz ? pr.x : pr.y) === 'solid') UT = UTURN_COST + 200;
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
      const c = cost[u] + dist(N[u], N[v]);
      if (c < cost[v]){ cost[v] = c; prev[v] = u; }
    }
  }
  // tới nút rồi quay ngược lại đúng đoạn vừa đi cũng tính là quay đầu
  const back = (node, next) => (node !== 'F' && (prev[node] || (startInfo[node] && startInfo[node].other)) === next ? UTURN_COST : 0);
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
function updNPC(n, dt){
  if (n.hidden){
    n.respawnT -= dt;
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
      else { n.hidden = true; n.respawnT = 1 + Math.random()*4; n.blockedBy = null; return; }
    }
    tgt = n.route.pts[n.idx]; dx = tgt.x - n.x; dy = tgt.y - n.y; d = Math.hypot(dx, dy) || 1;
  }
  const ux = dx / d, uy = dy / d;
  let allowed = n.vmax, blocker = null;

  allowed = Math.min(allowed, lightLimit(n, ux, uy));

  if (tgt.yieldAt !== undefined && d < 45){
    if (n.yieldWait < 5 && ringBusy(tgt.yieldAt, n)){ allowed = Math.min(allowed, stopLimit(d - 2)); n.yieldWait += dt; }
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
function updPed(p, dt){
  if (p.stopT > 0){ p.stopT -= dt; return; }
  const t = p.route.pts[p.idx], dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
  if (d < 2){ p.idx = (p.idx + 1) % p.route.pts.length; return; }
  const st = Math.min(p.v * dt, d); p.x += dx/d*st; p.y += dy/d*st;
}

/* =========================================================
   10. NGƯỜI CHƠI VÀ LUẬT
   ========================================================= */
const keys = {up:false, down:false, brake:false, left:false, right:false};
const VMAX = 165;   // 55 km/h (km/h = vận tốc / 3)
function laneAssist(c, dt){
  // Thả phím rẽ ra thì xe tự nắn thẳng theo làn bên phải của hướng đang đi
  const ca = Math.cos(player.a), sa = Math.sin(player.a);
  let base = null, e = 0, k = 45, lim = 0.3;
  if (c.t === 'bay'){   // trong ô đỗ: giữ xe thẳng giữa ô theo chiều của ô; chạy hết ô thì tự nhập lại làn
    const b = c.bay, d = b.dir;
    if (ca*d.x + sa*d.y < 0.8) return;
    base = Math.atan2(d.y, d.x); e = (player.x - b.cx) * -d.y + (player.y - b.cy) * d.x; k = 28;
  }
  if (c.t === 'h' && Math.abs(ca) > 0.8){ const dx = ca >= 0 ? 1 : -1; base = dx > 0 ? 0 : Math.PI; e = (player.y - (c.Y + 20*dx)) * dx; }
  else if (c.t === 'v' && Math.abs(sa) > 0.8){ const dy = sa >= 0 ? 1 : -1; base = dy > 0 ? Math.PI/2 : -Math.PI/2; e = (player.x - (c.X - 20*dy)) * -dy; }
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
  const prevC = classify(prev.x, prev.y);
  S.inBay = prevC.t === 'bay';
  // Space và nút PHANH: chỉ phanh, dừng hẳn thì đứng yên. Phím ↓ / S: phanh, dừng rồi giữ tiếp thì lùi chậm.
  const braking = keys.down || keys.brake;
  if (player.stun > 0) player.stun -= dt;
  else {
    if (keys.up) player.v += (player.v < 115 ? 115 : 70) * dt;   // quá 38 km/h thì tăng tốc chậm lại
    if (keys.brake){ const b = 330 * dt; player.v = Math.abs(player.v) <= b ? 0 : player.v - Math.sign(player.v) * b; }
    else if (keys.down) player.v -= (player.v > 0 ? 330 : 80) * dt;
  }
  if (S.suspended){ player.v = 0; }
  if ((!keys.up && !braking) || player.stun > 0){
    const fr = 70 * dt; player.v = Math.abs(player.v) <= fr ? 0 : player.v - Math.sign(player.v) * fr;
  }
  const vmax = prevC.t === 'off' ? 45 : VMAX;
  if (player.v > vmax) player.v = Math.max(vmax, player.v - 320 * dt);
  player.v = Math.max(player.v, -35);
  if (player.stun <= 0){
    const steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (steer) player.a = normA(player.a + steer * 2.4 * dt * clamp(Math.abs(player.v) / 40, 0, 1) * Math.sign(player.v || 1));
    else if (S.assist && player.v > 20) laneAssist(prevC, dt);
  }
  const nx = clamp(player.x + Math.cos(player.a) * player.v * dt, 8, W - 8);
  const ny = clamp(player.y + Math.sin(player.a) * player.v * dt, 8, H - 8);
  if (hitsHouse(nx, ny, 7) || classify(nx, ny).t === 'island'){ player.v *= -0.25; }
  else { player.x = nx; player.y = ny; }

  // va chạm với NPC (xe đang đỗ trong ô P thì không tính)
  if (!S.inBay) for (const n of npcs){
    if (n.hidden || n.ghostP > 0 || n.ghostT > 0) continue;
    const d = segDist(player.x, player.y, n), minD = 8 + n.w/2;
    if (d >= minD) continue;
    const ang = Math.atan2(player.y - n.y, player.x - n.x);
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
    if (Math.hypot(p.x - player.x, p.y - player.y) < 2){   // 2 đơn vị = 0,5 m
      p.stopT = 1.2;
      if (S.now - S.sidewalkSaidT > 8){ S.sidewalkSaidT = S.now; say(p, fill(pick(LINES.sidewalk))); }
      if (!(p.slowT > S.now)){ player.v *= 0.6; p.slowT = S.now + 1.5; }   // chậm lại một lần mỗi lần gặp, để còn lách tránh được
    }
  }
  checkRules(prev, prevC, dt);
}

function checkRules(prev, prevC, dt){
  const c = classify(player.x, player.y);
  const sp = Math.abs(player.v);
  const sgn = player.v >= 0 ? 1 : -1;
  const mx = Math.cos(player.a) * sgn, my = Math.sin(player.a) * sgn; // hướng chuyển động thật

  // 1) Vượt đèn đỏ: đầu xe vượt qua VẠCH DỪNG khi đèn hướng mình đang đỏ
  //    (đầu xe đã qua vạch dừng lúc đèn vàng thì được đi tiếp, đúng như luật)
  const nose = {x: player.x + mx * 9, y: player.y + my * 9}, pNose = {x: prev.x + mx * 9, y: prev.y + my * 9};
  if (sp > 5) for (const L of LIGHTS){
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      if (mx*dx + my*dy < 0.3) continue;
      const lat = dx ? Math.abs(nose.y - L.y) : Math.abs(nose.x - L.x);
      if (lat >= HALF) continue;
      const sx = L.x - dx*(HALF + STOPG), sy = L.y - dy*(HALF + STOPG);
      const before = (pNose.x - sx)*dx + (pNose.y - sy)*dy, after = (nose.x - sx)*dx + (nose.y - sy)*dy;
      if (before < 0 && after >= 0){
        // camera chụp tốc độ đúng lúc đầu xe qua vạch dừng (cả đèn xanh lẫn đèn đỏ), so với giới hạn của đoạn đường vừa đi qua
        const si = speedInfo(prevC, prev.x, prev.y);
        if (si && S.now >= S.camCool){
          const over = sp / 3 - si.limit;
          if (over >= 5){
            S.camCool = S.now + 3;
            violate(over > 20 ? 'speed3' : over >= 10 ? 'speed2' : 'speed1', si.id === 'school' ? 'speedcamschool' : 'speedcam');
          }
        }
        if (lightOf(L, dx ? 'EW' : 'NS', S.now) === 'red') violate('red');
      }
    }
  }

  // 2) Phố Chợ là phố đi bộ (biển P.104 cấm xe máy, P.103a cấm ô tô): xe máy chạy vào là bị phạt
  if (c.t === 'ped'){
    warn('⛔ Phố Chợ là phố đi bộ, có biển cấm xe máy: lùi ra và đi đường khác');
    if (sp > 10 && player.stun <= 0 && !S.pedEp && S.now > S.pedCool){ S.pedEp = true; violate('noentry'); }
    if (S.pedEp) S.faultUntil = Math.max(S.faultUntil, S.now + 1);
  } else if (S.pedEp){ S.pedEp = false; S.pedCool = S.now + 4; }

  // 3) Vạch giữa đường
  //    Vạch liền: sang phần đường ngược chiều là bị phạt ngay.
  //    Vạch đứt: được cắt qua để rẽ, vượt, vào ô đỗ; chạy lâu bên phần đường ngược chiều mới bị phạt.
  let wrong = false, zone = 'broken';
  if (sp > 15 && player.stun <= 0){   // bị dội ngược sau va chạm thì không tính
    if (c.t === 'h'){ if ((mx > 0.6 && player.y < c.Y - 3) || (mx < -0.6 && player.y > c.Y + 3)) wrong = true; zone = lineType('h', c.Y, player.x); }
    if (c.t === 'v'){ if ((my < -0.6 && player.x < c.X - 3) || (my > 0.6 && player.x > c.X + 3)) wrong = true; zone = lineType('v', c.X, player.y); }
  }
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

  // 4) Vòng xuyến: nhường xe bên trái khi vào, và không đi ngược chiều vòng
  const pr = Math.hypot(prev.x - RB.x, prev.y - RB.y), cr = Math.hypot(player.x - RB.x, player.y - RB.y);
  if (pr > RB.rOut && cr <= RB.rOut && sp > 15){
    const th = Math.atan2(player.y - RB.y, player.x - RB.x);
    const other = ringBusy(th, player, 12);
    if (other && Math.hypot(other.x - player.x, other.y - player.y) < 110) violate('ring', 'ring', other);
  }
  if (c.t === 'ring' && sp > 15 && player.stun <= 0){
    const rx = player.x - RB.x, ry = player.y - RB.y, r = Math.hypot(rx, ry) || 1;
    const tang = (rx * my - ry * mx) / r; // > 0: đi theo chiều kim đồng hồ (sai)
    if (tang > 0.45){ S.ringWrongT += dt; } else S.ringWrongT = Math.max(0, S.ringWrongT - dt);
    if (S.ringWrongT > 0.6){
      if (!S.ringEp){ S.ringEp = true; violate('lane', 'ringwrong'); }
      S.faultUntil = Math.max(S.faultUntil, S.now + 1);
    }
  } else if (c.t !== 'ring'){ S.ringWrongT = 0; S.ringEp = false; }

  // 5) Dừng giữa đường làm người khác phải chờ: chỉ nhắc nhẹ, chưa phạt
  const onRoad = c.t === 'h' || c.t === 'v' || c.t === 'junction' || c.t === 'ring';
  if (onRoad && sp < 3 && player.stun <= 0 && !reasonToStop()) S.stopT += dt; else S.stopT = 0;
  if (S.stopT > 4 && S.now - S.stopSaidT > 20){
    const blocked = npcs.find(n => !n.hidden && n.blockedBy === player && n.waitT > 1.5);
    if (blocked){ S.stopSaidT = S.now; say(blocked, fill(pick(LINES.stopping))); }
  }

  // 5b) Tốc độ giữa hai ngã tư: chỉ NHẮC NHỞ, không phạt và không làm mất "chuyến sạch" (quyết định ngày 14/11/2026).
  //     Việc phạt nằm ở camera tại vạch dừng ngã tư có đèn (mục 1). Vượt từ 5 km/h trở lên liên tục 3 giây thì NPC nhắc một lần mỗi đoạn.
  { const si = speedInfo(c, player.x, player.y);
    if (si){
      if (si.id !== S.spdSec){ S.spdSec = si.id; S.spdSaid = false; S.spdT = 0; S.spdMax = 0; }
      S.spdLimit = si.limit;
    }
    const onRd = si || c.t === 'junction' || c.t === 'ring';
    const over = sp / 3 - S.spdLimit;
    if (onRd && over >= 5 && player.stun <= 0 && !S.spdSaid){
      S.spdT += dt; S.spdMax = Math.max(S.spdMax, over);
      if (S.spdT >= 3){
        S.spdSaid = true;
        say(nearestNPC(player.x, player.y, 280) || {name:'Loa phường', follow:true}, fill(pick(S.spdSec === 'school' ? LINES.speedwarnschool : LINES.speedwarn)));
      }
    } else if (over < 5){ S.spdT = 0; S.spdMax = 0; }
  }

  // 6) Xi-nhan. Chỉ bắt khi RẼ Ở NGÃ TƯ (một lượt rẽ đi qua nút giao và quay xe quá khoảng 50 độ) hoặc QUAY ĐẦU (quá khoảng 137 độ).
  //    Cắt vạch đứt để vượt xe không tính (đó là lỗi khác). Trợ lái chỉ nắn nhẹ trên đường thẳng nên không bị tính là rẽ.
  //    Phải bật đúng bên và bật TRƯỚC khi bắt đầu rẽ (cho phép trễ 0,25 giây).
  const sigZone = (c.t === 'junction' || c.t === 'h' || c.t === 'v');
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
      }
    } else if (rate > 0.3) S.sigRunT = 0;
  }

  // Đỗ trong ô P mà đầu xe ngược chiều đi của làn: chỉ nhắc (mỗi lần vào ô nhắc một lần)
  if (c.t === 'bay' && sp < 12){
    const d = c.bay.dir;
    if (Math.cos(player.a)*d.x + Math.sin(player.a)*d.y < -0.5 && S.parkDirBay !== c.bay){
      S.parkDirBay = c.bay; remind('parkdir');
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
    if (S.epAffected >= 3 && !S.epJamSaid){ S.epJamSaid = true; say(n, fill(pick(LINES.jam))); }
  }
}

function step(dt){
  if (S.paused) return;
  S.now += dt;
  for (const n of npcs) updNPC(n, dt);
  for (const p of peds) updPed(p, dt);
  updPlayer(dt);
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
      const want = VH - (isTouch ? 92 : 0) - Math.min(560, VW) * 0.14;
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
  $('viewBtn').innerHTML = S.view === 'nav' ? '🏍️<span class="lbl"> Sau tay lái</span>' : bike ? '🗺️<span class="lbl"> Bản đồ</span>' : '🧭<span class="lbl"> Dẫn đường</span>';
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

function drawGround(){
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
  if (S.view === 'bike') return;   // góc nhìn sau tay lái: xe của mình là ghi đông ở mép dưới màn hình
  drawBike(player, '#ff8a3d', '#ffffff', true, S.turn);
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
    up(sb.x, sb.y, () => {
      const rh = 9.2, w = 66, h = sb.rows.length * rh + 5, top = -14 - h;
      ctx.fillStyle = '#555'; ctx.fillRect(-1, -14, 2, 14);
      ctx.fillStyle = '#fff'; rr(ctx, -w/2 - 1, top - 1, w + 2, h + 2, 3.5); ctx.fill();
      ctx.fillStyle = '#1b6fb8'; rr(ctx, -w/2, top, w, h, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 6.4px "Segoe UI", Roboto, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      sb.rows.forEach((r, i) => {
        const y = top + 2.5 + rh * (i + 0.5);
        ctx.fillText(ARROW[r.k], -w/2 + 3, y); ctx.fillText(r.name, -w/2 + 13, y);
      });
    });
  }
}
function drawUprights(){
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
  else if (i.type === 'uturn'){ icon = 'uturn'; main = m >= 15 ? pre + 'Quay đầu xe ở nút giao phía trước' : 'Quay đầu xe ở đoạn vạch đứt, khi đường trống'; }
  else if (i.type === 'left'){ icon = 'left'; main = pre + 'Rẽ trái vào ' + i.street; }
  else if (i.type === 'right'){ icon = 'right'; main = pre + 'Rẽ phải vào ' + i.street; }
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
  setHTML('pts', `🪪<span class="lbl"> Điểm GPLX</span> <b>${S.pts}/12</b>`);
  setHTML('streak', `⭐<span class="lbl"> Chuỗi sạch</span> <b>${S.streak}</b>`);
  const kmhF = Math.abs(player.v) / 3, over = kmhF - S.spdLimit;
  setHTML('speed', `🏍️ <b>${Math.round(kmhF)}</b> km/h<span class="lim"> · tối đa ${S.spdLimit}</span>${S.sound.bike === 'ga' ? '' : ' · số ' + (S.gear || 1)}`);
  { const sc = 'chip' + (over >= 5 ? ' over' : over > 0 ? ' near' : ''); if (hudCache.sc !== sc){ hudCache.sc = sc; $('speed').className = sc; } }
  // đèn xi-nhan trên thanh thông tin và trên ghi đông
  { const L = S.turn < 0 && S.blinkOn, R = S.turn > 0 && S.blinkOn, sk = (S.turn || 0) + '|' + (S.blinkOn ? 1 : 0);
    if (hudCache.sig !== sk){ hudCache.sig = sk;
      $('sigchip').style.display = S.turn ? 'inline-block' : 'none';
      $('sigL').style.opacity = L ? '1' : '.25'; $('sigR').style.opacity = R ? '1' : '.25';
      $('sigCkL').setAttribute('opacity', L ? '1' : '0'); $('sigCkR').setAttribute('opacity', R ? '1' : '0'); } }
  // cảnh báo: sai phần đường (ưu tiên), rồi tới đèn phía trước
  let w = '';
  if (S.warnT > 0) w = S.warnText;
  else if (!S.inBay){
    const la = playerLightAhead(230);
    if (la && la.state === 'red') w = '🔴 Đèn đỏ phía trước: dừng trước vạch dừng';
    else if (la && la.state === 'yellow') w = '🟡 Đèn vàng: giảm tốc và dừng trước vạch dừng';
    else if (over >= 5) w = '🚨 Quá tốc độ: ' + Math.round(kmhF) + ' km/h, biển cho phép tối đa ' + S.spdLimit + '. Nhả ga, giảm tốc trước ngã tư kẻo camera chụp' + (S.spdLimit <= 30 ? ' (khu trường có trẻ em!)' : '');
    else if (over > 0) w = '⚠️ Hơi quá giới hạn ' + S.spdLimit + ' km/h một chút, nhả ga nhé';
    else {   // sắp rẽ hoặc quay đầu mà chưa bật xi-nhan đúng bên: nhắc
      const i = S.route && S.route.instr;
      if (i && (i.type === 'left' || i.type === 'right' || i.type === 'uturn') && (i.type === 'uturn' || i.dist <= 240)){
        const want = i.type === 'right' ? 1 : -1;
        if (S.turn !== want) w = '💡 Bật xi-nhan ' + (want > 0 ? 'phải' : 'trái') + ' trước khi ' + (i.type === 'uturn' ? 'quay đầu' : 'rẽ') + ' (' + (isTouch ? 'nút xi-nhan nhỏ phía trên nút mũi tên' : 'phím ' + (want > 0 ? 'E' : 'Q')) + ')';
      }
    }
  }
  // đồng hồ trên ghi đông (góc nhìn sau tay lái): kim quay 0–80 km/h (xe chạy tối đa 55 km/h); số chuyển đỏ khi chạy quá giới hạn
  if (S.view === 'bike'){
    const kmh = Math.round(Math.abs(player.v) / 3), ov = over >= 5 ? 2 : over > 0 ? 1 : 0, ck = kmh + '|' + (S.sound.bike === 'ga' ? '' : S.gear || 1) + '|' + ov + '|' + S.spdLimit;
    if (hudCache.ck !== ck){ hudCache.ck = ck;
      $('needle').setAttribute('transform', 'rotate(' + (-128 + Math.min(kmh, 80) / 80 * 256).toFixed(1) + ' 200 74)');
      $('ckSpeed').textContent = kmh; $('ckSpeed').setAttribute('fill', ov === 2 ? '#ff6b6b' : ov === 1 ? '#ffd666' : '#fffaf2');
      $('ckUnit').textContent = 'km/h' + (S.sound.bike === 'ga' ? '' : ' · số ' + (S.gear || 1));
    }
  }
  if (hudCache.warn !== w){ hudCache.warn = w; warnEl.textContent = w; warnEl.style.display = w ? 'block' : 'none'; }
  const fo = S.flash > 0 ? String(Math.min(1, S.flash * 2).toFixed(2)) : '0';
  if (hudCache.flash !== fo){ hudCache.flash = fo; flashEl.style.opacity = fo; }
}
function renderBook(){
  $('bookList').innerHTML = LAW_ORDER.map(k => {
    const L = LAW[k], c = S.stats[k] || 0;
    return `<div class="lawitem"><span class="cnt ${c ? 'nz' : 'z'}">${c ? 'Bạn đã mắc ' + c + ' lần' : 'Chưa mắc lần nào 👍'}</span>`+
      `<b>${L.name}</b><br>${L.remind ? L.range : 'Phạt ' + L.range}${L.pts ? ', trừ ' + L.pts + ' điểm GPLX' : ''}<br>💡 ${L.tip}<br><span class="fine">${L.ref}</span></div>`;
  }).join('') + `<p class="fine">Số người bạn làm kẹt xe và đã phải đền: ${S.stats.affected || 0}. Tổng số đơn đã giao: ${S.trips}.</p>`;
}
function openOverlay(id){ $(id).classList.remove('hidden'); S.paused = true; }
function closeOverlay(id){ $(id).classList.add('hidden'); S.paused = false; if (S.suspended && id !== 'suspend') showSuspend(); }

function setupInput(){
  const map = {ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down', Space:'brake', ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right'};
  window.addEventListener('keydown', e => {
    const k = map[e.code]; if (k){ keys[k] = true; e.preventDefault(); }
    if (!e.repeat && !S.paused){ if (e.code === 'KeyQ') setSignal(-1); else if (e.code === 'KeyE') setSignal(1); }   // Q: xi-nhan trái, E: xi-nhan phải
  });
  window.addEventListener('keyup', e => { const k = map[e.code]; if (k){ keys[k] = false; e.preventDefault(); } });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  // nút cảm ứng: có 2 nút cùng làm một việc (▲ và GA), nên đếm số nút đang giữ
  const held = {};
  document.querySelectorAll('.cbtn').forEach(b => {
    const k = b.dataset.k; let down = false;
    const on = e => { if (!down){ down = true; held[k] = (held[k] || 0) + 1; } keys[k] = true; b.classList.add('on'); e.preventDefault(); };
    const off = e => { if (down){ down = false; held[k] = Math.max(0, (held[k] || 1) - 1); } keys[k] = held[k] > 0; b.classList.remove('on'); e.preventDefault(); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });
  // hai nút xi-nhan nhỏ trên điện thoại: chạm một lần để bật, chạm lại để tắt
  document.querySelectorAll('.sbtn').forEach(b => {
    b.addEventListener('pointerdown', e => { if (!S.paused) setSignal(+b.dataset.s); e.preventDefault(); });
  });
  isTouch = ('ontouchstart' in window) || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  if (isTouch) document.body.classList.add('touch');
  $('go').addEventListener('click', () => { S.xungho = $('xungho').value; S.assist = !!$('assist').checked; save(); closeOverlay('start');
    SND.init(); if (S.suspended) showSuspend(); else SND.announceTrip(); });
  $('helpBtn').addEventListener('click', () => openOverlay('start'));
  // âm thanh: trình duyệt chỉ cho phát tiếng sau khi người chơi bấm hoặc gõ phím
  // iPhone chỉ cho bật tiếng khi nhấc tay khỏi màn hình (touchend) hoặc bấm (click), không phải lúc vừa chạm xuống
  const unlock = () => { SND.init(); syncSound(); };
  window.addEventListener('touchend', unlock); window.addEventListener('click', unlock); window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) SND.init(); });
  const syncSound = () => { $('soundBtn').textContent = S.sound.on ? '🔊' : '🔇'; $('sndOn').checked = S.sound.on;
    $('sndFx').value = S.sound.fx; $('sndVoice').value = S.sound.voice; $('sndNpc').value = S.sound.npc; $('sndBike').value = S.sound.bike || 'so'; $('sndStatus').textContent = SND.audioStatus() + ' ' + SND.voiceStatus(); };
  syncSound();
  $('soundBtn').addEventListener('click', () => { SND.init(); syncSound(); $('soundPanel').classList.toggle('open'); });
  $('sndOn').addEventListener('change', () => { S.sound.on = $('sndOn').checked; if (!S.sound.on) SND.stopVoice(); SND.applyVolume(); syncSound(); save(); });
  $('sndFx').addEventListener('input', () => { S.sound.fx = +$('sndFx').value; SND.applyVolume(); save(); });
  $('sndVoice').addEventListener('input', () => { S.sound.voice = +$('sndVoice').value; save(); });
  $('sndNpc').addEventListener('input', () => { S.sound.npc = +$('sndNpc').value; save(); });
  $('sndBike').addEventListener('change', () => { S.sound.bike = $('sndBike').value; save(); });
  $('sndTest').addEventListener('click', () => { SND.init(); SND.reward(2); say({name:'Bác xe ôm', follow:true}, fill('Chào {x}! Đi đường nhớ nhường nhịn nha, nhanh một phút chậm cả đời đó.'));
    setTimeout(() => SND.speak('Còn 100 mét nữa, rẽ phải vào Đường Cầu Vồng', true), 4200); });
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
window.__TP = {say, voiceOf, SND, QUIZ, suspendLicense, S, player, npcs, peds, keys, step, classify, lightOf, LIGHTS, RB, violate, newTrip, render, resize, computeRoute, DESTS, BAYS, lineType, navText, HALF, OW, setSignal, SIGNBOARDS, speedInfo, SPEED_SIGNS, SCHOOL, LAW, VMAX};
