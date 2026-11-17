/* =========================================================
   Traffic Prune · thu-3d/3d/bien.js: BIỂN BÁO, ĐÈN TÍN HIỆU, CHỐT CSGT
   Vị trí lấy từ dữ liệu của game (SPEED_SIGNS, SIGNBOARDS, trangTri.*, MAP.stopLines, CSGT). Dữ liệu chỉ có vị trí, không có
   hướng mặt biển (bản 2D luôn quay biển về người xem), nên hướng suy ra từ làn đường gần nhất: biển đặt bên phải theo
   chiều đi thì quay mặt về phía xe đang tới.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, FONT = TP3.FONT, CAO = TP3.CAO_VIA, rr = TP3.rrect;
const MAU_COT = '#8a9097', MUI_TEN = {trai: '←', thang: '↑', phai: '→'};

/* ---------- mặt biển (vẽ bằng canvas, xếp vào bảng ảnh có chỗ trong suốt) ---------- */
const veTron = (g, r, m) => { g.fillStyle = m; g.beginPath(); g.arc(64, 64, r, 0, Math.PI*2); g.fill(); };
const MAT_BIEN = {
  // P.127 hạn chế tốc độ: viền đỏ, nền trắng, số đen
  tocDo: v => g => { veTron(g, 61, '#fff'); veTron(g, 57, '#e5484d'); veTron(g, 43, '#fff');
    g.fillStyle = '#111'; g.font = '800 54px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(v), 64, 67); },
  // W.225 trẻ em: tam giác vàng viền đỏ
  treEm: g => {
    const tg = (cx, top, r, m) => { g.fillStyle = m; g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + r, top + r*1.72); g.lineTo(cx - r, top + r*1.72); g.closePath(); g.fill(); };
    tg(64, 4, 62, '#e5484d'); tg(64, 24, 45, '#ffd43b'); g.fillStyle = '#222';
    for (const dx of [-15, 15]){ g.beginPath(); g.arc(64 + dx, 62, 7, 0, Math.PI*2); g.fill(); g.beginPath(); g.moveTo(64 + dx, 68); g.lineTo(64 + dx - 10, 96); g.lineTo(64 + dx + 10, 96); g.closePath(); g.fill(); } },
  // R.303 nơi giao nhau chạy theo vòng xuyến: nền xanh, ba mũi tên vòng ngược chiều kim đồng hồ
  vongXuyen: g => { veTron(g, 61, '#fff'); veTron(g, 57, '#2f6fde'); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'butt';
    for (let i = 0; i < 3; i++){ const a0 = i * 2.094 + 0.5, a1 = a0 - 1.45;
      g.beginPath(); g.arc(64, 64, 30, a0, a1, true); g.stroke();
      const ex = 64 + Math.cos(a1)*30, ey = 64 + Math.sin(a1)*30, tx = Math.sin(a1), ty = -Math.cos(a1);
      g.beginPath(); g.moveTo(ex + tx*15, ey + ty*15); g.lineTo(ex + Math.cos(a1)*11, ey + Math.sin(a1)*11); g.lineTo(ex - Math.cos(a1)*11, ey - Math.sin(a1)*11); g.closePath(); g.fill(); } },
  doXe: g => { g.fillStyle = '#fff'; rr(g, 4, 4, 120, 120, 18); g.fill(); g.fillStyle = '#2f6fde'; rr(g, 10, 10, 108, 108, 14); g.fill();
    g.fillStyle = '#fff'; g.font = '700 86px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 64, 69); },
  // P.104 cấm xe máy, P.103a cấm ô tô: viền đỏ, nền trắng, hình đen, gạch chéo đỏ
  cam: loai => g => { veTron(g, 61, '#fff'); veTron(g, 57, '#e5484d'); veTron(g, 43, '#fff'); g.fillStyle = '#222'; g.strokeStyle = '#222';
    if (loai === 'xe-may'){
      g.beginPath(); g.arc(68, 40, 8, 0, Math.PI*2); g.fill();
      g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(66, 50); g.lineTo(58, 68); g.moveTo(66, 54); g.lineTo(82, 64); g.stroke();
      g.lineWidth = 6; g.beginPath(); g.arc(42, 82, 11, 0, Math.PI*2); g.moveTo(97, 82); g.arc(86, 82, 11, 0, Math.PI*2); g.stroke();
      g.beginPath(); g.moveTo(42, 82); g.lineTo(56, 68); g.lineTo(82, 68); g.lineTo(86, 82); g.stroke();
    } else { rr(g, 30, 60, 68, 26, 8); g.fill(); rr(g, 44, 42, 38, 24, 8); g.fill(); g.beginPath(); g.arc(46, 88, 9, 0, Math.PI*2); g.arc(82, 88, 9, 0, Math.PI*2); g.fill(); }
    g.strokeStyle = '#e5484d'; g.lineWidth = 10; g.lineCap = 'butt'; g.beginPath(); g.moveTo(32, 32); g.lineTo(96, 96); g.stroke(); },
  lungTron: g => { veTron(g, 61, '#9aa0a6'); veTron(g, 54, '#8a9097'); },
  lungTamGiac: g => { g.fillStyle = '#8a9097'; g.beginPath(); g.moveTo(64, 4); g.lineTo(126, 111); g.lineTo(2, 111); g.closePath(); g.fill(); },
  lungVuong: g => { g.fillStyle = '#8a9097'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#7b8188'; g.fillRect(0, 56, 128, 6); },
  // biển chỉ dẫn hướng đi: nền xanh, mũi tên và tên đường
  chiDan: rows => (g, w, h) => {
    g.scale(w / 256, w / 256); h = h * 256 / w; w = 256;   // vẽ theo khổ rộng 256 rồi thu nhỏ (cả bản đồ có hơn 60 biển, để bảng ảnh không quá lớn)
    g.fillStyle = '#fff'; rr(g, 2, 2, w - 4, h - 4, 12); g.fill(); g.fillStyle = '#1b6fb8'; rr(g, 6, 6, w - 12, h - 12, 9); g.fill();
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
    rows.forEach((r, i) => { const y = 12 + 38 * (i + 0.5);
      g.font = '700 30px ' + FONT; g.fillText(MUI_TEN[r.k], 14, y);
      let co = 25; g.font = '700 ' + co + 'px ' + FONT; while (co > 12 && g.measureText(r.name).width > w - 66){ co--; g.font = '700 ' + co + 'px ' + FONT; }
      g.fillText(r.name, 52, y + 1); });
  }
};
/* ---------- các hàm dựng hình của danh mục (TP3.hinhVat.<tên>(G, v, m): G = các Gom của ô, v = một vật, m = mục danh mục) ---------- */
const Y_DEN = CAO + 15.5;
const viTriBong = (c, h, k) => ({x: c.x + h.n.x * 2.9, y: Y_DEN + 8.7 - k * 3.4, z: c.y + h.n.y * 2.9});
const KICH = {tron: {w: 8, h: 8, cot: 12.6, cao: 15, lung: 'lungTron'}, tamGiac: {w: 9.6, h: 9.6, cot: 12, cao: 15, lung: 'lungTamGiac'}, vuong: {w: 5.8, h: 5.8, cot: 10, cao: 12, lung: 'lungVuong'}};
// tấm biển đứng trên cột: v.n hướng mặt biển, v.anh tên ô ảnh mặt biển, v.k kích thước {w, h, cot, cao, lung}; v.haiMat: hai mặt như nhau
function tamBien(G, v){
  const D = G.duc, B = TP3.anh.trong.o, t = v.k;
  D.tru(v.x, CAO, v.y, 0.38, 0.38, t.cot, 6, MAU_COT, {aoDay: 0.7}); TP3.bongMo(G.bong, v.x, CAO + 0.05, v.y, 2.2, 2.2, 0);
  if (t.to) D.hop(v.x, CAO + t.cot - 1, v.y, 0.5, t.h + 1.4, 0.5, 0, MAU_COT);
  const N = [v.n.x, 0, v.n.y], Rx = v.n.y, Rz = -v.n.x, hw = t.w / 2, hh = t.h / 2, cy = CAO + t.cao;
  for (const k of [1, -1]){   // mặt trước và lưng biển (lưng lệch ra sau cột một chút)
    const q = B[k > 0 || v.haiMat ? v.anh : t.lung], e = 0.44 * k, cx = v.x + N[0]*e, cz = v.y + N[2]*e;
    G.trong.tu([cx - Rx*hw*k, cy - hh, cz - Rz*hw*k], [cx + Rx*hw*k, cy - hh, cz + Rz*hw*k], [cx + Rx*hw*k, cy + hh, cz + Rz*hw*k], [cx - Rx*hw*k, cy + hh, cz - Rz*hw*k], [N[0]*k, 0, N[2]*k], '#ffffff', {o: q});
  }
}
TP3.hinhVat.bien = tamBien;
// HÌNH THAY THẾ cho loại vật chưa có hàm dựng: cột với tấm biển trắng viền cam ghi mã của loại vật
TP3.hinhVat.thayThe = function(G, v, m){
  tamBien(G, {x: v.x, y: v.y, n: v.n || (TP3.chieuDiGan ? (d => ({x: -d.x, y: -d.y}))(TP3.chieuDiGan(v.x, v.y)) : {x: 0, y: 1}), anh: 'tt:' + m.ma, haiMat: true, k: {w: 11, h: 5.5, cot: 12, cao: 14.5}});
};
TP3.hinhVat.cotDen = function(G, c){
  const D = G.duc;
  D.tru(c.x, CAO, c.y, 0.75, 0.55, 15.5, 8, '#4d5a55', {aoDay: 0.7}); D.tru(c.x, CAO, c.y, 1.2, 1, 1.6, 8, '#3d4744');
  TP3.bongMo(G.bong, c.x, CAO + 0.05, c.y, 3.2, 3.2, 0);
  D.hop(c.x, Y_DEN + 10.6, c.y, 3.6, 1.7, 2.2, c.cam, '#3a4a5c', {truoc: '#9bd1ff'});   // camera phạt nguội trên đỉnh cột
  for (const h of c.hop){ const a = Math.atan2(h.n.y, h.n.x), bx = c.x + h.n.x * 1.6, by = c.y + h.n.y * 1.6;
    D.hop(bx, Y_DEN, by, 2.6, 10.6, 4.2, a, '#22252a', {coDay: true});
    for (let k = 0; k < 3; k++){ const p = viTriBong(c, h, k); D.hop(p.x + h.n.x*0.75, p.y + 1.35, p.z + h.n.y*0.75, 1.5, 0.25, 3.2, a, '#15171a'); } }   // mái che nhỏ trên mỗi bóng đèn
};
TP3.hinhVat.chotCSGT = function(G, v){
  const D = G.duc, p = v.p, a = Math.atan2(p.d.y, p.d.x), c = p.cabinPt;
  D.hop(c.x, CAO, c.y, 10, 5, 10, a, '#2f6fde', {aoDay: 0.75}); D.hop(c.x, CAO + 5, c.y, 10, 1.3, 10, a, '#f4f4f4');
  D.hop(c.x, CAO + 6.3, c.y, 9.6, 5, 9.6, a, '#9fc4e6', {ben: '#8fb8dc'}); D.hop(c.x, CAO + 11.3, c.y, 12.6, 1.2, 12.6, a, '#ffd43b', {coDay: true});
  for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) D.hop(c.x + (i*Math.cos(a) - j*Math.sin(a))*4.8, CAO + 6.3, c.y + (i*Math.sin(a) + j*Math.cos(a))*4.8, 0.7, 5, 0.7, a, '#2f6fde');
  TP3.bongMo(G.bong, c.x, CAO + 0.05, c.y, 8.5, 8.5, a);
  // chú CSGT áo vàng đứng giữa chòi và mép đường, quay mặt ra đường
  const ox = c.x - p.n.x*8 + p.d.x*3, oy = c.y - p.n.y*8 + p.d.y*3;
  if (TP3.nguoiTinh) TP3.nguoiTinh(D, ox, CAO, oy, Math.atan2(-p.n.y, -p.n.x), {ao: '#e3d24a', quan: '#c9b93a', mu: '#e3d24a', tay: 0.9});
  TP3.bongMo(G.bong, ox, CAO + 0.05, oy, 2.4, 2.4, 0);
  for (const k of [6, 16, 26]){ const x = p.x + p.n.x*(p.half - k), y = p.y + p.n.y*(p.half - k);   // cọc tiêu dọc vạch kiểm tra (đứng dưới lòng đường)
    D.hop(x, 0, y, 3.4, 0.4, 3.4, a, '#ff7a1a'); D.tru(x, 0.4, y, 1.4, 0.95, 2.2, 8, '#ff7a1a'); D.tru(x, 2.6, y, 0.95, 0.62, 1.1, 8, '#ffffff'); D.tru(x, 3.7, y, 0.62, 0, 1.6, 8, '#ff7a1a');
    TP3.bongMo(G.bong, x, 0.06, y, 2.6, 2.6, 0); }
};

/* ---------- duyệt danh mục: gom vật theo ô bản đồ, đăng ký ảnh mặt biển (chạy một lần khi nạp file) ----------
   ?thuThayThe=<mã> : ép một loại dùng hình thay thế, để xem thử hình thay thế trông ra sao (ví dụ ?thuThayThe=P.127) */
TP3.vatTheoO = new Map(); TP3.bienDS = []; TP3.cotDenDS = []; TP3.dungThayThe = {};
{ const B = TP3.anh.trong, R = TP3.O_RONG, ep = new URLSearchParams(location.search).get('thuThayThe');
  for (const ten of ['lungTron', 'lungTamGiac', 'lungVuong']) B.them(ten, 128, 128, MAT_BIEN[ten]);
  for (const m of TP3.DANH_MUC){
    if (m.kieu !== 'hinh') continue;
    if (ep === m.ma) m.hinh = 'chuaCo';
    const coHam = typeof TP3.hinhVat[m.hinh] === 'function', ds = m.nguon();
    if (!coHam){ TP3.dungThayThe[m.ma] = ds.length;   // chưa có hàm dựng: chuẩn bị tấm biển trắng ghi mã
      B.them('tt:' + m.ma, 256, 128, (g, w, h) => { g.fillStyle = '#ff7a1a'; rr(g, 2, 2, w - 4, h - 4, 14); g.fill(); g.fillStyle = '#fff'; rr(g, 12, 12, w - 24, h - 24, 8); g.fill();
        g.fillStyle = '#c2410c'; g.textAlign = 'center'; g.textBaseline = 'middle'; let co = 60; g.font = '800 ' + co + 'px ' + FONT; while (co > 16 && g.measureText(m.ma).width > w - 44){ co -= 2; g.font = '800 ' + co + 'px ' + FONT; } g.fillText(m.ma, w / 2, h / 2 + 3); }); }
    for (const v of ds){
      if (coHam && m.hinh === 'bien'){   // ảnh mặt biển và kích thước tấm
        const [net, ts] = v.mat;
        if (v.dang === 'bang'){ const hpx = ts.length * 38 + 24, w = 23, h = w * hpx / 256;
          v.k = {w, h, cot: 14, cao: 14 + h / 2, lung: 'lungVuong', to: true}; v.anh = B.them('cd:' + ts.map(r => r.k + r.name).join('|'), 192, Math.round(hpx * 0.75), MAT_BIEN.chiDan(ts)); }
        else { v.k = KICH[v.dang]; v.anh = B.them(net + (ts === undefined ? '' : ':' + ts), 128, 128, ts === undefined ? MAT_BIEN[net] : MAT_BIEN[net](ts)); }
      }
      v.m = m; const kh = Math.floor(v.x / R) + ',' + Math.floor(v.y / R);
      if (!TP3.vatTheoO.has(kh)) TP3.vatTheoO.set(kh, []); TP3.vatTheoO.get(kh).push(v);
      TP3.bienDS.push(v); if (m.ma === 'cot-den') TP3.cotDenDS.push(v);
    }
  }
}
const COT_DEN = TP3.cotDenDS;

/* ---------- lớp "biển": dựng mọi vật loại 'hinh' của danh mục nằm trong ô ---------- */
TP3.themLop('bien', (o, G) => {
  for (const v of TP3.vatTheoO.get(o.khoa) || []) (TP3.hinhVat[v.m.hinh] || TP3.hinhVat.thayThe)(G, v, v.m);
});

/* ---------- bóng đèn tín hiệu: một lưới chung, đổi màu theo lightOf() thật của game ---------- */
const DEN = {ds: [], luoi: null};
(TP3.dong = TP3.dong || []).push({
  tao(scene){
    const P = [], C = [], I = []; DEN.ds = [];
    DEN.mauBat = {red: TP3.mau('#ff3b30'), yellow: TP3.mau('#ffc53d'), green: TP3.mau('#3ddc5a')}; DEN.mauTat = TP3.mau('#3b3b45');
    for (const c of COT_DEN) for (const h of c.hop){
      const d = {L: h.L, phase: h.phase, tt: '', i: []}, Rx = h.n.y, Rz = -h.n.x;
      for (let k = 0; k < 3; k++){ const p = viTriBong(c, h, k), i0 = P.length / 3; d.i.push(i0);
        P.push(p.x, p.y, p.z); C.push(0, 0, 0);
        for (let j = 0; j < 10; j++){ const a = j / 10 * Math.PI*2, u = Math.cos(a)*1.35, v = Math.sin(a)*1.35; P.push(p.x + Rx*u, p.y + v, p.z + Rz*u); C.push(0, 0, 0); }
        for (let j = 0; j < 10; j++) I.push(i0, i0 + 1 + j, i0 + 1 + (j + 1) % 10); }
      DEN.ds.push(d);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(P), 3));
    const mauDinh = new T.BufferAttribute(new Float32Array(C), 3); mauDinh.setUsage(T.DynamicDrawUsage);
    g.setAttribute('color', mauDinh); g.setIndex(I); g.computeBoundingSphere();
    DEN.luoi = new T.Mesh(g, TP3.vl.den); DEN.luoi.matrixAutoUpdate = false; DEN.luoi.frustumCulled = false; scene.add(DEN.luoi);
    TP3.TT.hopDen = DEN.ds.length;
  },
  capNhat(){
    const arr = DEN.luoi.geometry.attributes.color.array; let doi = false;
    for (const d of DEN.ds){
      const tt = lightOf(d.L, d.phase, S.now); if (tt === d.tt) continue;
      d.tt = tt; doi = true;
      ['red', 'yellow', 'green'].forEach((m, k) => { const c = tt === m ? DEN.mauBat[m] : DEN.mauTat;
        for (let j = 0; j < 11; j++){ const q = (d.i[k] + j) * 3, s = j === 0 || tt !== m ? 1 : 0.72; arr[q] = c[0]*s; arr[q+1] = c[1]*s; arr[q+2] = c[2]*s; } });
    }
    if (doi) DEN.luoi.geometry.attributes.color.needsUpdate = true;
  }
});
})();
