const {TP} = require('./harness.js');
const {S, player, npcs, keys, step, lightOf, LIGHTS, RB, DESTS, computeRoute, navText, render, classify, BAYS, HALF, OW} = TP;
const dt = 1/60;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ĐẠT ' : 'LỖI ') + m); if (!c) fails++; };
const run = sec => { for (let i = 0; i < sec/dt; i++) step(dt); };
const reset = () => { for (const k in keys) keys[k] = false; S.pts = 12; S.suspended = false; S.paused = false; S.stats = {}; S.faultUntil = -1; S.sideEp = S.wwEp = S.ringEp = false;
  S.wrongT = 0; S.solidT = 0; S.okT = 5; S.pedEp = false; S.pedCool = -99; S.turn = 0; S.sigAcc = 0; S.sigInJ = false; S.sigEp = false; S.sigStraightT = 0; S.turnBegan = false; S.sigRunT = 0; S.ringWrongT = 0; S.bubble = null; S.assist = true; S.crashCool = -1; player.stun = 0; S.parkDirBay = null; };
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
                             : Math.abs((b.side === 'E' ? b.x + b.w : b.x) - (b.proj.x + (b.side === 'E' ? 1 : -1) * (b.proj.x === OW.x ? 22 : HALF))) < 0.5),
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
  for (let v = 0; v <= 115; v += 1){ const m = em(v, true, 'so');
    if (m.gear > prev.gear){ shifts++; if (m.rpm < prev.rpm) drops++; }
    maxR = Math.max(maxR, m.rpm); if (v % 10 === 0) line.push(`${v}:${m.gear}/${m.rpm.toFixed(2)}`); prev = m; }
  console.log('   tốc độ:số/vòng tua →', line.join(' '));
  ok(shifts === 3 && drops === 3 && maxR <= 1, `xe số lên 3 lần số, mỗi lần vòng tua tụt xuống (lên số ${shifts}, tụt ${drops})`);
  let back = 0; for (let v = 115; v >= 0; v -= 1){ const m = em(v, false, 'so'); if (v === 0) back = m.gear; }
  ok(back === 1, 'giảm tốc về 0 thì về số 1');
  const g = [0, 40, 110].map(v => em(v, true, 'ga'));
  ok(g.every(m => m.gear === 0) && g[1].rpm > g[0].rpm && g[2].rpm > g[1].rpm, 'xe tay ga: không có số, vòng tua tăng đều'); }

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

console.log(fails ? `\n${fails} lỗi` : '\nTất cả đều đạt');
process.exit(fails ? 1 : 0);
