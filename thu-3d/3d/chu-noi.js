/* =========================================================
   Traffic Prune · thu-3d/3d/chu-noi.js: CHỮ NỔI (tên đường, tên điểm giao, tiền bay lên, 😤 💬)
   Bản 2D vẽ các chữ này trong drawUprights bằng canvas 2D. Ở đây chiếu toạ độ 3D ra màn hình rồi viết lên một lớp
   canvas trong suốt nằm trên khung 3D.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, CN = TP3.chuNoi = {tinh: null, pr: 1};
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
  const viet = (x, cao, y, text, opt, tamXa) => {
    const d = Math.hypot(x - camera.position.x, y - camera.position.z); if (d > tamXa) return;
    const p = chieu(x, cao, y); if (!p) return;
    const fs = (opt.size || 13) * clamp(170 / d, 0.72, 1.12);
    g.font = (opt.bold ? '700 ' : '600 ') + fs + 'px ' + TP3.FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + fs * 1.1, h = fs * 1.7;
    g.globalAlpha = clamp((tamXa - d) / 80, 0, 1);
    if (opt.bg !== false){ g.fillStyle = opt.bg || 'rgba(255,250,242,.92)'; rr(g, p.x - w/2, p.y - h/2, w, h, h / 2.4); g.fill(); }
    g.fillStyle = opt.color || '#2b2a33'; g.fillText(text, p.x, p.y + fs * 0.06); g.globalAlpha = 1;
  };
  g.setTransform(CN.pr, 0, 0, CN.pr, 0, 0); g.clearRect(0, 0, VW, VH);
  const xa = S.view === 'bike' ? 430 : 600;
  for (const q of CN.tinh) viet(q.x, q.cao, q.y, q.t, q.o, xa);
  const cur = S.trip && S.trip.dest;   // tên điểm giao (điểm đang giao tô xanh, thấy từ xa hơn)
  for (const d of DESTS){
    if (d === cur) viet(d.lx, 34, d.ly, '📍 ' + d.icon + ' ' + d.name, {size: 14, bold: true, bg: '#2f9e6b', color: '#fff'}, xa * 1.6);
    else if (TP3.trongVung(d.lx, d.ly)) viet(d.lx, 13, d.ly, d.icon + ' ' + d.name, {size: 12}, xa * 0.8);
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
