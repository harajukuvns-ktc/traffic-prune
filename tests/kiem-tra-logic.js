const {TP} = require('./harness.js');
const {S, player, npcs, keys, step, lightOf, DESTS, computeRoute, navText, render, classify, BAYS, HALF} = TP;
// đèn và vòng xuyến của khu phố lấy từ bản đồ dữ liệu (bộ cũ LIGHTS, RB đã xoá ở bản 1.1 bước 7)
const LIGHTS = TP.MAP.lights, RB = TP.MAP.rings[0];
const dt = 1/60;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ĐẠT ' : 'LỖI ') + m); if (!c) fails++; };
const run = sec => { for (let i = 0; i < sec/dt; i++) step(dt); };
const reset = () => { if (S.veh !== 'bike') TP.setVehicle('bike'); for (const k in keys) keys[k] = false; S.pts = 12; S.suspended = false; S.paused = false; S.stats = {}; S.faultUntil = -1; S.sideEp = S.wwEp = S.ringEp = false;
  S.wrongT = 0; S.solidT = 0; S.okT = 5; S.pedEp = false; S.pedCool = -99; S.spdSec = ''; S.spdSaid = false; S.camCool = -99; S.lastSteer = -99; S.spdT = 0; S.spdMax = 0; S.spdLimit = 40; S.turn = 0; S.sigAcc = 0; S.sigInJ = false; S.sigEp = false; S.sigStraightT = 0; S.turnBegan = false; S.sigRunT = 0; S.ringWrongT = 0; S.bubble = null; S.assist = true; S.crashCool = -1; player.stun = 0; S.parkDirBay = null;
  S.helmet = true; S.noHelmT = 0; S.helmSaidT = -99; S.csgtT = {}; S.call = null; S.callAt = -1; S.callIn = 99; S.cult = 70; S.statsBy.car = {};
  for (const p of TP.peds) if (p.cross){ p.x = p.x0; p.y = p.y0; p.dir = 1; p.wait = 999; p.stopT = 0; } /* người qua vạch đứng chờ ở lề, để các bài thử cũ không bị họ chen vào */ S.ptsBy.car = 12; S.belt = false; };
const clearNear = (x, y, r) => { for (const q of npcs) if (Math.hypot(q.x - x, q.y - y) < r){ q.hidden = true; q.respawnT = 99; } };
const dest = name => DESTS.find(d => d.name.includes(name));
S.paused = false;
render(dt);

// 1) Người chơi đỗ trong ô P lúc bắt đầu: giao thông chạy 5 phút, không ai kẹt vì người chơi
ok(classify(player.x, player.y).t === 'bay', 'người chơi bắt đầu trong ô đỗ xe');
const start = npcs.map(n => ({d:0}));
let nan = false, blockedByPlayer = 0;
for (let i = 0; i < 300/dt; i++){
  const before = npcs.map(n => [n.x, n.y]);
  step(dt);
  npcs.forEach((n, k) => { start[k].d += Math.hypot(n.x - before[k][0], n.y - before[k][1]);
    if (n.blockedBy === player) blockedByPlayer++; if (!isFinite(n.x) || !isFinite(n.y)) nan = true; });
}
ok(!nan, 'không có toạ độ lỗi (NaN)');
ok(Math.min(...start.map(s => s.d)) > 2000, `mọi NPC đều di chuyển trong 5 phút (ít nhất ${Math.round(Math.min(...start.map(s => s.d)))} px)`);
ok(blockedByPlayer === 0, 'xe đỗ trong ô P không cản NPC nào');
ok(Object.keys(S.stats).length === 0, 'đỗ yên trong ô P thì không bị phạt');

// NPC không vượt đèn đỏ: đầu xe không vượt qua vạch dừng khi đèn đỏ
let npcRed = 0;
const SD = 80;   // vạch dừng cách tâm ngã tư
const nose = n => ({x: n.x + Math.cos(n.a)*n.len/2, y: n.y + Math.sin(n.a)*n.len/2});
for (let i = 0; i < 180/dt; i++){
  const snap = npcs.map(n => nose(n)), c0 = npcs.map(n => [n.x, n.y]);
  step(dt);
  npcs.forEach((n, k) => { if (n.hidden || n.ghostT > 0 || Math.hypot(n.x - c0[k][0], n.y - c0[k][1]) > 20) return; const p = snap[k], q = nose(n);
    for (const L of LIGHTS) for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const lat = dx ? Math.abs(q.y - L.y) : Math.abs(q.x - L.x); if (lat >= 40) continue;
      const sx = L.x - dx*SD, sy = L.y - dy*SD;
      const b = (p.x - sx)*dx + (p.y - sy)*dy, a = (q.x - sx)*dx + (q.y - sy)*dy;
      if (b < 0 && a >= 0 && lightOf(L, dx ? 'EW' : 'NS', S.now) === 'red') npcRed++;
    } });
}
ok(npcRed === 0, `NPC không vượt vạch dừng khi đèn đỏ (đếm được ${npcRed})`);

// 2) Vượt đèn đỏ
reset();
const L0 = LIGHTS[0];
while (lightOf(L0, 'EW', S.now) !== 'red' || lightOf(L0, 'EW', S.now + 2) !== 'red') run(0.1);
clearNear(260, 320, 220);
player.x = 250; player.y = 320; player.a = 0; player.v = 100; keys.up = true;
run(0.9); keys.up = false;
ok(S.stats.red === 1, `vượt đèn đỏ bị phạt (red=${S.stats.red})`);
ok(S.bubble && S.bubble.text.length > 10, 'NPC nói câu nhắc: "' + (S.bubble && S.bubble.text) + '"');

// 2b) Dừng đúng trước vạch dừng thì không bị phạt
reset();
while (lightOf(L0, 'EW', S.now) !== 'red' || lightOf(L0, 'EW', S.now + 3) !== 'red') run(0.1);
clearNear(260, 320, 220);
player.x = 300; player.y = 320; player.a = 0; player.v = 0;
run(2);
ok(!S.stats.red, 'đứng chờ ngay trước vạch dừng không bị phạt');

// 3) Phố Chợ là phố đi bộ (biển cấm xe máy): chạy xe máy vào thì bị phạt đi vào đường cấm
reset(); clearNear(800, 500, 300);
{ const m0 = S.money, p0 = S.pts;
  player.x = 800; player.y = 330; player.a = Math.PI/2; player.v = 80; keys.up = true;
  run(1.5); keys.up = false;
  ok(S.stats.noentry === 1, `đi vào phố đi bộ bị phạt (noentry=${S.stats.noentry})`);
  ok(m0 - S.money >= 2000000 && p0 - S.pts === 2, `mức phạt 2–3 triệu, trừ 2 điểm (tiền ${m0 - S.money}, điểm ${p0 - S.pts})`); }
reset(); clearNear(800, 500, 300);
player.x = 800; player.y = 500; player.a = Math.PI/2; player.v = 80; keys.up = true;
run(0.8); keys.up = false;
ok(S.stats.noentry === 1, 'chạy giữa phố đi bộ chỉ bị phạt một lần, không phạt lặp');
reset(); clearNear(700, 320, 300);
player.x = 700; player.y = 320; player.a = 0; player.v = 80; keys.up = true;
run(1.5); keys.up = false;
ok(!S.stats.noentry, 'đi trên đường Hoa Sữa ngang qua đầu phố đi bộ không bị phạt');

// 4) Vạch liền: sang phần đường ngược chiều gần ngã tư thì bị phạt "đè vạch liền"
reset(); S.assist = false; clearNear(500, 290, 250);
player.x = 470; player.y = 284; player.a = 0; player.v = 90; keys.up = true;
run(0.6); keys.up = false;
ok(S.stats.line === 1 && !S.stats.lane, `đè vạch liền bị phạt (line=${S.stats.line}, lane=${S.stats.lane})`);

// 4b) Vạch đứt: cắt qua trong thời gian ngắn thì không bị phạt
reset(); S.assist = false; clearNear(620, 290, 250);
player.x = 560; player.y = 284; player.a = 0; player.v = 60;
for (let i = 0; i < 2/dt; i++){ player.v = 60; step(dt); }
ok(!S.stats.line && !S.stats.lane, 'qua vạch đứt 2 giây không bị phạt');
// 4c) Vạch đứt nhưng chạy lâu bên phần đường ngược chiều thì bị phạt
reset(); S.assist = false; clearNear(900, 290, 650);
player.x = 840; player.y = 284; player.a = 0; player.v = 40;
for (let i = 0; i < 4.2/dt; i++){ player.v = 40; step(dt); }
ok(S.stats.lane === 1 && !S.stats.line, `chạy lâu bên phần đường ngược chiều bị phạt (lane=${S.stats.lane}, line=${S.stats.line}, x=${Math.round(player.x)})`);

// 4d) Trợ lái: thả tay lái, xe tự về làn và không bị phạt ở đoạn vạch đứt
reset(); clearNear(700, 300, 300);
player.x = 560; player.y = 290; player.a = 0.1; player.v = 80; keys.up = true;
run(2.5); keys.up = false;
ok(!S.stats.lane && !S.stats.line && Math.abs(player.y - 320) < 6, `trợ lái đưa xe về giữa làn (y=${player.y.toFixed(1)}, hướng=${player.a.toFixed(2)})`);
// 4e) Đi đúng làn qua cả đoạn vạch liền
reset(); clearNear(1000, 320, 400);
player.x = 850; player.y = 320; player.a = 0; player.v = 90; keys.up = true;
run(2.4); keys.up = false;
ok(!S.stats.lane && !S.stats.line, 'đi đúng làn không bị phạt');

// 4f) Rời ô đỗ chỉ bằng phím ga: trợ lái đưa xe nhập làn, không leo vỉa hè
reset(); clearNear(650, 320, 400);
{ const b0 = DESTS[0].bay; player.x = b0.cx; player.y = b0.cy; player.a = 0; player.v = 0; keys.up = true; let off = 0;
  for (let i = 0; i < 3.5/dt; i++){ step(dt); if (classify(player.x, player.y).t === 'off') off++; }
  keys.up = false;
  ok(off === 0 && Math.abs(player.y - 320) < 8 && !S.stats.lane && !S.stats.line, `rời ô đỗ bằng phím ga: xe nhập làn (y=${player.y.toFixed(1)}, leo vỉa hè ${off} khung hình)`); }

// 5) Vòng xuyến
reset();
const n = npcs.find(q => !q.hidden);
const th = Math.atan2(-74, -20) + 0.5;
player.x = 1180; player.y = RB.y - RB.rOut - 6; player.a = Math.PI/2; player.v = 60; keys.up = true;
for (let i = 0; i < 20 && !S.stats.ring; i++){ n.x = RB.x + 76*Math.cos(th); n.y = RB.y + 76*Math.sin(th); n.v = 80; n.ghostP = 3; step(dt); }
keys.up = false;
ok(S.stats.ring === 1, `không nhường đường ở vòng xuyến bị phạt (ring=${S.stats.ring})`);

// 6) Gây kẹt xe khi đang vi phạm thì phải đền
reset(); S.assist = false;
for (const q of npcs) if (q.hidden) q.respawnT = 0;
player.x = 11; player.y = 11; player.v = 0; run(25);
reset(); S.assist = false;
const before = S.money;
player.x = 950; player.y = 320; player.a = Math.PI; player.v = 18;
for (let i = 0; i < 30/dt; i++){ keys.up = true; step(dt); if (Math.abs(player.v) > 18) player.v = 18; }
keys.up = false;
console.log('   thống kê kịch bản kẹt xe:', JSON.stringify(S.stats), 'tiền mất:', before - S.money);
ok((S.stats.lane || 0) + (S.stats.line || 0) >= 1, 'chạy ngược trên làn của người khác bị phạt');
ok((S.stats.affected || 0) >= 1, `có người bị ảnh hưởng và được đền (số người: ${S.stats.affected || 0})`);

// 7) Giao hàng: phải đỗ trong ô P của điểm giao
reset(); run(7);
S.streak = 0; S.trip.clean = true;
let d = S.trip.dest, m0 = S.money;
player.x = d.bay.proj.x; player.y = d.bay.proj.y; player.v = 0;   // dừng trên đường cạnh điểm giao: chưa tính
step(dt);
ok(S.money === m0 && S.trip.dest === d, 'dừng ngoài đường cạnh điểm giao thì chưa giao được');
player.x = d.bay.cx; player.y = d.bay.cy; player.v = 0; player.a = Math.atan2(d.bay.dir.y, d.bay.dir.x);
step(dt);
ok(S.money > m0 && S.streak === 1, `đỗ vào ô P thì giao hàng thành công, được trả ${S.money - m0}đ`);

// 8) Chỉ đường
reset();
const setTrip = name => { S.trip = {dest: dest(name), fx: player.x, fy: player.y, clean: true, t0: S.now}; S.route = computeRoute(); return S.route; };
player.x = 600; player.y = 320; player.a = 0; player.v = 0;
let r = setTrip('Cà phê');
ok(r && r.instr.type === 'right' && r.instr.street === 'Đường Cầu Vồng' && Math.abs(r.instr.dist - 560) < 5, `từ Hoa Sữa tới Cà phê Hẻm Nhỏ: ${navText().main}`);
player.x = 1220; player.y = 600; player.a = Math.PI/2;
r = setTrip('Cà phê');
ok(r.instr.type === 'ring' && r.instr.exitNo === 1, `xuống vòng xuyến để rẽ sang Me Chua hướng tây: ${navText().main}`);
r = setTrip('Tiệm thuốc');
ok(r.instr.type === 'ring' && r.instr.exitNo === 3, `xuống vòng xuyến để sang Me Chua hướng đông: ${navText().main}`);
player.x = 600; player.y = 320; player.a = 0;
r = setTrip('Chợ Hoa Sữa');
console.log('   tới Chợ Hoa Sữa (bãi đỗ cổng chợ trên Me Chua):', navText().main, '| còn', Math.round(r.remain), 'px');
ok(r.pts.every(p => classify(p.x, p.y).t !== 'ped'), 'chỉ đường không bao giờ đi xuyên qua phố đi bộ');
player.x = 700; player.y = 320; player.a = 0;
r = setTrip('bánh mì');
ok(r.instr.type === 'uturn', `điểm giao ở phía sau: ${navText().main}`);
player.x = 500; player.y = 320; player.a = 0;
r = setTrip('bánh mì');
ok(r.instr.type === 'arrive' && r.instr.side === 'phải', `điểm giao phía trước bên phải: ${navText().main}`);
player.x = 1180; player.y = 740; player.a = Math.PI/2;
r = setTrip('trà đá');
ok(r.instr.type === 'ring', `đang ở đoạn vạch liền trước vòng xuyến, cần quay lại: ${navText().main}`);
player.x = 700; player.y = 280; player.a = Math.PI;
r = setTrip('bánh mì');
ok(r.instr.type !== 'arrive' && /Quay đầu/.test(navText().main), `điểm giao ở lề bên kia đường thì phải quay đầu để đỗ đúng chiều: ${navText().main}`);
// mọi ô đỗ nằm trên lòng đường, sát mép vỉa hè, không lấn lên vỉa hè
ok(BAYS.every(b => { const c = classify(b.cx, b.cy); return c.t === 'bay'; }) &&
   BAYS.every(b => b.w > b.h ? Math.abs((b.side === 'S' ? b.y + b.h : b.y) - (b.proj.y + (b.side === 'S' ? HALF : -HALF))) < 0.5
                             : Math.abs((b.side === 'E' ? b.x + b.w : b.x) - (b.proj.x + (b.side === 'E' ? 1 : -1) * TP.MAP.road(b.road).half)) < 0.5),
   'ô đỗ kẻ trên lòng đường, sát mép vỉa hè');
