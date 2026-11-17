/* =========================================================
   Traffic Prune · thu-3d/3d/nguoi.js: NGƯỜI ĐI BỘ
   Người đi bộ của game (peds) chỉ có vị trí và màu áo; hướng mặt và nhịp bước suy ra từ quãng vừa đi.
   Thân, đầu, nón lá, chân, tay là các InstancedMesh riêng; chân tay đung đưa quanh khớp hông, khớp vai khi bước.
   TP3.nguoiTinh() dựng một người đứng yên vào hình tĩnh (chú CSGT, người bán hàng).
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, DA = '#e3b792', TOC = '#2b211c';
const QUAN = ['#3b4252', '#4a4a55', '#2f3a4d', '#6b5a48', '#1f2933', '#58606e'].map(m => TP3.mau(m));
// khớp hông và khớp vai trong hệ trục của người (x tới trước, z sang phải); người cao 9,3
const HONG = 4.4, VAI = 7.7;
function hinhThan(G){ G.hop(0, HONG, 0, 1.35, 3.7, 2.5, 0, '#ffffff', {aoDay: 0.85}); G.hop(0, HONG - 0.5, 0, 1.3, 0.7, 2.3, 0, '#8f9399'); }
function hinhDau(G, toc){ G.hop(0, VAI + 0.35, 0, 0.6, 0.5, 0.7, 0, DA); G.cau(0, 8.75, 0, 0.82, 0.88, 0.8, DA, {n: 8, t: 5}); G.cau(-0.08, 8.86, 0, 0.87, 0.86, 0.86, toc || TOC, {n: 8, t: 5, den: 3}); }
function hinhChan(G){ G.hop(0, -HONG, 0, 0.95, HONG, 0.98, 0, '#ffffff'); G.hop(0.25, -HONG, 0, 1.5, 0.5, 1.0, 0, '#3a3a3a'); }
function hinhTay(G){ G.hop(0, -3.1, 0, 0.72, 3.1, 0.72, 0, '#ffffff'); G.hop(0, -3.6, 0, 0.66, 0.6, 0.66, 0, DA); }
function hinhNon(G){ G.tru(0, 9.15, 0, 2.3, 0, 1.25, 12, '#e9dcae'); G.tru(0, 9.1, 0, 2.3, 2.3, 0.06, 12, '#cdbf8e'); }

// một người đứng yên dựng vào Gom tĩnh; o: {ao, quan, mu (mũ kê-pi), non (nón lá), tay: góc giơ tay phải}
TP3.nguoiTinh = function(G, x, y0, z, a, o){
  o = o || {};
  G.dat(x, y0, z, a);
  for (const k of [0.62, -0.62]){ G.hop(0, 0, k, 0.95, HONG, 0.98, 0, o.quan || '#3b4252', {aoDay: 0.8}); G.hop(0.25, 0, k, 1.5, 0.5, 1.0, 0, '#2a2a2a'); }
  G.hop(0, HONG, 0, 1.35, 3.7, 2.5, 0, o.ao || '#d9dde6');
  G.thanh([0, VAI, -1.62], [0.15, VAI - 3.3, -1.75], 0.72, 0.72, o.ao || '#d9dde6');
  if (o.tay) G.thanh([0, VAI, 1.62], [1.6, VAI + 1.6, 2.2], 0.72, 0.72, o.ao || '#d9dde6'); else G.thanh([0, VAI, 1.62], [0.15, VAI - 3.3, 1.75], 0.72, 0.72, o.ao || '#d9dde6');
  hinhDau(G);
  if (o.mu){ G.tru(0, 9.35, 0, 0.95, 0.95, 0.5, 10, o.mu, {nap: true}); G.hop(0.75, 9.35, 0, 0.8, 0.12, 1.5, 0, '#22252a'); }
  if (o.non) hinhNon(G);
  G.dat();
};
// ghi ma trận của một chân / tay: người ở (x, y0, z) quay góc a; khớp ở (kx, ky, kz) trong hệ trục của người; đung đưa góc th
function datChi(arr, i, x, y0, z, a, kx, ky, kz, th){
  const c = Math.cos(a), s = Math.sin(a), ct = Math.cos(th), st = Math.sin(th), o = i * 16;
  arr[o] = ct*c; arr[o+1] = st; arr[o+2] = ct*s; arr[o+3] = 0;  arr[o+4] = -st*c; arr[o+5] = ct; arr[o+6] = -st*s; arr[o+7] = 0;
  arr[o+8] = -s; arr[o+9] = 0; arr[o+10] = c; arr[o+11] = 0;  arr[o+12] = x + kx*c - kz*s; arr[o+13] = y0 + ky; arr[o+14] = z + kx*s + kz*c; arr[o+15] = 1;
}
const N = TP3.nguoi = {};
(TP3.dong = TP3.dong || []).push({
  tao(scene){
    const so = Math.max(8, peds.length), L = (ve, n, mau) => { const l = TP3.taoLap(ve, n, {mau}); scene.add(l); return l; };
    N.than = L(hinhThan, so, true); N.dau = L(hinhDau, so, false); N.dau.instanceMatrix = N.than.instanceMatrix;
    N.non = L(hinhNon, so, false); N.chan = L(hinhChan, so * 2, true); N.tay = L(hinhTay, so * 2, true);
  },
  capNhat(dt){
    const tam = TP3.tamXa * 0.45, tam2 = tam * tam, px = player.x, py = player.y, BD = TP3.bongDong, CAO = TP3.CAO_VIA;
    const mt = N.than.instanceMatrix.array, ct = N.than.instanceColor.array, mc = N.chan.instanceMatrix.array, cc = N.chan.instanceColor.array, my = N.tay.instanceMatrix.array, cy = N.tay.instanceColor.array, mn = N.non.instanceMatrix.array;
    let k = 0, kn = 0, stt = 0;
    for (const p of peds){
      stt++;
      const dx = p.x - px, dy = p.y - py; if (dx*dx + dy*dy > tam2){ p._x3 = undefined; continue; }
      let di = 0;
      if (p._x3 !== undefined){ const ax = p.x - p._x3, ay = p.y - p._y3; di = Math.hypot(ax, ay); if (di > 0.01){ const g = Math.atan2(ay, ax); p._a3 = p._a3 === undefined ? g : p._a3 + normA(g - p._a3) * Math.min(1, dt * 10); } }
      p._x3 = p.x; p._y3 = p.y; p._ph3 = (p._ph3 || stt) + di * 0.62;
      const dung = di < 0.02, bien = dung ? 0 : 0.62; p._bd3 = (p._bd3 || 0) + (bien - (p._bd3 || 0)) * Math.min(1, dt * 8);
      const th = Math.sin(p._ph3) * p._bd3, a = p._a3 || 0, y0 = (p.cross && crossOnRoad(p)) ? 0 : CAO;
      const m = p._m3 || (p._m3 = {ao: TP3.mau(p.color), quan: QUAN[stt % QUAN.length], non: stt % 4 === 1});
      TP3.datMaTran(mt, k, p.x, y0, p.y, a); ct[k*3] = m.ao[0]; ct[k*3+1] = m.ao[1]; ct[k*3+2] = m.ao[2];
      datChi(mc, k*2, p.x, y0, p.y, a, 0, HONG, 0.62, th); datChi(mc, k*2 + 1, p.x, y0, p.y, a, 0, HONG, -0.62, -th);
      datChi(my, k*2, p.x, y0, p.y, a, 0, VAI, 1.62, -th * 0.8); datChi(my, k*2 + 1, p.x, y0, p.y, a, 0, VAI, -1.62, th * 0.8);
      for (let j = 0; j < 2; j++){ const q = (k*2 + j) * 3; cc[q] = m.quan[0]; cc[q+1] = m.quan[1]; cc[q+2] = m.quan[2]; cy[q] = m.ao[0]; cy[q+1] = m.ao[1]; cy[q+2] = m.ao[2]; }
      if (m.non) TP3.datMaTran(mn, kn++, p.x, y0, p.y, a);
      BD.them(p.x, y0 + 0.07, p.y, a, 2.3, 2.3); k++;
    }
    N.than.count = N.dau.count = k; N.chan.count = N.tay.count = k * 2; N.non.count = kn;
    for (const l of [N.than, N.chan, N.tay, N.non]) l.instanceMatrix.needsUpdate = true;
    for (const l of [N.than, N.chan, N.tay]) l.instanceColor.needsUpdate = true;
    BD.xong();
  }
});
})();
