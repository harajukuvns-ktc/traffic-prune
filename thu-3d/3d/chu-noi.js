/* =========================================================
   Traffic Prune · thu-3d/3d/chu-noi.js: CHỮ NỔI (tên đường, tên điểm giao, tiền bay lên, 😤 💬)
   Bản 2D vẽ các chữ này trong drawUprights bằng canvas 2D. Ở đây chiếu toạ độ 3D ra màn hình rồi viết lên một lớp
   canvas trong suốt nằm trên khung 3D.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, CN = TP3.chuNoi = {tinh: null, pr: 1, tt: new Map()};
// Đường ngắm từ máy quay tới điểm (x, cao, y) có xuyên qua nhà nào không (nhà coi như khối hộp cao 30; sạp chợ cao 12)
function cheBoiNha(camera, x, cao, y){
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, dx = x - cx, dz = y - cz;
  for (const h of MAP.houses || []){
    const x0 = h.x + 2, x1 = h.x + h.w - 2, z0 = h.y + 2, z1 = h.y + h.h - 2;
    if ((cx < x0 && x < x0) || (cx > x1 && x > x1) || (cz < z0 && y < z0) || (cz > z1 && y > z1)) continue;
    let t0 = 0.02, t1 = 0.97;   // khoảng tham số của đoạn ngắm nằm trong hình chữ nhật nhà
    if (Math.abs(dx) < 1e-6){ if (cx < x0 || cx > x1) continue; } else { const a = (x0 - cx) / dx, b = (x1 - cx) / dx; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); }
    if (Math.abs(dz) < 1e-6){ if (cz < z0 || cz > z1) continue; } else { const a = (z0 - cz) / dz, b = (z1 - cz) / dz; t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b)); }
    if (t0 >= t1) continue;
    if (Math.min(cy + (cao - cy) * t0, cy + (cao - cy) * t1) < (h.stall ? 12 : 30)) return true;
  }
  return false;
}
const _v = new T.Vector3();
function gomNhanTinh(){
  const ds = [], tv = TP3.trongVung;
  for (const q of trangTri.nhanDuong) if (tv(q.x, q.y)) ds.push({x: q.x, y: q.y, cao: 9, t: q.t, o: {size: 12, bg: 'rgba(43,42,51,.62)', color: '#fff'}});
  if (tv(925, 395)) ds.push({x: 925, y: 395, cao: 20, t: '🛒 CHỢ HOA SỮA', o: {size: 14, bold: true, color: '#b5482b'}});   // nhãn này bản 2D ghi cứng toạ độ trong drawUprights
  for (const q of trangTri.nhanMep) if (tv(q.x, q.y)) ds.push({x: q.x, y: q.y, cao: 8, t: 'Hết khu chơi thử', o: {size: 11}});
  for (const q of trangTri.nhanDiBo) if (tv(q.x, q.y)) ds.push({x: q.x, y: q.y, cao: 22, t: 'PHỐ ĐI BỘ', o: {size: 12, bold: true, bg: '#1b6fb8', color: '#fff'}});
  for (const p of CSGT) if (!p.off && tv(p.x, p.y)) ds.push({x: p.cabinPt.x, y: p.cabinPt.y, cao: 21, t: '👮 CHỐT CSGT', o: {size: 12, bold: true, bg: '#2f6fde', color: '#fff'}});
  return ds;
}
CN.ve = function(g, camera, VW, VH){
  if (!CN.tinh) CN.tinh = gomNhanTinh();
  const chieu = (x, cao, y) => {   // toạ độ bản đồ → điểm trên màn hình (null nếu ở sau lưng máy quay hoặc ngoài màn hình)
    _v.set(x, cao, y).project(camera); if (_v.z < -1 || _v.z > 1) return null;
    const sx = (_v.x * 0.5 + 0.5) * VW, sy = (-_v.y * 0.5 + 0.5) * VH;
    return sx < -80 || sx > VW + 80 || sy < -30 || sy > VH + 30 ? null : {x: sx, y: sy};
  };
  g.setTransform(CN.pr, 0, 0, CN.pr, 0, 0); g.clearRect(0, 0, VW, VH);
  // Nhãn bị nhà che thì ẩn (mờ dần); nhãn chồng lên nhãn đã viết quá 30% thì bỏ. Nhãn điểm đang giao luôn ưu tiên, bị che thì chỉ mờ đi.
  const xa = S.view === 'bike' ? 430 : 600, cur = S.trip && S.trip.dest, ds = [], now = performance.now();
  const them = (khoa, x, cao, y, text, opt, tamXa, uuTien) => { const d = Math.hypot(x - camera.position.x, y - camera.position.z); if (d <= tamXa) ds.push({khoa, x, cao, y, text, opt, tamXa, uuTien, d}); };
  for (const q of CN.tinh) them(q.t + q.x, q.x, q.cao, q.y, q.t, q.o, xa, 1);
  for (const d of DESTS){
    if (d === cur) them('dich', d.lx, 34, d.ly, '📍 ' + d.icon + ' ' + d.name, {size: 14, bold: true, bg: '#2f9e6b', color: '#fff'}, xa * 1.6, 0);
    else them(d.name, d.lx, 13, d.ly, d.icon + ' ' + d.name, {size: 12}, xa * 0.8, 1);
  }
  ds.sort((p, q) => p.uuTien - q.uuTien || p.d - q.d);
  const daViet = [];
  for (const q of ds){
    let tt = CN.tt.get(q.khoa); if (!tt){ tt = {a: 0, che: false, t: 0}; CN.tt.set(q.khoa, tt); }
    if (now > tt.t){ tt.t = now + 220 + Math.random() * 120; tt.che = cheBoiNha(camera, q.x, q.cao, q.y); }   // xét che khuất vài lần mỗi giây là đủ
    const dich = tt.che ? (q.uuTien === 0 ? 0.45 : 0) : 1; tt.a += (dich - tt.a) * 0.25;
    if (tt.a < 0.04) continue;
    const p = chieu(q.x, q.cao, q.y); if (!p) continue;
    const fs = (q.opt.size || 13) * clamp(170 / q.d, 0.72, 1.12);
    g.font = (q.opt.bold ? '700 ' : '600 ') + fs + 'px ' + TP3.FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(q.text).width + fs * 1.1, h = fs * 1.7, x0 = p.x - w / 2, y0 = p.y - h / 2;
    if (daViet.some(r => { const ox = Math.min(x0 + w, r.x + r.w) - Math.max(x0, r.x), oy = Math.min(y0 + h, r.y + r.h) - Math.max(y0, r.y); return ox > 0 && oy > 0 && ox * oy > 0.3 * w * h; })) continue;
    daViet.push({x: x0, y: y0, w, h});
    g.globalAlpha = clamp((q.tamXa - q.d) / 80, 0, 1) * tt.a;
    if (q.opt.bg !== false){ g.fillStyle = q.opt.bg || 'rgba(255,250,242,.92)'; rr(g, x0, y0, w, h, h / 2.4); g.fill(); }
    g.fillStyle = q.opt.color || '#2b2a33'; g.fillText(q.text, p.x, p.y + fs * 0.06); g.globalAlpha = 1;
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';   // người bị ảnh hưởng, người đang nói
  for (const n of npcs){ if (n.hidden || n.affEp !== S.epId || S.now >= S.faultUntil + 2) continue;
    const p = chieu(n.x, n.kind === 'bus' ? 20 : 15, n.y); if (p){ g.font = '17px sans-serif'; g.fillText('😤', p.x, p.y); } }
  const b = S.bubble;
  if (b && b.speaker && b.speaker.x !== undefined && !b.speaker.follow){ const p = chieu(b.speaker.x, 17, b.speaker.y); if (p){ g.font = '20px sans-serif'; g.fillText('💬', p.x, p.y); } }
  for (const f of S.floats){   // số tiền bay lên
    // chữ rút gọn, nhỏ; ở góc sau tay lái chữ của chính mình hiện sát mép trên vùng nhìn (không nổi giữa làn đường trước mặt)
    const cuaToi = Math.hypot(f.x - player.x, f.y - player.y) < 16, t = TP3.giaoDien.rutChuBay(f.text);
    const p = S.view === 'bike' && cuaToi ? {x: VW / 2, y: (TP3.mayQuay.tren || 60) + 34 - (f.rise || 0) * 0.5} : chieu(f.x, 15 + (f.rise || 0) * 0.6, f.y); if (!p) continue;
    g.globalAlpha = clamp(f.t, 0, 1); g.font = '700 13px ' + TP3.FONT; g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeText(t, p.x, p.y); g.fillStyle = f.color; g.fillText(t, p.x, p.y); g.globalAlpha = 1;
  }
};
})();