// Đỗ trong ô P: đúng chiều thì không nhắc; ngược chiều thì chỉ nhắc (không phạt tiền, không trừ điểm), chuyến không sạch
{ const D = DESTS.find(d => d.bay.side === 'S');
  reset(); S.trip.dest = D; S.trip.clean = true;
  player.x = D.bay.cx; player.y = D.bay.cy; player.a = 0; player.v = 0; step(dt); step(dt);
  ok(!S.stats.parkdir, 'đỗ đúng chiều trong ô P: không bị nhắc');
  reset(); const other = DESTS.find(d => d !== D); S.trip.dest = other; S.trip.clean = true;
  const m0 = S.money, p0 = S.pts;
  player.x = D.bay.cx; player.y = D.bay.cy; player.a = Math.PI; player.v = 0; step(dt); step(dt); step(dt);
  ok(S.stats.parkdir === 1 && S.money === m0 && S.pts === p0 && S.trip.clean === false,
     `đỗ ngược chiều: chỉ nhắc 1 lần, không trừ tiền/điểm, chuyến không sạch (nhắc ${S.stats.parkdir}, tiền ${S.money - m0}, điểm ${S.pts - p0})`);
  reset(); S.trip.dest = D; S.trip.clean = true; const tr0 = S.trips;
  player.x = D.bay.cx; player.y = D.bay.cy; player.a = Math.PI; player.v = 0; step(dt);
  ok(S.trips === tr0 + 1 && S.stats.parkdir === 1, 'đỗ ngược chiều ở đúng điểm giao: vẫn giao được, có nhắc');
}
// mọi cặp điểm đều có đường đi hợp lệ
let bad = 0;
for (const a of DESTS) for (const b of DESTS){ if (a === b) continue;
  for (const ang of [0, Math.PI/2, Math.PI, -Math.PI/2]){
    player.x = a.bay.cx; player.y = a.bay.cy; player.a = ang;
    const q = setTrip(b.name);
    if (!q || q.pts.length < 2 || !isFinite(q.remain) || q.pts.some(p => !isFinite(p.x) || !isFinite(p.y)) || !navText().main) bad++;
  } }
ok(bad === 0, `có đường chỉ dẫn cho mọi cặp điểm giao (${bad} lỗi)`);

// 8b) Biển chỉ dẫn hướng đi trước ngã tư
{ const SB = TP.SIGNBOARDS;
  ok(SB.length >= 10 && SB.every(b => b.rows.length >= 2 && b.rows.length <= 3 && isFinite(b.x) && isFinite(b.y)), `có ${SB.length} biển chỉ dẫn, mỗi biển 2–3 hướng`);
  ok(SB.every(b => { const c = classify(b.x, b.y).t; return c === 'off'; }), 'biển chỉ dẫn đặt trên vỉa hè, không nằm giữa lòng đường');
  ok(SB.some(b => b.rows.some(r => r.ped && /Phố Chợ/.test(r.name))), 'có biển báo hướng vào Phố Chợ (đi bộ)'); }

// 8c) Xi-nhan: bật/tắt; rẽ ở ngã tư và quay đầu mà không xi-nhan thì bị phạt; có xi-nhan đúng bên thì không
const waitGreenA = () => { while (!(lightOf(LIGHTS[0], 'EW', S.now) === 'green' && lightOf(LIGHTS[0], 'EW', S.now + 5) === 'green')) run(0.1); };
const turnRight = (withSig) => {   // rẽ phải ở ngã tư Phố Bánh Mì × Hoa Sữa
  reset(); waitGreenA(); clearNear(400, 320, 500);
  player.x = 300; player.y = 320; player.a = 0; player.v = 60; S.now += 0.1;
  if (withSig){ TP.setSignal(1); for (let i = 0; i < 0.5/dt; i++){ player.v = 60; step(dt); } }
  while (player.x < 352){ player.v = 60; step(dt); }
  keys.right = true; for (let i = 0; i < 0.9/dt; i++){ player.v = 60; step(dt); } keys.right = false;
  for (let i = 0; i < 1/dt; i++){ player.v = 60; step(dt); }
};
{ reset(); TP.setSignal(-1); ok(S.turn === -1, 'bấm xi-nhan trái thì bật bên trái'); TP.setSignal(-1); ok(S.turn === 0, 'bấm lại cùng bên thì tắt');
  TP.setSignal(1); TP.setSignal(-1); ok(S.turn === -1, 'bấm bên kia thì đổi bên'); TP.setSignal(-1); }
{ const b0 = S.money, p0 = S.pts; turnRight(false);
  ok(S.stats.signal === 1 && b0 - S.money >= 600000 && b0 - S.money <= 800000 && p0 === S.pts, `rẽ phải ở ngã tư không xi-nhan bị phạt 600–800 nghìn, không trừ điểm (phạt ${b0 - S.money}đ, lỗi ${S.stats.signal})`); }
turnRight(true);
ok(!S.stats.signal && S.turn === 1, 'rẽ phải có xi-nhan phải bật trước thì không bị phạt, xi-nhan không tự tắt');
turnRight(false); // làm lại với xi-nhan SAI bên
{ reset(); waitGreenA(); clearNear(400, 320, 500); player.x = 300; player.y = 320; player.a = 0; player.v = 60; TP.setSignal(-1);
  for (let i = 0; i < 0.5/dt; i++){ player.v = 60; step(dt); }
  while (player.x < 352){ player.v = 60; step(dt); }
  keys.right = true; for (let i = 0; i < 0.9/dt; i++){ player.v = 60; step(dt); } keys.right = false;
  ok(S.stats.signal === 1, 'rẽ phải mà bật xi-nhan trái thì vẫn bị phạt'); }
// bật xi-nhan quá trễ (sau khi đã bắt đầu rẽ) vẫn bị phạt
{ reset(); waitGreenA(); clearNear(400, 320, 500); player.x = 345; player.y = 320; player.a = 0; player.v = 60;
  keys.right = true; for (let i = 0; i < 0.35/dt; i++){ player.v = 60; step(dt); } TP.setSignal(1);
  for (let i = 0; i < 0.9/dt; i++){ player.v = 60; step(dt); } keys.right = false;
  ok(S.stats.signal === 1, 'bật xi-nhan sau khi đã bắt đầu rẽ thì vẫn bị phạt'); }
// đi thẳng qua ngã tư, hoặc cắt vạch đứt để vượt: không bị phạt xi-nhan
reset(); waitGreenA(); clearNear(400, 320, 500); player.x = 300; player.y = 320; player.a = 0; player.v = 60;
for (let i = 0; i < 2.5/dt; i++){ player.v = 60; step(dt); }
ok(!S.stats.signal, 'đi thẳng qua ngã tư không cần xi-nhan');
reset(); S.assist = false; clearNear(620, 290, 400); player.x = 560; player.y = 296; player.a = 0; player.v = 60;
keys.left = true; for (let i = 0; i < 0.2/dt; i++){ player.v = 60; step(dt); } keys.left = false; keys.right = true;
for (let i = 0; i < 0.2/dt; i++){ player.v = 60; step(dt); } keys.right = false;
for (let i = 0; i < 1/dt; i++){ player.v = 60; step(dt); }
ok(!S.stats.signal, 'lách sang vạch đứt để vượt rồi về làn không bị tính là rẽ');
// quay đầu giữa đường
reset(); S.assist = false; clearNear(600, 320, 400); player.x = 600; player.y = 320; player.a = 0; player.v = 40;
keys.left = true; for (let i = 0; i < 1.6/dt; i++){ player.v = 40; step(dt); } keys.left = false;
ok(S.stats.signal === 1, `quay đầu không xi-nhan bị phạt (signal=${S.stats.signal})`);
reset(); S.assist = false; clearNear(600, 320, 400); player.x = 600; player.y = 320; player.a = 0; player.v = 40; TP.setSignal(-1);
for (let i = 0; i < 0.5/dt; i++){ player.v = 40; step(dt); }
keys.left = true; for (let i = 0; i < 1.6/dt; i++){ player.v = 40; step(dt); } keys.left = false;
ok(!S.stats.signal, 'quay đầu có xi-nhan trái thì không bị phạt xi-nhan');
// quên tắt xi-nhan: NPC nhắc, không phạt
reset(); clearNear(700, 320, 700); player.x = 450; player.y = 320; player.a = 0; player.v = 40; TP.setSignal(1); S.sigOffSaidT = -99;
{ const m0 = S.money; for (let i = 0; i < 11/dt; i++){ player.v = 40; if (player.x > 1050){ player.x = 450; } step(dt); }
  ok(!S.stats.signal && S.sigOffSaidT > 0 && S.bubble && /xi-nhan|nháy|nhấp/i.test(S.bubble.text), `quên tắt xi-nhan lâu thì NPC nhắc: "${S.bubble && S.bubble.text}"`);
  ok(S.money === m0 || S.money > m0 - 400000, 'quên tắt xi-nhan không bị phạt tiền'); }
TP.setSignal(1);

// 9) Space (phanh) không làm xe lùi
reset(); clearNear(600, 320, 300);
player.x = 560; player.y = 320; player.a = 0; player.v = 60; keys.brake = true;
let minV = 99; for (let i = 0; i < 3/dt; i++){ step(dt); minV = Math.min(minV, player.v); }
keys.brake = false;
ok(player.v === 0 && minV >= 0, `Space chỉ phanh, không lùi (vận tốc thấp nhất ${minV.toFixed(1)})`);
keys.down = true; for (let i = 0; i < 1.5/dt; i++) step(dt); keys.down = false;
ok(player.v < 0, 'phím ↓ giữ tiếp sau khi dừng thì lùi chậm');

// 10) Hết điểm GPLX: dừng ngay
reset(); S.pts = 4; S.suspended = false; S.paused = false;
player.x = 560; player.y = 320; player.a = 0; player.v = 80;
TP.violate('red');
ok(S.pts === 0 && S.suspended && S.paused && player.v === 0, `trừ hết điểm thì xe dừng ngay và game tạm dừng (điểm=${S.pts}, suspended=${S.suspended})`);
S.paused = false; keys.up = true; const x0 = player.x; run(1); keys.up = false;
ok(Math.abs(player.x - x0) < 0.01, 'khi bằng lái hết điểm, bấm ga xe vẫn đứng yên');
S.pts = 12; S.suspended = false;

// 11) Tiếng máy: xe số lên số khi tăng tốc, vòng tua tụt xuống mỗi lần lên số; xe tay ga không có số
{ const em = TP.SND.engineModel; let prev = em(0, true, 'so'), shifts = 0, drops = 0, maxR = 0, line = [];
  for (let v = 0; v <= 165; v += 1){ const m = em(v, true, 'so');
    if (m.gear > prev.gear){ shifts++; if (m.rpm < prev.rpm) drops++; }
    maxR = Math.max(maxR, m.rpm); if (v % 10 === 0) line.push(`${v}:${m.gear}/${m.rpm.toFixed(2)}`); prev = m; }
  console.log('   tốc độ:số/vòng tua →', line.join(' '));
  ok(shifts === 3 && drops === 3 && maxR <= 1, `xe số lên 3 lần số, mỗi lần vòng tua tụt xuống (lên số ${shifts}, tụt ${drops})`);
  let back = 0; for (let v = 165; v >= 0; v -= 1){ const m = em(v, false, 'so'); if (v === 0) back = m.gear; }
  ok(back === 1, 'giảm tốc về 0 thì về số 1');
  const g = [0, 60, 160].map(v => em(v, true, 'ga'));
  ok(g.every(m => m.gear === 0) && g[1].rpm > g[0].rpm && g[2].rpm > g[1].rpm, 'xe tay ga: không có số, vòng tua tăng đều'); }

