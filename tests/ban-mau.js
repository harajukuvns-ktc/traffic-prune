// Chụp "bản mẫu" của khu phố đang chơi (bản 1.1 bước 7). Dùng chung cho tao-ban-mau.js (ghi file)
// và kiem-tra-logic.js mục 21 (so với file đã ghi). Mọi số làm tròn 0,01 đơn vị.
const r2 = v => Math.round(v * 100) / 100;
// băm FNV-1a 32 bit: đủ để phát hiện một điểm nào đó đổi kết quả
function bam(list){
  let h = 0x811c9dc5;
  for (const s of list){ for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } h ^= 10; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}
// các điểm xuất phát khi chụp chỉ đường: ô đỗ của mọi điểm giao và vài chỗ giữa đường, trong vòng xuyến, mép bản đồ
const DIEM_DI = [[600,320],[700,280],[1220,600],[1180,740],[420,600],[380,700],[1000,880],[1300,920],[200,320],[1200,300],[400,900],[1200,860],[800,320],[50,880],[1580,320],[400,50],[1220,1150]];

function chupKhuPho(TP){
  const {MAP, BAYS, DESTS, S, player, setVehicle, computeRoute} = TP;
  const out = {};
  // 1) phân loại vị trí và đoạn tốc độ trên lưới 2 đơn vị phủ cả khu phố
  const keys = []; let n = 0;
  for (let x = -20; x <= 1620; x += 2) for (let y = -20; y <= 1220; y += 2){
    const c = MAP.classify(x, y), si = MAP.speedInfo(c); n++;
    keys.push([c.t, c.X, c.Y, c.bay ? BAYS.indexOf(c.bay) : '', c.road ? c.road.id : '', c.node || '', si ? si.id + '/' + si.limit + '/' + si.child : ''].join(':'));
  }
  out.phanLoai = {n, bam: bam(keys)};
  // 2) vạch giữa đường, mỗi đơn vị một mẫu
  const vk = [];
  for (const r of MAP.roads) for (let s = 0; s <= r.len; s += 1) vk.push(r.id + ':' + s + ':' + MAP.lineAt(r, s));
  out.vachGiua = {n: vk.length, bam: bam(vk)};
  // 3) chỉ đường: mọi điểm giao × điểm xuất phát × 4 hướng × 2 loại xe
  const saved = {x: player.x, y: player.y, a: player.a, trip: S.trip, veh: S.veh, route: S.route};
  const starts = DESTS.map(d => [d.bay.cx, d.bay.cy]).concat(DIEM_DI);
  out.chiDuong = [];
  for (const veh of ['bike', 'car']){ setVehicle(veh);
    for (const b of DESTS) for (const [x, y] of starts) for (const ang of [0, Math.PI/2, Math.PI, -Math.PI/2]){
      player.x = x; player.y = y; player.a = ang; S.trip = {dest: b, fx: x, fy: y, clean: true, t0: S.now};
      const m = computeRoute();
      out.chiDuong.push(m ? [m.instr.type, m.instr.street || '', m.instr.exitNo || '', m.instr.side || '', r2(m.instr.dist).toFixed(1), r2(m.remain).toFixed(1)].join('|') : 'null');
    } }
  setVehicle(saved.veh); Object.assign(player, {x: saved.x, y: saved.y, a: saved.a}); S.trip = saved.trip; S.route = saved.route;
  // 4) vật đặt trên bản đồ
  out.oDo = BAYS.map(b => [b.x, b.y, b.w, b.h, b.side, b.cx, b.cy, b.dir.x, b.dir.y, b.proj.x, b.proj.y].map(v => typeof v === 'number' ? r2(v) : v));
  out.diemGiao = DESTS.map(d => [d.name, d.icon, r2(d.lx), r2(d.ly)]);
  out.bienChiDan = TP.SIGNBOARDS.map(b => [r2(b.x), r2(b.y), b.node, b.rows.map(q => q.k + ':' + q.name + (q.ped ? ':di-bo' : '')).join(',')]);
  out.bienTocDo = TP.SPEED_SIGNS.map(b => [b.kind, b.v, r2(b.x), r2(b.y)]);
  const t = TP.trangTri ? TP.trangTri : trangTriCu(TP);
  out.bienP = t.bienP.map(p => [r2(p.x), r2(p.y)]);
  out.cotDen = t.cotDen.map(p => [r2(p.x), r2(p.y), p.L.x, p.L.y, p.phase]);
  out.bienVongXuyen = t.bienVong.map(p => [r2(p.x), r2(p.y)]);
  out.bienDiBo = t.bienDiBo.map(p => [r2(p.x), r2(p.y), p.icon]);
  out.nhanDiBo = t.nhanDiBo.map(p => [r2(p.x), r2(p.y)]);
  out.nhanDuong = t.nhanDuong.map(p => [p.t, r2(p.x), r2(p.y)]);
  out.nhanMep = t.nhanMep.map(p => [r2(p.x), r2(p.y)]);
  return out;
}
// Vị trí các vật trang trí theo đúng công thức viết tay của bộ cũ (chỉ dùng để tạo bản mẫu lần đầu, trước khi xoá HR / VR / OW / RB)
function trangTriCu(TP){
  const {LIGHTS, OW, RB, HALF, BAYS} = TP, W = 1600, H = 1200, t = {};
  const HR = [{y:300, name:'Đường Hoa Sữa'}, {y:900, name:'Đường Me Chua'}], VR = [{x:400, name:'Phố Bánh Mì'}, {x:1200, name:'Đường Cầu Vồng'}];   // chép từ js/ban-do.js bản 1.1 bước 6
  t.bienP = BAYS.map(b => ({x: b.w > b.h ? b.x + 6 : (b.side === 'E' ? b.x + b.w + 3 : b.x - 3), y: b.w > b.h ? (b.side === 'S' ? b.y + b.h + 3 : b.y - 3) : b.y + 6}));
  t.cotDen = [];
  for (const L of LIGHTS) t.cotDen.push(
    {x: L.x - HALF - 10, y: L.y + HALF + 10, L, phase:'EW'}, {x: L.x + HALF + 10, y: L.y - HALF - 10, L, phase:'EW'},
    {x: L.x + HALF + 10, y: L.y + HALF + 10, L, phase:'NS'}, {x: L.x - HALF - 10, y: L.y - HALF - 10, L, phase:'NS'});
  t.bienVong = [[1150, RB.y - 128], [1250, RB.y + 128], [RB.x - 128, 950], [RB.x + 128, 850]].map(([x, y]) => ({x, y}));
  t.bienDiBo = []; t.nhanDiBo = [];
  for (const y of [OW.y1 + HALF + 10, OW.y2 - HALF - 10]){
    t.bienDiBo.push({x: OW.x - 33, y, icon: 'xe-may'}, {x: OW.x + 33, y, icon: 'o-to'});
    t.nhanDiBo.push({x: OW.x, y: y + (y < 600 ? 22 : -22)});
  }
  t.nhanDuong = [[HR[0].name, 690, 246], [HR[0].name, 1390, 246], [HR[1].name, 620, 954], [HR[1].name, 1420, 846],
    [VR[0].name, 346, 640], [VR[0].name, 454, 140], [VR[1].name, 1146, 560], [VR[1].name, 1254, 1100], [OW.name + ' (đi bộ)', 762, 480]].map(([t, x, y]) => ({t, x, y}));
  t.nhanMep = [];
  for (const h of HR) t.nhanMep.push({x: 34, y: h.y}, {x: W - 34, y: h.y});
  for (const v of VR) t.nhanMep.push({x: v.x, y: 22}, {x: v.x, y: H - 22});
  return t;
}
// So bản chụp hiện tại với bản mẫu: trả về danh sách khác biệt (rỗng là khớp). Danh sách vật so như tập hợp (không kể thứ tự).
function soSanh(mau, moi){
  const khac = [];
  for (const k of Object.keys(mau)){
    const a = mau[k], b = moi[k];
    if (Array.isArray(a)){
      const tap = ['chiDuong', 'oDo', 'diemGiao'].includes(k);   // ba danh sách này phải đúng cả thứ tự
      const A = a.map(v => JSON.stringify(v)), B = (b || []).map(v => JSON.stringify(v));
      if (tap){ let n = 0, vd = ''; for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]){ n++; if (!vd) vd = `#${i}: mẫu ${A[i]} / nay ${B[i]}`; }
        if (n) khac.push(`${k}: lệch ${n}/${A.length} (${vd})`); }
      else { const sa = [...A].sort(), sb = [...B].sort(); const thieu = sa.filter(x => !sb.includes(x)), thua = sb.filter(x => !sa.includes(x));
        if (thieu.length || thua.length) khac.push(`${k}: thiếu ${thieu.length} [${thieu.slice(0, 2).join(' ')}], thừa ${thua.length} [${thua.slice(0, 2).join(' ')}]`); }
    } else if (JSON.stringify(a) !== JSON.stringify(b)) khac.push(`${k}: mẫu ${JSON.stringify(a)} / nay ${JSON.stringify(b)}`);
  }
  return khac;
}
module.exports = {chupKhuPho, soSanh, bam};