// 13) Biển hạn chế tốc độ; giữa đường chỉ nhắc, camera ở vạch dừng ngã tư có đèn mới phạt nguội (bản 0.10.2)
{ const {SPEED_SIGNS, LAW, MAP} = TP; const speedInfo = (c0, x, y) => MAP.speedInfo(MAP.classify(x, y));   // giới hạn tại điểm (x, y)
  const cnt = () => ({s1: S.stats.speed1 || 0, s2: S.stats.speed2 || 0, s3: S.stats.speed3 || 0, red: S.stats.red || 0, pts: S.pts, money: S.money});
  // chạy với tốc độ giữ nguyên (km/h) từ (x,y) theo hướng a trong sec giây
  const drive = (x, y, a, kmh, sec) => { reset(); clearNear(x, y, 600); player.x = x; player.y = y; player.a = a; player.v = 0; S.money = 5000000; S.spdSec = '';
    for (let i = 0; i < sec/dt; i++){ player.v = kmh * 3; step(dt); }
    return cnt(); };
  // như drive, nhưng đợi đèn của hướng đi (axis) ở nút giao L thành màu want rồi mới chạy
  const cam = (x, y, a, kmh, sec, L, axis, want) => { reset(); clearNear(x, y, 600); player.x = x; player.y = y; player.a = a; player.v = 0; S.money = 5000000; S.spdSec = '';
    while (!(lightOf(L, axis, S.now) === want && lightOf(L, axis, S.now + 4) === want)) run(0.1);
    for (let i = 0; i < sec/dt; i++){ player.v = kmh * 3; step(dt); }
    return cnt(); };
  const A = LIGHTS[0];
  ok(SPEED_SIGNS.filter(b => b.kind === 'limit' && b.v === 30).length === 2 && SPEED_SIGNS.filter(b => b.kind === 'child').length === 2, 'khối Phố Bánh Mì có 2 biển 30 km/h và 2 biển "Trẻ em" (một biển mỗi chiều, đặt ngay sau ngã tư)');
  ok(SPEED_SIGNS.filter(b => b.v === 40).length >= 12, `đường thường có biển 40 km/h (${SPEED_SIGNS.filter(b => b.v === 40).length} biển)`);
  ok(SPEED_SIGNS.every(b => classify(b.x, b.y).t === 'off'), 'mọi biển tốc độ đặt trên vỉa hè, không nằm giữa lòng đường');
  ok(speedInfo({t:'h', Y:300}, 600, 300).limit === 40 && speedInfo({t:'v', X:400}, 400, 620).limit === 30 && speedInfo({t:'v', X:400}, 400, 400).limit === 30 && speedInfo({t:'v', X:400}, 400, 855).limit === 30 && speedInfo({t:'v', X:400}, 400, 200).limit === 40,
     'giới hạn đúng: đường thường 40, cả khối Phố Bánh Mì giữa hai ngã tư 30');
  // giữ ga hết cỡ thì tối đa 55 km/h
  reset(); clearNear(500, 320, 700); player.x = 450; player.y = 320; player.a = 0; player.v = 0; keys.up = true; run(4); keys.up = false;
  ok(player.v > 160 && player.v <= 165.5, `giữ ga thì tối đa 55 km/h (đạt ${(player.v/3).toFixed(1)} km/h)`);

  // giữa hai ngã tư: chỉ nhắc, không phạt, không mất chuyến sạch
  reset(); clearNear(450, 320, 700); player.x = 450; player.y = 320; player.a = 0; player.v = 0; S.money = 5000000; S.spdSec = ''; setTrip('Tiệm bánh mì'); S.trip.clean = true; S.bubble = null;
  for (let i = 0; i < 3.5/dt; i++){ player.v = 55 * 3; step(dt); }
  let r = cnt();
  ok(r.s1 + r.s2 + r.s3 === 0 && r.money === 5000000 && r.pts === 12, 'chạy 55 km/h giữa hai ngã tư (đường 40) không bị phạt');
  ok(S.trip.clean === true, 'chạy quá tốc độ giữa đường chỉ nhắc, chuyến vẫn là chuyến sạch');
  ok(S.bubble && S.bubble.text, 'chạy quá giới hạn liên tục 3 giây giữa đường thì có người nhắc');
  S.trip = null; S.route = null;
  r = drive(600, 320, 0, 55, 2);
  ok(r.s1 + r.s2 + r.s3 === 0, 'qua ngã tư không đèn (Phố Chợ) nhanh cũng không bị camera phạt');

  // camera tại vạch dừng ngã tư có đèn (xe đi hướng đông qua vạch dừng phía tây ngã tư A, làn bên phải là nửa phía nam)
  r = cam(250, 320, 0, 37, 1, A, 'EW', 'green');
  ok(r.s1 + r.s2 + r.s3 === 0, 'qua vạch dừng lúc đèn xanh ở 37 km/h (giới hạn 40) không bị phạt');
  r = cam(250, 320, 0, 42.5, 1, A, 'EW', 'green');
  ok(r.s1 + r.s2 + r.s3 === 0, 'qua vạch dừng vượt dưới 5 km/h (khoảng 42 km/h) không bị phạt');
  r = cam(250, 320, 0, 48, 1, A, 'EW', 'green');
  ok(r.s1 === 1 && r.s2 === 0 && r.red === 0 && r.pts === 12 && r.money === 5000000 - LAW.speed1.fine, `đèn xanh, 48 km/h: camera phạt bậc 1, ${LAW.speed1.range}, không trừ điểm (s1=${r.s1})`);
  r = cam(250, 320, 0, 54, 1, A, 'EW', 'green');
  ok(r.s2 === 1 && r.s1 === 0 && r.s3 === 0 && r.pts === 12 && r.money === 5000000 - LAW.speed2.fine, `đèn xanh, 54 km/h: camera phạt bậc 2, ${LAW.speed2.range} (s2=${r.s2})`);
  r = cam(250, 320, 0, 54, 4, A, 'EW', 'green');
  ok(r.s1 + r.s2 + r.s3 === 1, `chạy qua vạch dừng chỉ bị chụp một lần (${r.s1 + r.s2 + r.s3} lần)`);
  r = cam(250, 320, 0, 48, 1, A, 'EW', 'red');
  ok(r.red === 1 && r.s1 === 1 && r.money === 5000000 - LAW.red.fine - LAW.speed1.fine, 'vừa vượt đèn đỏ vừa quá tốc độ: bị cả hai lỗi');
  // khối Phố Bánh Mì (trường mầm non): giới hạn 30, xe đi hướng bắc (làn phía đông) vào ngã tư A
  r = cam(420, 480, -Math.PI/2, 37, 1, A, 'NS', 'green');
  ok(r.s1 === 1 && r.s2 === 0 && r.s3 === 0, `khối trường học giới hạn 30: 37 km/h (vốn là tốc độ hợp lệ ở đường thường) tới vạch dừng bị phạt bậc 1 (s1=${r.s1}, s2=${r.s2}, s3=${r.s3})`);
  r = cam(420, 480, -Math.PI/2, 43, 1, A, 'NS', 'green');
  ok(r.s2 === 1 && r.s1 === 0 && r.s3 === 0, `khối trường học, 43 km/h: vượt 10 đến 20 km/h bị phạt bậc 2 (s2=${r.s2})`);
  r = cam(420, 480, -Math.PI/2, 55, 1, A, 'NS', 'green');
  ok(r.s3 === 1 && r.pts === 12 - LAW.speed3.pts, `khối trường học, 55 km/h: vượt trên 20 km/h bị phạt bậc 3, trừ ${LAW.speed3.pts} điểm (s3=${r.s3}, điểm ${r.pts})`);
  r = cam(420, 480, -Math.PI/2, 33, 1, A, 'NS', 'green');
  ok(r.s1 + r.s2 + r.s3 === 0, 'khối trường học chạy 33 km/h tới vạch dừng (vượt dưới 5 km/h) không bị phạt');
  r = cam(420, 480, -Math.PI/2, 28, 1, A, 'NS', 'green');
  ok(r.s1 + r.s2 + r.s3 === 0, 'khối trường học chạy 28 km/h không bị phạt');
  ok(LAW_ORDER_HAS(['speed1','speed2','speed3']), 'ba bậc phạt tốc độ có trong Sổ tay');
  r = drive(450, 320, 0, 0, 2);
  ok(r.s1 + r.s2 + r.s3 === 0, 'đứng yên không bị phạt tốc độ');
}
// 14) Quay đầu, cua chậm và trợ lái không giành lái (bản 0.10.3)
{ const place = (x, y, a, v) => { reset(); clearNear(x, y, 600); player.x = x; player.y = y; player.a = a; player.v = v; S.assist = true; keys.up = keys.down = keys.brake = keys.left = keys.right = false; };
  // tự giữ ga khi cua chậm
  place(600, 320, 0, 0); keys.left = true; run(1);
  ok(player.v >= 30 && player.v <= 34, `giữ phím rẽ mà không bấm ga thì xe tự giữ khoảng 11 km/h (đạt ${(player.v/3).toFixed(1)} km/h)`);
  keys.left = false;
  place(600, 320, 0, 0); run(1);
  ok(player.v === 0, 'không bấm gì thì xe đứng yên, không tự bò');
  place(600, 320, 0, 0); keys.left = true; keys.brake = true; run(1); keys.left = keys.brake = false;
  ok(player.v === 0, 'giữ phím rẽ cùng phanh thì không tự bò');
  // quay đầu ở đoạn đường ngang: lọt lòng đường, không leo vỉa hè
  place(600, 320, 0, 0); keys.left = true;
  let minY = 999, maxY = -999, off = 0, t = 0;
  while (t < 6 && !(Math.abs(player.a) > 2.9)){ step(dt); t += dt; minY = Math.min(minY, player.y); maxY = Math.max(maxY, player.y); if (classify(player.x, player.y).t === 'off') off++; }
  keys.left = false;
  ok(Math.abs(player.a) > 2.9 && t < 6, `giữ phím rẽ là quay đầu xong trong ${t.toFixed(1)} giây (dưới 6 giây)`);
  ok(off === 0 && minY > 262 && maxY < 338, `quay đầu lọt trong lòng đường (y từ ${minY.toFixed(0)} đến ${maxY.toFixed(0)}, đường rộng 260–340), không leo vỉa hè`);
  // tốc độ cao thì tốc độ góc vẫn 2,4 rad/giây như cũ
  place(600, 320, 0, 120); keys.left = true; for (let i = 0; i < 0.5/dt; i++){ player.v = 120; step(dt); } keys.left = false;
  ok(Math.abs(player.a + 1.2) < 0.06, `ở 40 km/h tốc độ góc vẫn như cũ (0,5 giây quay ${(-player.a).toFixed(2)} rad, mong đợi khoảng 1,2)`);
  // trợ lái chờ 1 giây sau khi nhả phím rẽ (xe chạy chéo nhẹ trên làn, góc 0,12 rad)
  place(600, 318, 0.12, 60); S.lastSteer = S.now;
  for (let i = 0; i < 0.6/dt; i++){ player.v = 60; step(dt); }
  const a1 = player.a;
  for (let i = 0; i < 1.6/dt; i++){ player.v = 60; step(dt); }
  ok(Math.abs(a1 - 0.12) < 0.01 && Math.abs(player.a) < Math.abs(a1) - 0.03, `vừa nhả phím rẽ thì trợ lái chờ (0,6 giây sau góc ${a1.toFixed(2)}, 2,2 giây sau ${player.a.toFixed(2)})`);
  // đang bật xi-nhan thì trợ lái không giành lái, qua 6 giây mới nắn
  place(450, 916, -0.03, 40); S.turn = -1; S.sigOnT = S.now; S.lastSteer = -99;
  for (let i = 0; i < 3/dt; i++){ player.v = 40; step(dt); }
  const a2 = player.a;
  for (let i = 0; i < 4/dt; i++){ player.v = 40; step(dt); }
  ok(Math.abs(a2 + 0.03) < 0.01 && Math.abs(player.a - a2) > 0.05, `đang bật xi-nhan thì trợ lái không giành lái (3 giây đầu góc ${a2.toFixed(2)}), quá 6 giây mới nắn (${player.a.toFixed(2)})`);
  S.turn = 0;
}
function LAW_ORDER_HAS(a){ return a.every(k => typeof TP.LAW[k] === 'object' && TP.LAW[k].fine > 0); }

// 12) Giọng NPC: chữ hiện dần, mỗi tiếng một tiếng bíp, cao độ theo dấu thanh, mỗi kiểu nhân vật một giọng
{ reset(); const text = 'Đèn đỏ là để dừng, anh ơi, không phải để thử.';
  const c0 = TP.SND.syllableCount();
  TP.say({name: 'Bác xe ôm', x: player.x, y: player.y}, text);
  step(dt);
  const mid = S.bubble.shown;
  run(4);
  const words = text.split(/\s+/).length;
  ok(mid > 0 && mid < text.length && S.bubble && S.bubble.shown === text.length, `chữ hiện dần rồi hiện đủ (sau 1 khung hình: ${mid.toFixed(1)} ký tự)`);
  ok(TP.SND.syllableCount() - c0 === words, `mỗi tiếng một tiếng bíp (${TP.SND.syllableCount() - c0}/${words})`);
  const tm = ['má','mà','mả','mã','mạ','ma'].map(w => TP.SND.toneMark(w)).join(',');
  ok(tm === 'sac,huyen,hoi,nga,nang,ngang', 'nhận đúng 6 dấu thanh: ' + tm);
  ok(TP.voiceOf('Bác tài xe buýt').cao < TP.voiceOf('Bác xe ôm').cao && TP.voiceOf('Bác xe ôm').cao < TP.voiceOf('Cô bán xôi').cao,
     'giọng xe buýt trầm nhất, bác xe ôm trầm hơn cô bán xôi'); }

// 15) Mũ bảo hiểm, chốt CSGT và cuộc gọi của khách (bản 0.11)
{ const {CSGT, putOnHelmet, answerCall, phoneDriving, LAW, QUIZ} = TP;
  const snap = () => ({h: S.stats.helmet || 0, p: S.stats.phone || 0, pts: S.pts, money: S.money});
  // đặt xe ở (x,y) hướng a, giữ tốc độ kmh trong sec giây (xe vẫn chạy bình thường nếu bị chốt dừng lại)
  const go = (x, y, a, kmh, sec) => { clearNear(x, y, 500); player.x = x; player.y = y; player.a = a; player.v = kmh * 3; S.money = 5000000;
    for (let i = 0; i < sec/dt; i++){ if (player.stun <= 0) player.v = kmh * 3; step(dt); } };
  ok(LAW.helmet.fine === 500000 && LAW.helmet.pts === 0 && LAW.phone.fine === 900000 && LAW.phone.pts === 4, 'mức phạt mũ 500.000đ không trừ điểm, điện thoại 900.000đ trừ 4 điểm');
  ok(QUIZ.some(q => /mũ bảo hiểm/.test(q.q)) && QUIZ.some(q => /gọi điện/.test(q.q)), 'bài kiểm tra có câu về mũ bảo hiểm và điện thoại');
  ok(CSGT.length === 2, 'có hai chốt CSGT');

  // a) đầu trần qua chốt Đường Hoa Sữa: phạt, còi, dừng xe
  reset(); S.helmet = false; let b = snap(); go(940, 320, 0, 20, 1.2);
  let d = snap();
  ok(d.h === 1 && d.pts === b.pts && 5000000 - S.money === 500000, `đầu trần qua chốt: bị phạt 500.000đ, không trừ điểm (mắc ${d.h} lần, tiền ${S.money})`);
  ok(player.stun > 0 && Math.abs(player.v) < 1, 'bị CSGT dừng xe khoảng 2 giây');
  // b) đang bị dừng rồi chạy lại qua chốt thì chưa phạt lại trong 8 giây
  go(940, 320, 0, 20, 1.2); ok((S.stats.helmet || 0) === 1, 'qua lại chốt trong 8 giây không bị phạt lần hai');
  // c) đội mũ rồi thì qua chốt bình thường
  reset(); S.helmet = false; putOnHelmet(); ok(S.helmet, 'bấm Đội mũ thì đã đội mũ');
  go(940, 320, 0, 20, 1.2); ok(!(S.stats.helmet) && S.money === 5000000 && player.stun <= 0, 'đã đội mũ qua chốt: không bị phạt, không bị dừng');
  // d) chiều ngược lại và chốt thứ hai (Đường Cầu Vồng)
  reset(); S.helmet = false; go(1040, 280, Math.PI, 20, 1.5); ok(S.stats.helmet === 1, 'đầu trần chạy ngược chiều qua chốt Hoa Sữa cũng bị phạt');
  reset(); S.helmet = false; go(1180, 650, Math.PI/2, 20, 1.5); ok(S.stats.helmet === 1, 'đầu trần qua chốt Đường Cầu Vồng bị phạt');
  // e) xe đứng yên ở sát chốt không bị tính
  reset(); S.helmet = false; go(1000, 320, 0, 0, 1); ok(!(S.stats.helmet), 'đứng yên ngay chốt không bị phạt (chỉ tính khi chạy qua)');

  // f) cuộc gọi: bỏ lỡ thì không mất gì
  reset(); clearNear(450, 960, 400); player.x = 450; player.y = 960; player.v = 0; S.money = 5000000;
  S.callAt = S.now + 1; run(2); ok(S.call && S.call.state === 'ring', 'đến giờ thì điện thoại đổ chuông');
  run(13); ok(!S.call && S.stats.callMiss === 1 && S.money === 5000000 && S.pts === 12, 'không nghe máy: cuộc gọi tự tắt, không mất tiền hay điểm');
  // g) nghe máy khi đỗ trong ô P: không vi phạm, được boa
  reset(); const bay = BAYS[9]; clearNear(bay.cx, bay.cy, 400); player.x = bay.cx; player.y = bay.cy; player.a = Math.atan2(bay.dir.y, bay.dir.x); player.v = 0; S.money = 5000000;
  S.call = {state: 'ring', t: 12, ringT: 0, drove: false, fined: false, warned: false, dT: 0}; answerCall();
  let everDriving = false; for (let i = 0; i < 9/dt; i++){ step(dt); if (phoneDriving()) everDriving = true; }
  ok(S.call === null && !everDriving && S.stats.callOk === 1 && S.money === 5000000 && S.cult === 73 && S.pts === 12, `nghe máy khi đỗ trong ô P: không còn tiền boa mà được +3 văn hóa (tiền ${S.money}, văn hóa ${S.cult})`);
  // h) cầm điện thoại khi chạy qua chốt: phạt 900.000đ, trừ 4 điểm, chỉ một lần mỗi cuộc gọi
  reset(); S.call = {state: 'ring', t: 12, ringT: 0, drove: false, fined: false, warned: false, dT: 0}; answerCall();
  go(940, 320, 0, 20, 1.2); ok(phoneDriving() && S.stats.phone === 1 && S.pts === 8 && 5000000 - S.money === 900000, `vừa lái vừa nghe qua chốt: phạt 900.000đ, trừ 4 điểm (điểm ${S.pts}, tiền ${S.money})`);
  go(1040, 280, Math.PI, 20, 1.5); ok(S.stats.phone === 1, 'cùng một cuộc gọi chỉ bị phạt một lần');
  // i) camera ngã tư cũng chụp người cầm điện thoại
  reset(); S.call = {state: 'ring', t: 12, ringT: 0, drove: false, fined: false, warned: false, dT: 0}; answerCall();
  go(420, 440, -Math.PI/2, 20, 1.2); ok(S.stats.phone === 1 && S.pts <= 8, 'cầm điện thoại qua vạch dừng ngã tư có camera: bị chụp và phạt lỗi điện thoại (nếu gặp đèn đỏ thì còn lỗi đèn đỏ riêng)');
  // j) nghe máy khi đứng giữa đường (đèn đỏ) vẫn là đang lái
  reset(); S.call = {state: 'ring', t: 12, ringT: 0, drove: false, fined: false, warned: false, dT: 0}; answerCall();
  clearNear(450, 960, 400); player.x = 700; player.y = 320; player.v = 0; ok(phoneDriving(), 'đứng giữa lòng đường mà đang nghe máy vẫn tính là đang lái');
  // k) một tay cầm máy: lái khó hơn và trợ lái tắt
  const turn = hold => { reset(); clearNear(450, 320, 400); player.x = 450; player.y = 320; player.a = 0; player.v = 40 * 3; S.lastSteer = -99;
    if (hold){ S.call = {state: 'talk', t: 8, drove: false, fined: false, warned: true, dT: 0}; } keys.right = true;
    for (let i = 0; i < 0.5/dt; i++){ player.v = 120; step(dt); } keys.right = false; return player.a; };
  const aFree = turn(false), aPhone = turn(true);
  ok(aPhone < aFree * 0.85 && aPhone > 0, `cầm điện thoại thì rẽ chậm hơn (${aPhone.toFixed(2)} so với ${aFree.toFixed(2)} rad)`);
  // l) người đi đường nhắc khi đầu trần chạy lâu
  reset(); S.helmet = false; const nb = npcs[0]; nb.hidden = false; nb.v = 0; S.noHelmT = 7.9; S.helmSaidT = -99; player.x = nb.x + 100; player.y = nb.y; player.v = 60; step(dt); player.x = nb.x + 100; player.y = nb.y; player.v = 60; run(0.5);
  ok(S.helmSaidT > -99 && !(S.stats.helmet), 'đầu trần chạy lâu: người đi đường nhắc, chưa phạt');
}

// 16) Ô tô (bản 0.12)
{ const {VEH, setVehicle, speedType, lawOf, LAW, QUIZ, safetyOn, putOnHelmet, computeRoute, navText} = TP;
  const go = (x, y, a, kmh, sec) => { clearNear(x, y, 500); player.x = x; player.y = y; player.a = a; player.v = kmh * 3; S.money = 5000000;
    for (let i = 0; i < sec/dt; i++){ if (player.stun <= 0) player.v = kmh * 3; step(dt); } };
  reset(); S.pts = 9; S.stats = {red: 2};
  setVehicle('car');
  ok(S.veh === 'car' && S.pts === 12 && !S.stats.red && player.len === VEH.car.len, 'đổi sang ô tô: dùng bằng B riêng (12 điểm, thống kê riêng), xe dài hơn');
  // a) tăng tốc, tốc độ tối đa
  reset(); setVehicle('car'); clearNear(300, 920, 600); player.x = 100; player.y = 920; player.a = 0; player.v = 0; keys.up = true; run(1); const v1 = player.v; run(3.5); const vtop = player.v; keys.up = false;
  ok(v1 < 115 && v1 > 40, `ô tô tăng tốc chậm hơn xe máy (sau 1 giây: ${(v1/3).toFixed(0)} km/h)`);
  ok(vtop > 165 && vtop <= VEH.car.vmax + 0.1, `ô tô chạy được nhanh hơn 55 km/h, tối đa ${(VEH.car.vmax/3).toFixed(0)} (đạt ${(vtop/3).toFixed(0)})`);
  // b) quay vòng rộng hơn xe máy
  const radius = () => { reset(); setVehicle('car'); clearNear(400, 300, 300); player.x = 400; player.y = 278; player.a = 0; player.v = 0; keys.right = true;
    let minx = 1e9, maxx = -1e9; for (let i = 0; i < 6/dt; i++){ step(dt); minx = Math.min(minx, player.x); maxx = Math.max(maxx, player.x); }
    keys.right = false; return (maxx - minx) / 2; };
  const rCar = radius();
  ok(rCar > 18 && rCar < 32, `ô tô quay vòng chậm nhất bán kính ${(rCar/4).toFixed(1)} m (khoảng 5–8 m)`);
  // c) chỉ đường ô tô ngại quay đầu giữa đường hơn xe máy
  reset(); setVehicle('car'); clearNear(560, 320, 300); player.x = 560; player.y = 320; player.a = Math.PI; player.v = 0;
  const destPho = TP.DESTS.find(d => d.name.includes('Bưu cục')); S.trip = {dest: destPho, fx: 560, fy: 320, clean: true, t0: 0};
  const rc = computeRoute(); setVehicle('bike'); const rb = computeRoute(); setVehicle('car');
  ok(rc && rb && rc.instr.type !== 'uturn' && rb.instr.type === 'uturn', `xe máy được bảo quay đầu tại chỗ, ô tô thì được dẫn đi vòng (${rb && rb.instr.type} / ${rc && rc.instr.type})`);
  // d) dây an toàn thay mũ bảo hiểm
  reset(); setVehicle('car'); S.belt = false; S.helmet = true; ok(!safetyOn(), 'lái ô tô: đội mũ không thay được dây an toàn');
  go(940, 320, 0, 20, 1.2); ok(S.stats.belt === 1 && !S.stats.helmet && 5000000 - S.money === lawOf('belt').fine, `chưa thắt dây qua chốt CSGT: phạt lỗi dây an toàn ${lawOf('belt').fine}đ`);
  reset(); setVehicle('car'); S.belt = false; putOnHelmet(); ok(S.belt, 'bấm nút (phím H) khi lái ô tô là thắt dây an toàn');
  // e) mức phạt ô tô áp dụng: vượt đèn đỏ
  reset(); setVehicle('car'); S.belt = true; const L = LIGHTS[0]; clearNear(L.x, L.y, 400);
  while (!(lightOf(L, 'EW', S.now) === 'red' && lightOf(L, 'EW', S.now + 3) === 'red')) run(0.1);
  player.x = L.x - 150; player.y = L.y + 20; player.a = 0; S.money = 5000000; for (let i = 0; i < 2.5/dt; i++){ player.v = 60; step(dt); }
  ok(S.stats.red === 1 && 5000000 - S.money === lawOf('red').fine && lawOf('red').fine > LAW.red.fine, `ô tô vượt đèn đỏ: phạt theo mức ô tô ${lawOf('red').fine}đ (xe máy ${LAW.red.fine}đ)`);
  // f) bậc tốc độ ô tô
  ok(speedType(7) === 'speed1' && speedType(15) === 'speed2' && speedType(30) === 'speed3' && speedType(40) === 'speed4', 'ô tô có 4 bậc quá tốc độ');
  // g) phố đi bộ cấm ô tô
  reset(); setVehicle('car'); S.belt = true; go(800, 340, Math.PI/2, 15, 1.5); ok(S.stats.noentry === 1, 'ô tô chạy vào phố đi bộ: phạt lỗi đi vào đường cấm');
  // h) đỗ ngược chiều: ô tô bị phạt thật (xe máy chỉ nhắc)
  reset(); setVehicle('car'); S.belt = true; { const b = BAYS[9]; clearNear(b.cx, b.cy, 300); player.x = b.cx; player.y = b.cy; player.a = Math.atan2(-b.dir.y, -b.dir.x); player.v = 0; S.money = 5000000; run(0.5); }
  ok(S.stats.parkdir === 1 && S.money < 5000000 === !lawOf('parkdir').remind, 'ô tô đỗ ngược chiều trong ô P: xử theo mức của ô tô');
  // i) bài kiểm tra theo loại xe
  ok(QUIZ.some(q => q.veh === 'car') && QUIZ.filter(q => !q.veh || q.veh === 'car').length >= 5, 'bài kiểm tra có câu riêng cho ô tô, đủ 5 câu');
  // j) mọi lỗi ô tô đều có căn cứ
  ok(TP.LAW_ORDER_CAR.every(k => lawOf(k) && lawOf(k).ref && lawOf(k).tip), 'mọi lỗi trong sổ tay ô tô đều có căn cứ và mẹo');
  // k) ô tô giao hàng được ở ô P
  reset(); setVehicle('car'); { const d = S.trip.dest, b = d.bay; clearNear(b.cx, b.cy, 300); const trips = S.trips; player.x = b.cx; player.y = b.cy; player.a = Math.atan2(b.dir.y, b.dir.x); player.v = 0; run(0.3);
    ok(S.trips === trips + 1, 'ô tô đỗ đúng ô P của điểm giao: giao hàng thành công'); }
  setVehicle('bike');
}

// 17) Bản 0.12.1: quay đầu tự động, cước theo quãng đường, tiền boa thật, nút tắt tiếng
{
  const {uTurn, FARE_T} = TP;
  // a) xe máy trên Me Chua (y=900), đi hướng đông ở làn phải, bấm quay đầu: quay ngược hướng, ở lại trên đường, xi-nhan tự tắt
  for (const veh of ['bike', 'car']){
    reset(); if (veh === 'car') TP.setVehicle('car'); clearNear(600, 900, 400);
    player.x = 600; player.y = 920; player.a = 0; player.v = 60; keys.up = false;
    uTurn(); run(0.1); const sigOn = S.turn === -1;
    run(5);
    const heading = Math.cos(player.a), onRoad = Math.abs(player.y - 900) < 40;
    ok(sigOn && !S.ut && heading < -0.9 && onRoad && S.turn === 0, `${veh === 'car' ? 'ô tô' : 'xe máy'} quay đầu tự động: xi-nhan tự bật rồi tắt, quay ngược hướng (cos ${heading.toFixed(2)}), vẫn trong lòng đường (y ${player.y.toFixed(0)})`);
  }
  // b) bấm phanh giữa chừng thì hủy
  reset(); clearNear(600, 900, 400); player.x = 600; player.y = 920; player.a = 0; player.v = 40; uTurn(); run(0.3); keys.brake = true; run(0.1); keys.brake = false;
  ok(!S.ut && S.turn === 0, 'bấm phanh thì hủy quay đầu và tắt xi-nhan do máy bật');
  // c) cước theo quãng đường: xa hơn thì nhiều hơn; ô tô cao hơn xe máy; không còn kiểu 30.000đ cố định
  const f1 = TP.farePay('bike', 400), f2 = TP.farePay('bike', 1400), f3 = TP.farePay('car', 1400);
  ok(f1.pay >= 11500 && f2.pay > f1.pay && f2.pay < 40000 && f3.pay > f2.pay, `cước: 100 m bản đồ ${f1.pay}đ, 350 m ${f2.pay}đ (xe máy), ${f3.pay}đ (ô tô)`);
  // d) giao hàng thật: tiền công đúng bảng cước (chuyến không sạch, nên không có thưởng)
  reset(); const d = dest('Chợ'); const bay = d.bay; player.x = bay.cx; player.y = bay.cy; player.a = Math.atan2(bay.dir.y, bay.dir.x); player.v = 0;
  S.trip = {dest: d, fx: bay.cx - 600, fy: bay.cy, len: 2400, clean: false, t0: S.now}; S.route = computeRoute(); const m0 = S.money;
  run(2);
  ok(S.money - m0 === TP.farePay('bike', 2400).pay, `giao hàng nhận đúng tiền công theo quãng đường (+${S.money - m0}đ)`);
}

// 18) Bản 0.12.2: trợ lái ôm cua ở ngã tư, ô tô không kẹt ở đảo vòng xuyến
{
  // chỉ giữ ga và bật xi-nhan, không bấm nút rẽ: xe tự rẽ vào đúng làn, không bị phạt
  const autoTurn = (veh, dir) => {
    reset(); if (veh === 'car') TP.setVehicle('car'); S.assist = true; TP.putOnHelmet();
    while (!(lightOf(LIGHTS[0], 'EW', S.now) === 'green' && lightOf(LIGHTS[0], 'EW', S.now + 7.5) === 'green')) run(0.1);   // đèn xanh đủ 7,5 giây để xe ô tô bò hết cua (trước đây chỉ chờ 5 giây nên thỉnh thoảng gặp đèn đỏ)
    clearNear(400, 300, 500);
    player.x = 250; player.y = 320; player.a = 0; player.v = 90; S.now += 0.1;
    S.trip = null; S.route = null; S.ut = null; S.ta = null;   // bỏ đơn giao ngẫu nhiên: chỉ đường có lúc bảo quay đầu thì xe không ôm cua
    TP.setSignal(dir); const m0 = S.money;
    keys.up = true; let maxOff = 0, was = false;
    for (let i = 0; i < 7/dt; i++){ step(dt); if (S.ta) was = true; else if (was) keys.up = false;   // rẽ xong thì nhả ga
      // lệch sang phần đường bên kia của đường mới (sau khi ra khỏi ngã tư)
      if (dir > 0 && player.y > 345) maxOff = Math.max(maxOff, player.x - 400);
      if (dir < 0 && player.y < 255) maxOff = Math.max(maxOff, 400 - player.x);
    }
    keys.up = false;
    const sa = Math.sin(player.a), laneX = dir > 0 ? 380 : 420;
    const goodDir = dir > 0 ? sa > 0.95 : sa < -0.95;
    ok(goodDir && Math.abs(player.x - laneX) < 9 && maxOff <= 0 && m0 === S.money,
      `${veh === 'car' ? 'ô tô' : 'xe máy'} rẽ ${dir > 0 ? 'phải' : 'trái'} chỉ bằng xi-nhan + ga: vào đúng làn (x ${player.x.toFixed(0)}, cần ${laneX}), không lấn sang bên kia, không bị phạt (${Object.keys(S.stats).join(',') || 'không lỗi'})`);
  };
  autoTurn('bike', 1); autoTurn('bike', -1); autoTurn('car', 1); autoTurn('car', -1);
  // không bật xi-nhan thì không tự rẽ, đi thẳng qua ngã tư
  reset(); S.assist = true; waitGreenA(); clearNear(400, 300, 500); player.x = 250; player.y = 320; player.a = 0; player.v = 90; keys.up = true; run(3); keys.up = false;
  ok(Math.abs(Math.cos(player.a)) > 0.98 && player.x > 450, 'không bật xi-nhan thì xe đi thẳng qua ngã tư như cũ');
  // ô tô lao vào đảo giữa vòng xuyến rồi vừa ga vừa đánh lái: không kẹt
  reset(); TP.setVehicle('car'); clearNear(1200, 900, 400);
  player.x = 1080; player.y = 900; player.a = 0; player.v = 60; keys.up = true; keys.right = true; run(1.5); keys.right = false;
  const dIn = Math.hypot(player.x - RB.x, player.y - RB.y);
  keys.left = true; run(0.6); keys.left = false; const p1 = {x: player.x, y: player.y}; run(3); keys.up = false;
  const moved = Math.hypot(player.x - p1.x, player.y - p1.y);
  ok(dIn >= RB.rIn && moved > 60, `ô tô đâm vào đảo vòng xuyến không lọt vào đảo (cách tâm ${dIn.toFixed(0)}) và đi tiếp được (${moved.toFixed(0)} đơn vị trong 3 giây)`);
  TP.setVehicle('bike');
}

// ===== 19. Bản 0.12.3: tiếng máy ô tô, nút số lùi R, vô lăng =====
{
  console.log('\n== 19. Ô tô: tiếng máy, số lùi R, vô lăng ==');
  const em = TP.SND.engineModel;
  const c = [0, 60, 120, 210].map(v => em(v, true, 'car'));
  ok(c.every(m => m.gear === 0) && c[1].rpm > c[0].rpm && c[2].rpm > c[1].rpm && c[3].rpm > c[2].rpm && c[3].rpm <= 1, 'tiếng máy ô tô: không có số, vòng tua tăng đều theo tốc độ');
  let big = 0, pr = em(0, true, 'car').rpm; for (let v = 1; v <= 210; v++){ const r = em(v, true, 'car').rpm; big = Math.max(big, Math.abs(r - pr)); pr = r; }
  ok(big < 0.1, `vòng tua ô tô tăng mượt, không nhảy (bước lớn nhất ${big.toFixed(3)})`);
  ok(em(0, false, 'car').rpm < em(0, true, 'car').rpm, 'ô tô nổ không tải thấp hơn khi đạp ga');

  // nút R: đang chạy tới thì chỉ phanh, dừng hẳn rồi nhấn lại mới lùi
  reset(); TP.setVehicle('car'); clearNear(400, 600, 500);
  player.x = 400; player.y = 600; player.a = Math.PI / 2; player.v = 60; S.now += 0.1;
  keys.rev = true; run(4);
  ok(player.v === 0, `giữ R khi đang chạy tới: chỉ phanh rồi đứng yên, không tự lùi (v=${player.v.toFixed(1)})`);
  keys.rev = false; run(0.1); keys.rev = true; run(1.5);
  ok(player.v < -10, `dừng hẳn rồi nhấn R lần nữa: xe lùi (v=${player.v.toFixed(1)})`);
  keys.rev = false; run(1); keys.up = false;

  // vô lăng: bấm rẽ phải thì xoay dương, rẽ trái thì xoay âm, thả ra thì về giữa
  S.view = 'bike'; player.v = 40; keys.right = true; run(0.8); const wr = S.wheel; keys.right = false; run(1.2);
  keys.left = true; run(0.8); const wl = S.wheel; keys.left = false; player.v = 0; run(1.5);
  ok(wr > 60 && wl < -60 && Math.abs(S.wheel) < 10, `vô lăng xoay theo hướng lái (phải ${wr.toFixed(0)}°, trái ${wl.toFixed(0)}°, nhả ${S.wheel.toFixed(0)}°)`);
  S.view = 'nav'; keys.left = keys.right = keys.up = keys.rev = false;
  TP.setVehicle('bike');
}

// ===== 20. Điểm văn hóa (bản 1.0a) =====
{
  console.log('\n== 20. Điểm văn hóa ==');
  reset(); ok(S.cult === 70, 'điểm văn hóa bắt đầu ở 70');
  TP.cultAdd(-5, 't'); ok(S.cult === 65, 'trừ 5 điểm còn 65');
  S.cult = 3; TP.cultAdd(-5, 't'); ok(S.cult === 0, 'điểm văn hóa không xuống dưới 0');
  S.cult = 98; TP.cultAdd(3, 't'); ok(S.cult === 100, 'điểm văn hóa không vượt quá 100');
  const R = TP.cultRating;
  S.cult = 100; const r100 = R(10000); S.cult = 80; const r80 = R(10000); S.cult = 79; const r79 = R(10000); S.cult = 39; const r39 = R(10000); S.cult = 10; const r10 = R(10000);
  ok(r100.stars === 5 && r100.tip >= 1500 && r100.tip <= 2500 && r80.stars === 5 && r80.tip >= 500 && r80.tip <= 1500, `từ 80 điểm: 5 sao và boa thêm 10–20% cước (80: ${r80.tip}đ, 100: ${r100.tip}đ trên cước 10.000đ)`);
  ok(r79.stars === 4 && r79.tip === 0 && r39.stars === 2 && r39.tip === 0 && r10.stars === 1, `40–79: 4 sao không boa; dưới 40: 2 sao; dưới 20: 1 sao`);
  // người đi bộ trên vỉa hè: leo vỉa hè gặp người đi bộ −5
  reset(); const p0 = TP.peds[0]; player.x = p0.x; player.y = p0.y; player.v = 0; S.sidewalkSaidT = -99; step(dt);
  ok(S.cult === 65, `đụng người đi bộ trên vỉa hè: −5 văn hóa (còn ${S.cult})`);
  // chuyến giao hàng không làm phiền ai: +1; chuyến đã làm phiền: không cộng
  const giao = (cult, hurt) => { reset(); S.cult = cult; const d = DESTS[0];
    S.trip = {dest: d, fx: d.bay.cx - 200, fy: d.bay.cy, clean: false, t0: S.now, len: 800, hurt}; const m0 = S.money;
    player.x = d.bay.cx; player.y = d.bay.cy; player.v = 0; player.a = Math.atan2(d.bay.dir.y, d.bay.dir.x); step(dt); return S.money - m0; };
  giao(70, false); ok(S.cult === 71, 'chuyến không làm ai phải chờ: +1 văn hóa');
  giao(70, true); ok(S.cult === 70, 'chuyến có làm phiền người khác: không được +1');
  const g70 = giao(70, true), g90 = giao(90, true), g30 = giao(30, true);
  ok(g90 > g70 && g30 === g70, `văn hóa 90 được boa thêm (${g90}đ so với ${g70}đ), văn hóa 30 không boa thêm`);
  // làm kẹt xe (cùng kịch bản chạy ngược làn như mục 11): ai bị ảnh hưởng thì người chơi bị trừ 3 văn hóa mỗi xe
  reset(); S.assist = false; for (const q of npcs) if (q.hidden) q.respawnT = 0;
  player.x = 11; player.y = 11; player.v = 0; run(25);   // cho NPC trở lại đường như kịch bản ở mục 11
  reset(); S.assist = false; S.cult = 100;
  player.x = 950; player.y = 320; player.a = Math.PI; player.v = 18;
  for (let i = 0; i < 30/dt; i++){ keys.up = true; step(dt); if (Math.abs(player.v) > 18) player.v = 18; }
  keys.up = false;
  const aff = S.stats.affected || 0;
  ok(aff >= 1 && S.cult <= 97 && S.cult >= 100 - 3 * aff - 20, `làm kẹt xe thì mất điểm văn hóa (${aff} xe bị ảnh hưởng, văn hóa còn ${S.cult}/100)`);

  // ===== bản 1.0b: người đi bộ qua vạch, nhường và bám đuôi =====
  const cr = TP.peds.find(p => p.cross && p.hy === 300);
  const dungCr = () => { reset(); for (const q of npcs){ q.hidden = true; q.respawnT = 999; } S.cult = 70; S.assist = false;
    cr.y = 300; cr.dir = 1; cr.wait = 0; cr.cyc++; cr.stopT = 0; };   // người đang đứng giữa lòng đường, bắt đầu qua
  // a) xe đang chạy rồi dừng lại trước vạch: được +3 một lần
  dungCr(); player.x = 740; player.y = 320; player.a = 0; player.v = 60; S.lastMoveT = S.now; cr.x = 800;
  for (let i = 0; i < 3/dt; i++){ keys.brake = true; step(dt); cr.y = 300; cr.wait = 99; } keys.brake = false;
  ok(S.cult === 73, `dừng lại cho người đang qua vạch: +3 văn hóa (còn ${S.cult}/100)`);
  // b) xe đỗ sẵn gần vạch không được cộng
  dungCr(); player.x = 760; player.y = 320; player.a = 0; player.v = 0; S.lastMoveT = -99; cr.wait = 99; run(2);
  ok(S.cult === 70, 'xe đỗ sẵn gần vạch (không vừa dừng lại vì người đi bộ) không được cộng điểm');
  // c) lao qua vạch khi người đang qua: −5 một lần cho mỗi lượt qua
  dungCr(); player.x = 740; player.y = 322; player.a = 0; player.v = 90; cr.x = 800; cr.wait = 99;
  for (let i = 0; i < 2/dt; i++){ keys.up = true; step(dt); cr.y = 300; cr.wait = 99; } keys.up = false;
  ok(S.cult === 65, `lao qua vạch khi người đang qua: −5 văn hóa, chỉ một lần mỗi lượt (còn ${S.cult}/100)`);
  // d) xe NPC dừng nhường người qua vạch
  reset(); const nv = npcs.find(n => !n.hidden && n.route.pts.length > 2) || npcs[0];
  for (const q of npcs){ if (q !== nv){ q.hidden = true; q.respawnT = 999; } }
  nv.hidden = false; nv.x = 700; nv.y = 320; nv.a = 0; nv.v = 90; nv.idx = 1; nv.route = {loop: false, pts: [{x: 0, y: 320}, {x: 1500, y: 320}]}; nv.idx = 1;
  cr.x = 800; cr.y = 320; cr.wait = 99; cr.dir = 1;
  run(4); ok(nv.x < 800 - 8, `xe NPC dừng nhường người đang qua vạch (xe ở x=${nv.x.toFixed(0)}, vạch ở x=800)`);
  // e) bám đuôi: chạy sát xe phía trước bị −2, nhắc một lần mỗi 10 giây
  reset(); for (const q of npcs){ q.hidden = true; q.respawnT = 999; } S.cult = 70; S.assist = false;
  const lead = npcs[0]; lead.hidden = false; lead.route = {loop: false, pts: [{x: 0, y: 320}, {x: 1500, y: 320}]}; lead.idx = 1; lead.x = 480; lead.y = 320; lead.a = 0; lead.v = 100; lead.vmax = 100;
  player.x = 440; player.y = 320; player.a = 0; player.v = 100;
  for (let i = 0; i < 4/dt; i++){ keys.up = true; player.v = 100; lead.v = 100; step(dt); } keys.up = false;   // hai xe cùng chạy 33 km/h, cách nhau khoảng 5 m
  ok(S.cult <= 68 && S.cult >= 64, `bám đuôi xe phía trước: bị trừ văn hóa (còn ${S.cult}/100, nhắc không quá một lần mỗi 10 giây)`);
}

// 21) Bản 1.1: bộ máy bản đồ dạng dữ liệu. Bộ cũ viết tay đã xoá ở bước 7; khu hiện tại phải cho kết quả y hệt bản mẫu
//     tests/ban-mau-1.1.json (chụp lúc bộ cũ và bộ mới còn chạy song song và đã khớp nhau: phân loại từng điểm, đoạn tốc độ,
//     vạch giữa, chỉ đường 1.872 trường hợp, vị trí ô đỗ, biển, cột đèn, nhãn). Cố ý đổi khu phố thì tạo lại bằng tao-ban-mau.js.
{
  const {MAP, dungBanDo} = TP;
  const BM = require('./ban-mau.js'), mau = require('./ban-mau-1.1.json');
  const khac = BM.soSanh(mau, BM.chupKhuPho(TP));
  ok(khac.length === 0, `khu phố hiện tại khớp bản mẫu: ${mau.phanLoai.n} điểm phân loại, ${mau.vachGiua.n} mẫu vạch giữa, ${mau.chiDuong.length} trường hợp chỉ đường, ` +
     `${mau.oDo.length} ô đỗ, ${mau.bienChiDan.length} biển chỉ dẫn, ${mau.bienTocDo.length} biển tốc độ, ${mau.cotDen.length} cột đèn` + (khac.length ? ' · KHÁC: ' + khac.join(' | ') : ''));
  ok(MAP.lights.length === 3 && MAP.rings.length === 1 && MAP.corners.length === 16 && Object.keys(MAP.graph.N).length === 14 && MAP.graph.SEGS.length === 14,
     `khu hiện tại: 3 đèn, 1 vòng xuyến, ${MAP.corners.length} góc vỉa hè bo cong, đồ thị chỉ đường ${Object.keys(MAP.graph.N).length} nút / ${MAP.graph.SEGS.length} đoạn`);
  // ô đỗ khai báo theo đường: đường chéo chưa đặt được ô (bản 1.2) thì báo lỗi rõ ràng, không lặng lẽ đặt sai
  let loi = ''; try { TP.datODo(dungBanDo([{id:'P', x:0, y:0, kind:'end'}, {id:'Q', x:300, y:300, kind:'end'}], [{id:'c', a:'P', b:'Q', name:'Chéo', cap:'normal', half:40, lanes:1, limit:40}], {bays: []}), {road:'c', s:100, ben:'phai'}); } catch (e){ loi = e.message; }
  ok(/chéo/.test(loi), 'ô đỗ trên đường chéo: báo chưa làm (bản 1.2), không đặt sai chỗ');

  // Bản đồ thử có đường chéo, ngã ba lệch và một đoạn đường cong (không đưa vào bản đồ chơi ở 1.1)
  const T = dungBanDo([
    {id:'P', x:0, y:0, kind:'end'}, {id:'Q', x:400, y:300, kind:'plain'}, {id:'R', x:400, y:-200, kind:'end'},
    {id:'S', x:900, y:300, kind:'light', light:{off:0}}, {id:'U', x:1300, y:700, kind:'end'}, {id:'V', x:900, y:800, kind:'end'}
  ], [
    {id:'cheo', a:'P', b:'Q', name:'Đại lộ Chéo', cap:'normal', half:40, lanes:1, limit:40},
    {id:'doc', a:'R', b:'Q', name:'Đường Dọc', cap:'normal', half:40, lanes:1, limit:40},
    {id:'ngang', a:'Q', b:'S', name:'Đường Ngang', cap:'normal', half:40, lanes:1, limit:40},
    {id:'cong', a:'S', b:'U', name:'Đường Cong', cap:'normal', half:40, lanes:1, limit:40, via:{x:1300, y:300}},
    {id:'hem', a:'S', b:'V', name:'Hẻm Nhỏ', cap:'alley', half:20, lanes:1, limit:20, noCar:true}
  ], {bays: []});
  const ch = T.road('cheo'), mid = T.pointAt(ch, 250), c0 = T.classify(mid.x, mid.y);
  ok(c0.t === 'road' && c0.road === ch && Math.abs(c0.s - 250) < 1e-6 && Math.abs(c0.lat) < 1e-6, `đường chéo: điểm giữa đường nằm trên đường, đúng quãng (s=${c0.s && c0.s.toFixed(1)})`);
  const rgt = {x: mid.x - mid.dir.y*20, y: mid.y + mid.dir.x*20}, c1 = T.classify(rgt.x, rgt.y);
  const far = {x: mid.x - mid.dir.y*50, y: mid.y + mid.dir.x*50};
  ok(c1.road === ch && Math.abs(c1.lat - 20) < 1e-6 && T.classify(far.x, far.y).t === 'off', `đường chéo: lệch phải 5 m vẫn trên làn phải (lat=${c1.lat.toFixed(1)}), lệch 12,5 m là ra ngoài`);
  ok(T.classify(400, 300).t === 'junction' && T.nodes.Q.junction && T.nodes.S.junction, 'ngã ba lệch (đường chéo gặp đường dọc và đường ngang) được nhận là ngã tư');
  ok(T.lineAt(ch, 250) === 'broken' && T.lineAt(ch, ch.len - 100) === 'solid' && T.lineAt(ch, ch.len - 5) === 'none' && T.lineAt(ch, 5) === 'broken',
     'đường chéo: vạch đứt ở giữa, vạch liền gần ngã ba, không có vạch trong ngã ba, vạch đứt ở mép bản đồ');
  // phía còn lại của ngã ba là góc 217°, không có góc vỉa hè
  ok(T.corners.filter(c => c.node === 'Q').length === 2 && T.corners.every(c => isFinite(c.cx) && isFinite(c.cy)), `ngã ba lệch có 2 góc vỉa hè bo cong ở hai góc nhọn/vuông (${T.corners.filter(c => c.node === 'Q').length})`);
  const qc = T.corners.find(c => c.node === 'Q' && Math.abs(c.sn - 0.8) < 1e-6);
  ok(qc && T.classify(qc.ex + (qc.u.x + qc.v.x)*1.5, qc.ey + (qc.u.y + qc.v.y)*1.5).t === 'junction', 'góc nhọn 53° của ngã ba lệch: sát góc vỉa hè vẫn tính là lòng đường ngã ba');
  const cg = T.road('cong'), cm = T.pointAt(cg, cg.len/2), cc = T.classify(cm.x, cm.y), pj = T.project(cm.x + 3, cm.y - 200);
  ok(cc.t === 'road' && cc.road === cg && Math.abs(cc.lat) < 1 && pj.road === cg && cg.len > 600, `đường cong: điểm giữa nằm trên đường (dài ${Math.round(cg.len)} đơn vị, lệch ${cc.lat.toFixed(2)})`);
  const hm = T.road('hem'), hp = T.pointAt(hm, 200);
  ok(T.classify(hp.x, hp.y).road === hm && T.classify(hp.x + 30, hp.y).t === 'off' && hm.noCar, 'hẻm hẹp (nửa bề rộng 5 m), có biển cấm ô tô');
  ok(T.graph.SEGS.length === 5 && T.lights.length === 1 && T.speedInfo(c0).limit === 40, 'bản đồ thử: đồ thị 5 đoạn, 1 đèn, giới hạn tốc độ đọc được');
}

// ===== 22. Bản 1.1 bước 2: vẽ nền tĩnh từ MAP (js/ve-nen.js) =====
{
  const {veNen, MAP, NODES, ROADS, dungBanDo, NEN} = TP;
  // máy ghi lại các lệnh vẽ: mọi toạ độ phải là số hữu hạn, đếm số lần gọi từng lệnh
  const ghi = () => { const cnt = {}, bad = []; const g = new Proxy({}, {
    get(t, p){ if (p in t) return t[p]; return (...a) => { cnt[p] = (cnt[p] || 0) + 1; if (a.some(v => typeof v === 'number' && !isFinite(v))) bad.push(p); return g; }; },
    set(t, p, v){ t[p] = v; return true; } }); return {g, cnt, bad}; };
  const o = {W: 1600, H: 1200, EXT: 600, SIDE: 22, blocks: []};
  const r1 = ghi(); let err = null;
  try { veNen(r1.g, MAP, Object.assign({}, o, {blocks: TP.BLOCKS})); } catch (e){ err = e; }
  ok(!err && r1.bad.length === 0, 'vẽ nền khu hiện tại từ MAP chạy được, mọi toạ độ là số hữu hạn' + (err ? ' (' + err.message + ')' : ''));
  // mỗi góc vỉa hè 1 cung; vòng xuyến: 1 mặt đường + 2 viền đảo + 10 chấm hoa + 1 tâm = 14
  ok(r1.cnt.arc === MAP.corners.length + 14, `có vẽ ${MAP.corners.length} góc vỉa hè bo cong, vòng xuyến và đảo (${r1.cnt.arc} cung tròn)`);
  ok(r1.cnt.fillText === MAP.bays.length, `mỗi ô đỗ có chữ P (${r1.cnt.fillText} ô)`);
  // bản đồ thử có đường chéo, đường cong, hẻm, ngã ba lệch: không được lỗi hay ra số vô cùng
  const T = dungBanDo([
    {id:'P', x:0, y:0, kind:'end'}, {id:'Q', x:400, y:300, kind:'plain'}, {id:'R', x:400, y:-200, kind:'end'},
    {id:'S', x:900, y:300, kind:'light', light:{off:0}}, {id:'U', x:1300, y:700, kind:'end'}, {id:'V', x:900, y:800, kind:'end'}
  ], [
    {id:'cheo', a:'P', b:'Q', name:'Đại lộ Chéo', cap:'normal', half:40, lanes:1, limit:40},
    {id:'doc', a:'R', b:'Q', name:'Đường Dọc', cap:'normal', half:40, lanes:1, limit:40},
    {id:'ngang', a:'Q', b:'S', name:'Đường Ngang', cap:'normal', half:40, lanes:1, limit:40},
    {id:'cong', a:'S', b:'U', name:'Đường Cong', cap:'normal', half:40, lanes:1, limit:40, via:{x:1300, y:300}},
    {id:'hem', a:'S', b:'V', name:'Hẻm Nhỏ', cap:'alley', half:20, lanes:1, limit:20, noCar:true}
  ], {bays: []});
  const r2 = ghi(); err = null;
  try { veNen(r2.g, T, Object.assign({}, o, {blocks: []})); } catch (e){ err = e; }
  ok(!err && r2.bad.length === 0 && r2.cnt.stroke > 5, 'vẽ nền bản đồ thử (đường chéo, cong, hẻm, ngã ba lệch, ngã tư có đèn) chạy được' + (err ? ' (' + err.message + ')' : ''));
  // quản lý mảnh: trong Node không có canvas thật nên game phải quay về bộ vẽ cũ, không được lỗi
  let e3 = null; try { render(0.016); } catch (e){ e3 = e; }
  ok(!e3 && NEN.tiles.size === 0, 'không có canvas thật (Node): render() bỏ qua vẽ nền, không lỗi, không tạo mảnh');
}

// ===== 23. Bản 1.1 bước 3: chỉ đường trên MAP (computeRouteMap) =====
{
  const {computeRouteMap, dungBanDo, setVehicle} = TP;
  const saved = {x: player.x, y: player.y, a: player.a, trip: S.trip, veh: S.veh};
  // (đối chiếu với bộ chỉ đường cũ ở 1.872 trường hợp nay nằm trong bản mẫu, mục 21)
  // bản đồ thử: ngã năm có đèn (có đại lộ chéo), vòng xuyến 3 lối, đường cong, hẻm cấm ô tô, phố một chiều
  const RD = (id, a, b, name, more) => Object.assign({id, a, b, name, cap:'normal', half:40, lanes:1, limit:40}, more || {});
  const T = dungBanDo([
    {id:'O', x:1000, y:1000, kind:'light', light:{off:0}},
    {id:'W', x:200, y:1000, kind:'end'}, {id:'S', x:1000, y:1800, kind:'end'}, {id:'N', x:1000, y:400, kind:'plain'},
    {id:'NE', x:1500, y:600, kind:'end'}, {id:'R', x:1800, y:1000, kind:'ring', ring:{rOut:100, rIn:48, rLane:76}},
    {id:'RE', x:2400, y:1000, kind:'end'}, {id:'RS', x:1800, y:1600, kind:'end'}, {id:'N1', x:1000, y:0, kind:'end'}, {id:'NW', x:400, y:400, kind:'end'}
  ], [
    RD('ow','W','O','Đường Tây'), RD('os','O','S','Đường Nam'), RD('on','O','N','Đường Bắc'), RD('cheo','O','NE','Đại lộ Chéo'), RD('oe','O','R','Đường Đông'),
    RD('re','R','RE','Đường Xa'), RD('cong','R','RS','Đường Cong', {via:{x:2100, y:1400}}), RD('n1','N','N1','Đường Bắc'),
    RD('hem','N','NW','Hẻm Nhỏ', {cap:'alley', half:20, limit:20, noCar:true}), RD('mot','RS','S','Phố Một Chiều', {oneway:true})
  ], {bays: []});
  const bayOn = (r, s, right) => { const p = T.pointAt(T.road(r), s), d = right ? p.dir : {x: -p.dir.x, y: -p.dir.y};
    return {name: 'thử', bay: {proj: {x: p.x, y: p.y}, cx: p.x - d.y*30, cy: p.y + d.x*30, dir: d}}; };
  const go = (x, y, a, dest, veh) => { setVehicle(veh || 'bike'); player.x = x; player.y = y; player.a = a; S.trip = {dest, fx: x, fy: y, clean: true, t0: S.now}; return computeRouteMap(T); };
  const trenDuong = r => { for (let i = 1; i < r.pts.length - 1; i++){ const a = r.pts[i-1], b = r.pts[i];
    for (let k = 0; k <= 10; k++) if (T.classify(a.x + (b.x - a.x)*k/10, a.y + (b.y - a.y)*k/10).t === 'off') return false; } return true; };
  let r = go(400, 1020, 0, bayOn('cheo', 300, true));
  ok(r && r.instr.type === 'bearleft' && r.instr.street === 'Đại lộ Chéo' && trenDuong(r), `ngã năm, từ Đường Tây vào đại lộ chéo (lệch 39°): ${r && r.instr.type}`);
  r = go(400, 1020, 0, bayOn('oe', 400, true));
  ok(r && r.instr.type === 'straight' && r.instr.street === 'Đường Đông', `ngã năm, đi thẳng mà có đại lộ chéo gần hướng thẳng: đọc rõ tên đường (${r && r.instr.type})`);
  r = go(400, 1020, 0, bayOn('on', 300, true)); const r2 = go(400, 1020, 0, bayOn('os', 300, true));
  ok(r && r2 && r.instr.type === 'left' && r2.instr.type === 'right', `ngã năm: rẽ trái lên Đường Bắc, rẽ phải xuống Đường Nam (${r && r.instr.type} / ${r2 && r2.instr.type})`);
  r = go(1020, 1600, -Math.PI/2, bayOn('cheo', 300, true));
  ok(r && r.instr.type === 'bearright', `từ Đường Nam đi lên đại lộ chéo (lệch 51°): chếch phải (${r && r.instr.type})`);
  r = go(1300, 1020, 0, bayOn('cong', 300, true)); const r3 = go(1300, 1020, 0, bayOn('re', 300, true));
  ok(r && r3 && r.instr.type === 'ring' && r.instr.exitNo === 1 && r3.instr.exitNo === 2 && trenDuong(r),
     `vòng xuyến 3 lối: đường cong là lối thứ ${r && r.instr.exitNo}, Đường Xa là lối thứ ${r3 && r3.instr.exitNo}; vạch chỉ đường bám theo đường cong`);
  r = go(1020, 700, -Math.PI/2, bayOn('hem', 300, true)); const rc = go(1020, 700, -Math.PI/2, bayOn('hem', 300, true), 'car');
  ok(r && r.instr.type === 'left' && rc === null, 'xe máy được dẫn vào hẻm; ô tô không bao giờ được dẫn vào hẻm cấm ô tô');
  r = go(1300, 1020, 0, bayOn('mot', 300, true)); const rm = go(1300, 1020, 0, bayOn('mot', 300, false));
  ok(r && trenDuong(r) && rm === null, 'phố một chiều: dẫn đi xuôi chiều; không dẫn đi ngược chiều');
  setVehicle(saved.veh); player.x = saved.x; player.y = saved.y; player.a = saved.a; S.trip = saved.trip; S.route = computeRoute();
}

// ===== 24. Bản 1.1 bước 4: bộ sinh lộ trình NPC =====
{
  const {MAP, NPC_GEN, npcNewRoute, npcLoopRoute, BUS_LOOPS, dungBanDo} = TP;
  TP.makeNPCs();   // các mục trên có gán tuyến tay cho vài xe; dựng lại đàn xe như lúc vào game
  ok(npcs.length === 29 && npcs.every(n => n.route.gen) && npcs.filter(n => n.kind === 'bus').length === 2,
     `NPC chạy tuyến tự sinh: ${npcs.length} xe, ${npcs.filter(n => n.kind === 'bus').length} xe buýt chạy vòng`);
  // 300 tuyến ngẫu nhiên: nằm trên mặt đường (bỏ qua phần ngoài mép bản đồ), không qua phố đi bộ, đúng làn bên phải
  const trenDuong = (M, r) => { let off = 0, ped = 0, trai = 0;
    for (let j = 1; j < r.pts.length; j++){ const a = r.pts[j-1], b = r.pts[j], L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      if (!r.loop && (j === 1 || j === r.pts.length - 1)) continue;   // đoạn vào/ra ở ngoài mép bản đồ
      for (let k = 0; k <= 6; k++){ const x = a.x + (b.x - a.x)*k/6, y = a.y + (b.y - a.y)*k/6;
        const c = M.classify(x, y);
        if (c.t === 'off' || c.t === 'island') off++; if (c.t === 'ped') ped++;
        // trên đoạn đường (ngoài nút giao): xe phải ở nửa bên phải theo chiều đi
        if (c.road && c.dir){ const fw = ((b.x - a.x)*c.dir.x + (b.y - a.y)*c.dir.y) / L; if (Math.abs(fw) > 0.9 && c.lat * fw < 2) trai++; } }
      // không có chỗ đi giật lùi (hai đoạn liền nhau ngược hướng)
      if (j >= 2){ const z = r.pts[j-2], u = {x: a.x - z.x, y: a.y - z.y}; if (u.x*(b.x - a.x) + u.y*(b.y - a.y) < 0 && Math.hypot(u.x, u.y) > 0.5) off++; } }
    return {off, ped, trai}; };
  let off = 0, ped = 0, trai = 0, thang = 0, vong = 0, re = 0;
  for (let i = 0; i < 300; i++){ const r = npcNewRoute(MAP, 'bike'), t = trenDuong(MAP, r); off += t.off; ped += t.ped; trai += t.trai;
    if (r.straight) thang++; if (r.nodes.includes('F')) vong++; else if (!r.straight) re++; }
  ok(off === 0 && ped === 0 && trai === 0, `300 tuyến tự sinh nằm trên mặt đường, đúng làn bên phải, không qua phố đi bộ (ngoài đường ${off}, phố đi bộ ${ped}, sai làn ${trai})`);
  ok(thang > 110 && thang < 190 && vong > 30 && re > 30, `khoảng một nửa đi thẳng một mạch (${thang}/300), có xe rẽ (${re}) và qua vòng xuyến (${vong})`);
  ok(BUS_LOOPS.every(ids => { const r = npcLoopRoute(MAP, ids, 'bus'), t = trenDuong(MAP, r); return r.loop && t.off === 0 && t.trai === 0; }), 'tuyến xe buýt chạy vòng nằm trên mặt đường, đúng làn');
  const r0 = npcNewRoute(MAP, 'bike');
  ok(MAP.lights.every(L => { for (let i = 0; i < 200; i++){ const r = npcNewRoute(MAP, 'bike'); if (r.pts.some(p => p.stop && p.stop.L === L)) return true; } return false; }),
     'tuyến đi qua ngã tư có đèn mang mốc vạch dừng của đúng đèn đó');
  // bản đồ thử: ngã năm có đèn, đại lộ chéo, vòng xuyến 3 lối, đường cong; một xe NPC chạy hết tuyến không kẹt
  const RD = (id, a, b, name, more) => Object.assign({id, a, b, name, cap:'normal', half:40, lanes:1, limit:40}, more || {});
  const T = dungBanDo([
    {id:'O', x:1000, y:1000, kind:'light', light:{off:0}}, {id:'W', x:200, y:1000, kind:'end'}, {id:'S', x:1000, y:1800, kind:'end'},
    {id:'N', x:1000, y:200, kind:'end'}, {id:'NE', x:1500, y:600, kind:'end'}, {id:'R', x:1800, y:1000, kind:'ring', ring:{rOut:100, rIn:48, rLane:76}},
    {id:'RE', x:2400, y:1000, kind:'end'}, {id:'RS', x:1800, y:1600, kind:'end'}
  ], [
    RD('ow','W','O','Đường Tây'), RD('os','O','S','Đường Nam'), RD('on','O','N','Đường Bắc'), RD('cheo','O','NE','Đại lộ Chéo'), RD('oe','O','R','Đường Đông'),
    RD('re','R','RE','Đường Xa'), RD('cong','R','RS','Đường Cong', {via:{x:2100, y:1400}})
  ], {bays: []});
  let toff = 0, ttrai = 0, cheo = 0, cong = 0;
  for (let i = 0; i < 200; i++){ const r = npcNewRoute(T, 'bike'), t = trenDuong(T, r); toff += t.off; ttrai += t.trai;
    if (r.nodes.includes('NE')) cheo++; if (r.nodes.includes('RS')) cong++; }
  ok(toff === 0 && ttrai === 0 && cheo > 10 && cong > 10, `bản đồ thử: 200 tuyến trên mặt đường, đúng làn, có đi đại lộ chéo (${cheo}) và đường cong (${cong}) (ngoài đường ${toff}, sai làn ${ttrai})`);
  reset(); for (const q of npcs){ q.hidden = true; q.respawnT = 999; }
  const sv = {x: player.x, y: player.y}; player.x = -5000; player.y = -5000;
  let chay = 0, xong = 0;
  for (let i = 0; i < 6; i++){
    const rt = npcNewRoute(T, 'bike'), q = npcs[i], p0 = rt.pts[0];
    Object.assign(q, {route: rt, idx: 1, x: p0.x, y: p0.y, v: 60, hidden: false, respawnT: 0, ghostT: 0, ghostP: 0, waitT: 0, blockedBy: null});
    q.a = Math.atan2(rt.pts[1].y - p0.y, rt.pts[1].x - p0.x);
    for (let k = 0; k < 90/dt && !q.hidden; k++) step(dt);
    chay++; if (q.hidden) xong++; q.respawnT = 999; q.hidden = true;
  }
  ok(xong === chay, `bản đồ thử: xe NPC chạy hết tuyến (qua đèn, ngã năm, vòng xuyến, đường cong) trong 90 giây (${xong}/${chay})`);
  player.x = sv.x; player.y = sv.y; reset();
}

// ===== 25. Bản 1.1 bước 5: bắt lỗi theo hướng đường, trên bản đồ thử có ngã năm, đại lộ chéo, hẻm cấm ô tô, phố một chiều =====
console.log('\n== 25. Bắt lỗi theo hướng đường (bản đồ thử) ==');
{
  const {dungBanDo, useMap, getMap, setVehicle, lightOf, playerLightAhead, setSignal} = TP;
  const RD = (id, a, b, name, more) => Object.assign({id, a, b, name, cap:'normal', half:40, lanes:1, limit:40}, more || {});
  // Đặt xa khu phố cũ (x từ 3000 trở lên) để không đụng nhà, đảo vòng xuyến, chốt CSGT, người qua vạch của khu cũ
  const T = dungBanDo([
    {id:'O', x:3600, y:1000, kind:'light', light:{off:0}},
    {id:'W', x:3000, y:1000, kind:'end'}, {id:'E', x:4400, y:1000, kind:'end'}, {id:'N', x:3600, y:400, kind:'end'}, {id:'NE', x:4000, y:600, kind:'end'},
    {id:'S', x:3600, y:1600, kind:'plain'}, {id:'S2', x:3600, y:2200, kind:'end'}, {id:'H', x:4400, y:1600, kind:'end'},
    {id:'K', x:3000, y:2600, kind:'end'}, {id:'L', x:4400, y:2600, kind:'end'}
  ], [
    RD('ow','W','O','Đường Tây'), RD('oe','O','E','Đường Đông'), RD('on','O','N','Đường Bắc'), RD('cheo','O','NE','Đại lộ Chéo'),
    RD('os','O','S','Đường Nam'), RD('os2','S','S2','Đường Nam'),
    RD('hem','S','H','Hẻm Nhỏ', {cap:'alley', half:20, limit:20, noCar:true}),
    RD('mot','K','L','Phố Một Chiều', {oneway:true})
  ], {bays: [], W: 5000, H: 3000});
  // chốt CSGT và vạch qua đường khai báo theo {đường, quãng s}: vị trí tính ra phải đúng như toạ độ viết tay của bộ cũ
  const {CSGT, CROSSWALKS} = TP, eq = (p, x, y) => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6;
  ok(eq(CSGT[0], 990, 300) && eq(CSGT[0].cabinPt, 990, 352) && eq(CSGT[1], 1200, 700) && eq(CSGT[1].cabinPt, 1150, 700) && CSGT.every(p => p.half === 40),
    'chốt CSGT tính từ dữ liệu đường đúng chỗ cũ (Hoa Sữa x=990, Cầu Vồng y=700, chòi bên phải)');
  ok(eq(CROSSWALKS[0], 800, 300) && eq(CROSSWALKS[1], 800, 900) && TP.peds.filter(p => p.cross).every(p => Math.abs(p.x0 - 800) < 1e-6 && Math.abs(p.y1 - p.y0 - 104) < 1e-6),
    'vạch qua đường ở hai đầu Phố Chợ tính từ dữ liệu đúng chỗ cũ (x=800, người đi từ lề này sang lề kia 104 đơn vị)');
  ok(T.nodes.O.junction && T.nodes.O.arms.length === 5 && T.stopLines.length === 5, `ngã năm có đèn: 5 nhánh, mỗi nhánh một vạch dừng (${T.stopLines.length})`);
  const sl = T.stopLines.find(q => q.road.id === 'cheo'), L = sl.L;
  ok(Math.abs(Math.hypot(sl.sx - 3600, sl.sy - 1000) - (40 / Math.SQRT1_2 + 40)) < 0.01, `vạch dừng nhánh chéo lùi xa tâm hơn vì góc xiên (${Math.hypot(sl.sx - 3600, sl.sy - 1000).toFixed(1)} đơn vị)`);
  // vị trí trên làn: đường id, quãng s, fwd: theo chiều a→b hay ngược lại, side: 1 làn phải, -1 làn trái (phần đường ngược chiều)
  const lane = (id, s, fwd, side, off) => { const r = T.road(id), p = T.pointAt(r, s), d = fwd ? p.dir : {x: -p.dir.x, y: -p.dir.y}, k = (side || 1) * (off || 20);
    return {x: p.x - d.y*k, y: p.y + d.x*k, a: Math.atan2(d.y, d.x)}; };
  const chay = (pos, v, sec, each) => { player.x = pos.x; player.y = pos.y; player.a = pos.a; player.v = v; S.money = 5000000;
    for (let i = 0; i < sec/dt; i++){ if (player.stun <= 0) player.v = v; if (each) each(); step(dt); } };
  const choDen = (want, sec) => { while (!(lightOf(L, sl.phase, S.now) === want && lightOf(L, sl.phase, S.now + sec) === want)) run(0.1); };
  const sach = () => Object.keys(S.stats).length === 0;
  const s0 = {x: player.x, y: player.y, a: player.a}, M0 = useMap(T);
  const rs = () => { reset(); S.assist = false; for (const q of npcs){ q.hidden = true; q.respawnT = 999; } };
  ok(getMap() === T, 'bài test đổi tạm sang bản đồ thử được (useMap)');

  // a) vượt đèn đỏ ở nhánh chéo; đèn xanh thì không bị phạt
  rs(); choDen('red', 4); { const p = lane('cheo', 250, false); player.x = p.x; player.y = p.y; player.a = p.a;
    const la = playerLightAhead(300); ok(la && la.state === 'red' && Math.abs(la.dist - (250 - Math.hypot(sl.sx - 3600, sl.sy - 1000))) < 1, `đèn phía trước trên nhánh chéo đọc đúng (đỏ, còn ${la && la.dist.toFixed(0)} đơn vị)`); }
  chay(lane('cheo', 250, false), 90, 2.4);
  ok(S.stats.red === 1 && !S.stats.line && !S.stats.lane, `vượt đèn đỏ ở nhánh chéo của ngã năm bị phạt (${JSON.stringify(S.stats)})`);
  rs(); choDen('green', 4); chay(lane('cheo', 250, false), 90, 2.4);
  ok(sach(), `đi đúng đèn xanh qua nhánh chéo: không bị phạt (${JSON.stringify(S.stats)})`);
  // b) camera phạt nguội ở vạch dừng nhánh chéo: 55 km/h trên đường 40 km/h
  rs(); choDen('green', 4); chay(lane('cheo', 300, false), 165, 1.6);
  ok(S.stats.speed2 === 1 && !S.stats.red, `camera ở vạch dừng nhánh chéo phạt quá tốc độ 15 km/h (${JSON.stringify(S.stats)})`);
  // c) đè vạch liền và chạy lâu bên phần đường ngược chiều trên đại lộ chéo
  rs(); chay(lane('cheo', 108, true, -1), 30, 1.2);
  ok(T.lineAt(T.road('cheo'), 120) === 'solid' && S.stats.line === 1 && !S.stats.lane, `đường chéo: lấn sang phần đường ngược chiều ở đoạn vạch liền bị phạt đè vạch (${JSON.stringify(S.stats)})`);
  rs(); chay(lane('cheo', 230, true, -1), 60, 0.9);
  ok(sach(), 'đường chéo: cắt vạch đứt một lúc (dưới 1,2 giây) không bị phạt');
  rs(); chay(lane('cheo', 230, true, -1), 60, 4.5);
  ok(S.stats.lane === 1 && !S.stats.line, `đường chéo: chạy lâu bên phần đường ngược chiều ở đoạn vạch đứt bị phạt (${JSON.stringify(S.stats)})`);
  rs(); chay(lane('cheo', 160, true), 90, 4);
  ok(sach(), 'đường chéo: đi đúng làn phải suốt đoạn không bị phạt');
  // d) rẽ phải ở ngã năm (từ Đường Tây sang Đường Nam): không xi-nhan bị phạt, có xi-nhan thì không
  const rePhai = sig => { rs();
    const sw = T.stopLines.find(q => q.road.id === 'ow'); while (!(lightOf(L, sw.phase, S.now) === 'green' && lightOf(L, sw.phase, S.now + 6) === 'green')) run(0.1);
    if (sig) setSignal(1);
    let quay = false;
    chay(lane('ow', 600 - 130, true), 40, 6, () => { if (!quay && player.x > 3562) quay = true; keys.right = quay && player.a < Math.PI/2 - 0.04; });
    keys.right = false; };
  rePhai(false);
  ok(S.stats.signal === 1 && Math.abs(player.a - Math.PI/2) < 0.2 && player.y > 1100, `rẽ phải ở ngã năm không xi-nhan bị phạt (${JSON.stringify(S.stats)}, xe ở ${player.x.toFixed(0)},${player.y.toFixed(0)})`);
  rePhai(true);
  ok(sach() && player.y > 1100, `rẽ phải ở ngã năm có bật xi-nhan trước: không bị phạt (${JSON.stringify(S.stats)})`);
  // e) phố một chiều: đi ngược chiều bị phạt một lần; đi đúng chiều, kể cả lệch sang trái, thì không
  rs(); chay(lane('mot', 900, false), 60, 3);
  ok(S.stats.wrongway === 1 && !S.stats.lane && !S.stats.line, `đi ngược chiều phố một chiều bị phạt một lần (${JSON.stringify(S.stats)})`);
  rs(); chay(lane('mot', 300, true, -1), 60, 5);
  ok(sach(), 'đi đúng chiều phố một chiều (kể cả đi lệch bên trái) không bị phạt');
  // f) hẻm cấm ô tô: ô tô vào bị phạt đi vào đường cấm, câu nhắc ghi tên hẻm; xe máy vào hẻm thì không
  rs(); setVehicle('car'); S.belt = true; let thay = '';
  chay(lane('hem', 70, true, 1, 10), 60, 2, () => { if (/Hẻm Nhỏ/.test(S.warnText || '')) thay = S.warnText; });
  ok(S.stats.noentry === 1 && /cấm ô tô/.test(thay), `ô tô vào hẻm có biển cấm ô tô bị phạt (${JSON.stringify(S.stats)}), câu nhắc: "${thay}"`);
  rs(); setVehicle('car'); S.belt = true; chay(lane('os2', 120, true), 60, 3);
  ok(sach(), 'ô tô đi đường thường cạnh hẻm không bị phạt');
  rs(); chay(lane('hem', 70, true, 1, 10), 45, 3);
  ok(sach(), 'xe máy vào hẻm cấm ô tô không bị phạt');
  useMap(M0); player.x = s0.x; player.y = s0.y; player.a = s0.a; reset();
  ok(getMap() === M0 && TP.classify(400, 300).t === 'junction' && TP.classify(3600, 1000).t === 'off', 'trả lại bản đồ chơi sau bài test');
}

// 26) Bản 1.1 bước 6: trợ lái giữ làn, ôm cua, quay đầu tự động và đảo vòng xuyến theo hướng đường (bản đồ thử)
{
  console.log('\n== 26. Trợ lái theo hướng đường (bản đồ thử) ==');
  const {dungBanDo, useMap, getMap, setVehicle, setSignal, uTurn, laneFrame} = TP;
  const RD = (id, a, b, name, more) => Object.assign({id, a, b, name, cap:'normal', half:40, lanes:1, limit:40}, more || {});
  // ngã năm có đèn (đại lộ chéo 45°), đường cong, vòng xuyến thứ hai, phố một chiều; đặt xa khu phố cũ (x từ 3000)
  const T = dungBanDo([
    {id:'O', x:3600, y:1000, kind:'light', light:{off:0}},
    {id:'W', x:3000, y:1000, kind:'end'}, {id:'E', x:4400, y:1000, kind:'end'}, {id:'N', x:3600, y:400, kind:'end'}, {id:'NE', x:4000, y:600, kind:'end'},
    {id:'S', x:3600, y:1600, kind:'plain'}, {id:'R', x:3600, y:2200, kind:'ring', ring:{rOut:100, rIn:48, rLane:76}},
    {id:'RW', x:3000, y:2200, kind:'end'}, {id:'C2', x:4400, y:2900, kind:'end'},
    {id:'K', x:3000, y:2800, kind:'end'}, {id:'L', x:3400, y:2800, kind:'end'}
  ], [
    RD('ow','W','O','Đường Tây'), RD('oe','O','E','Đường Đông'), RD('on','O','N','Đường Bắc'), RD('cheo','O','NE','Đại lộ Chéo'),
    RD('os','O','S','Đường Nam'), RD('os2','S','R','Đường Nam'), RD('rw','R','RW','Đường Vòng'),
    RD('cong','R','C2','Đường Cong', {via:{x:4300, y:2200}}), RD('mot','K','L','Phố Một Chiều', {oneway:true})
  ], {bays: [], W: 5000, H: 3200});
  const lane = (id, s, fwd, off) => { const r = T.road(id), p = T.pointAt(r, s), d = fwd ? p.dir : {x: -p.dir.x, y: -p.dir.y}, k = off == null ? 20 : off;
    return {x: p.x - d.y*k, y: p.y + d.x*k, a: Math.atan2(d.y, d.x)}; };
  const dat = p => { player.x = p.x; player.y = p.y; player.a = p.a; };
  const khung = () => { const c = T.classify(player.x, player.y); return {c, f: laneFrame(c, player.a)}; };
  const s0 = {x: player.x, y: player.y, a: player.a}, M0 = useMap(T);
  const rs = veh => { reset(); setVehicle(veh || 'bike'); S.assist = true; TP.putOnHelmet(); S.belt = true;
    S.trip = null; S.route = null; S.ut = null; S.ta = null; for (const q of npcs){ q.hidden = true; q.respawnT = 999; } };

  // a) giữ làn trên đại lộ chéo: xe lệch sát mép phải, trợ lái đưa về tâm làn và xe chạy dọc theo đường
  const deu = (v, sec) => { for (let i = 0; i < sec/dt; i++){ player.v = v; step(dt); } };   // giữ tốc độ đều 30 km/h, không chạy quá hết đoạn đường thử
  rs(); dat(lane('cheo', 140, true, 34)); player.a += 0.12; deu(90, 3);
  { const {c, f} = khung(); ok(c.road && c.road.id === 'cheo' && f && f.fwd && f.dot > 0.995 && Math.abs(f.lat - 20) < 4,
      `giữ làn trên đường chéo: về tâm làn phải (lệch ${f && f.lat.toFixed(1)}, cần 20), thẳng theo đường (${f && f.dot.toFixed(3)})`); }
  // b) giữ làn trên đường cong: xe tự bám theo khúc cong, không trôi ra mép hay lấn làn
  rs(); dat(lane('cong', 60, true)); player.v = 90; { let maxE = 0, off = false;
    keys.up = true; for (let i = 0; i < 5/dt; i++){ step(dt); const {c, f} = khung();
      if (!c.road || c.road.id !== 'cong'){ if (T.classify(player.x, player.y).t !== 'ring') off = c.t === 'off'; continue; }
      if (i*dt > 1) maxE = Math.max(maxE, Math.abs(f.lat - 20)); } keys.up = false;
    const {c} = khung();
    ok(!off && c.road && c.road.id === 'cong' && maxE < 8 && T.classify(player.x, player.y).lat > 0,
      `giữ làn trên đường cong: bám làn phải suốt khúc cong (lệch tối đa ${maxE.toFixed(1)} đơn vị so với tâm làn), đi được ${c.s ? c.s.toFixed(0) : '?'} đơn vị`); }
  // c) giữ làn ở phố một chiều: vẫn nửa bên phải
  rs(); dat(lane('mot', 60, true, -15)); deu(90, 3);
  { const {f} = khung(); ok(f && Math.abs(f.lat - 20) < 4, `giữ làn ở phố một chiều: về nửa bên phải (lệch ${f && f.lat.toFixed(1)})`); }

  // d) ôm cua ở ngã năm chỉ bằng xi-nhan + ga (không bấm nút rẽ)
  const choXanh = id => { const sl = T.stopLines.find(q => q.road.id === id);
    while (!(lightOf(sl.L, sl.phase, S.now) === 'green' && lightOf(sl.L, sl.phase, S.now + 7) === 'green')) run(0.1); };
  const omCua = (veh, from, sFrom, fwd, dir, route) => {
    rs(veh); choXanh(from); dat(lane(from, sFrom, fwd)); player.v = 90; S.now += 0.1;
    if (route) S.route = {instr: route, pts: [], remain: 500};
    setSignal(dir); const m0 = S.money; let was = false, maxOpp = 0;
    keys.up = true;
    for (let i = 0; i < 8/dt; i++){ step(dt); if (S.ta) was = true; else if (was) keys.up = false;
      const {c, f} = khung(); if (was && !S.ta && f && c.road.id !== from) maxOpp = Math.max(maxOpp, -f.lat); }
    keys.up = false;
    const {c, f} = khung();
    return {was, road: c.road && c.road.id, f, maxOpp, clean: S.money === m0 && !Object.keys(S.stats).length, stats: Object.keys(S.stats).join(',') || 'không lỗi'};
  };
  const tot = (o, road) => o.was && o.road === road && o.f && o.f.dot > 0.97 && Math.abs(o.f.lat - 20) < 9 && o.maxOpp <= 0 && o.clean;
  const ghi = o => `(đường ${o.road}, lệch ${o.f ? o.f.lat.toFixed(1) : '?'}, thẳng ${o.f ? o.f.dot.toFixed(3) : '?'}, ${o.stats})`;
  let o = omCua('bike', 'ow', 470, true, 1);
  ok(tot(o, 'os'), `ngã năm: xe máy rẽ phải từ Đường Tây sang Đường Nam bằng xi-nhan + ga ${ghi(o)}`);
  o = omCua('bike', 'ow', 470, true, -1);
  ok(tot(o, 'on'), `ngã năm: rẽ trái không có chỉ đường thì vào nhánh gần rẽ vuông nhất (Đường Bắc, không phải đại lộ chéo) ${ghi(o)}`);
  o = omCua('bike', 'ow', 470, true, -1, {type: 'bearleft', dist: 120, street: 'Đại lộ Chéo'});
  ok(tot(o, 'cheo'), `ngã năm: chỉ đường bảo đi chếch trái vào đại lộ chéo thì xe ôm vào nhánh chéo (lệch 45°) ${ghi(o)}`);
  o = omCua('car', 'ow', 470, true, 1);
  ok(tot(o, 'os'), `ngã năm: ô tô rẽ phải sang Đường Nam ${ghi(o)}`);
  o = omCua('car', 'ow', 470, true, -1);
  ok(tot(o, 'on'), `ngã năm: ô tô rẽ trái sang Đường Bắc ${ghi(o)}`);
  // đi từ đại lộ chéo vào ngã năm: rẽ trái 45° sang Đường Nam (nhánh lệch đều 45° và 135° thì chọn nhánh rẽ nhẹ)
  { const len = T.road('cheo').len; o = omCua('bike', 'cheo', len - 470, false, -1);
    ok(tot(o, 'os'), `ngã năm: từ đại lộ chéo rẽ trái 45° vào Đường Nam ${ghi(o)}`); }
  // xi-nhan về phía không có nhánh nào hợp lệ thì không tự lái (đã có test cũ: không xi-nhan thì đi thẳng)
  // e) quay đầu tự động trên đại lộ chéo: quay ngược đúng hướng đường, vẫn trên mặt đường
  for (const veh of ['bike', 'car']){
    rs(veh); dat(lane('cheo', 260, true)); player.v = 60; uTurn(); let ra = false;
    for (let i = 0; i < 6/dt; i++){ step(dt); if (T.classify(player.x, player.y).t === 'off') ra = true; }
    const {c, f} = khung();
    ok(!S.ut && c.road && c.road.id === 'cheo' && f && !f.fwd && f.dot > 0.97 && !ra && S.turn === 0,
      `${veh === 'car' ? 'ô tô' : 'xe máy'} quay đầu tự động trên đường chéo: ngược hướng đường (thẳng ${f && f.dot.toFixed(3)}), không ra khỏi mặt đường`);
  }
  // f) đảo vòng xuyến thứ hai (không phải vòng xuyến của khu cũ): ô tô lao vào đảo thì bị đẩy ra, không xuyên qua, không kẹt
  rs('car'); player.x = 3600; player.y = 2200 - 76; player.a = Math.PI/2 - 0.3; player.v = 60; { let minD = 1e9, x0 = player.x, y0 = player.y, moved = 0;
    keys.up = true; keys.right = true;
    for (let i = 0; i < 3/dt; i++){ const px = player.x, py = player.y; step(dt); moved += Math.hypot(player.x - px, player.y - py); minD = Math.min(minD, Math.hypot(player.x - 3600, player.y - 2200)); }
    keys.up = false; keys.right = false;
    ok(minD >= 48 && moved > 60, `ô tô chạm đảo vòng xuyến thứ hai: bị đẩy ra (gần tâm nhất ${minD.toFixed(1)}, đảo bán kính 48), vẫn đi tiếp được (${moved.toFixed(0)} đơn vị)`); }
  useMap(M0); player.x = s0.x; player.y = s0.y; player.a = s0.a; reset();
  ok(getMap() === M0, 'trả lại bản đồ chơi sau bài test');
}

console.log(fails ? `\n${fails} lỗi` : '\nTất cả đều đạt');
process.exit(fails ? 1 : 0);
