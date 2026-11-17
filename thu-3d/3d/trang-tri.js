/* =========================================================
   Traffic Prune · thu-3d/3d/trang-tri.js: CÂY, CỘT ĐIỆN VÀ DÂY ĐIỆN, ĐẢO VÒNG XUYẾN, CHỢ, XE DỰNG VỈA HÈ
   Chỗ đặt cây và cột điện tính một lần cho cả vùng dựng (để tránh biển báo, cột đèn và tránh nhau), hình thì dựng theo từng ô.
   Mọi vị trí suy từ dữ liệu MAP (đường, vòng xuyến, nhà, phố đi bộ), không ghi cứng toạ độ.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const Gom = TP3.Gom, bam = TP3.bam, CAO = TP3.CAO_VIA;
const gan = (x, y, ds, r) => ds.some(o => Math.hypot(o.x - x, o.y - y) < r);
const trenVia = (x, y, r) => [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dy]) => x + dx > 3 && y + dy > 3 && x + dx < W - 3 && y + dy < H - 3 && MAP.classify(x + dx, y + dy).t === 'off');

/* ---------- chỗ đặt cây và cột điện (tính một lần) ---------- */
const CAY = TP3.cayDS = [], COT = TP3.cotDienDS = [];
TP3.khoiDong.push(() => {
  CAY.length = 0; COT.length = 0;
  const tranh = TP3.bienDS.concat(TP3.cotDenDS, CSGT.filter(p => !p.off).map(p => p.cabinPt), DESTS.map(d => ({x: d.lx, y: d.ly})));
  for (const r of MAP.roads){
    if (r.via || !r.veh || r.cap === 'alley') continue;
    // cột điện: một bên đường (bên phải theo chiều a→b), sát mép vỉa hè, cách nhau khoảng 105
    let truoc = null;
    for (let s = 58; s < r.len - 40; s += 105){
      const p = MAP.pointAt(r, s), le = r.half + 4.5, x = p.x - p.dir.y*le, y = p.y + p.dir.x*le;
      if (!TP3.trongVung(x, y, -4) || !trenVia(x, y, 2.5) || gan(x, y, tranh, 13)){ truoc = null; continue; }
      const c = {x, y, d: {x: p.dir.x, y: p.dir.y}, n: {x: -p.dir.y, y: p.dir.x}, noi: truoc && Math.hypot(truoc.x - x, truoc.y - y) < 160 ? truoc : null, den: (COT.length % 2) === 0};
      COT.push(c); truoc = c;
    }
    // cây: hai bên đường, lùi vào giữa vỉa hè, so le
    for (let s = 46; s < r.len - 30; s += 62) for (const k of [-1, 1]){
      const p = MAP.pointAt(r, s + (k > 0 ? 0 : 27)), le = r.half + 12.5, x = p.x - p.dir.y*le*k, y = p.y + p.dir.x*le*k;
      if (!TP3.trongVung(x, y, -6) || !trenVia(x, y, 5) || hitsHouse(x, y, 5) || gan(x, y, tranh, 30) || gan(x, y, CAY, 30) || gan(x, y, COT, 12)) continue;
      CAY.push({x, y});
    }
  }
  TP3.TT.cay = CAY.length; TP3.TT.cotDien = COT.length;
});

/* ---------- hình mẫu dựng một lần rồi chép vào từng chỗ ---------- */
let MAU = null;
function taoMau(){
  const M = {};
  // cây tán tròn, gốc quét vôi trắng
  M.than = new Gom(); M.than.tru(0, 0, 0, 1.05, 0.8, 13.5, 7, '#7a5d42', {aoDay: 0.8}); M.than.tru(0, 0, 0, 1.1, 1.0, 4.2, 7, '#efece2');
  M.than.thanh([0, 11, 0], [3.4, 16, 1.6], 0.7, 0.7, '#7a5d42'); M.than.thanh([0, 11.5, 0], [-3, 16.5, -2], 0.7, 0.7, '#7a5d42');
  M.tan = [0, 1].map(v => { const g = new Gom(), o = {n: 8, t: 5, aoDuoi: 0.55};
    g.cau(0, 19.5, 0, 8.4, 6.4, 8.4, '#ffffff', o); g.cau(3.6, 17, 2.2, 5.6, 4.4, 5.6, '#f2f2f2', o); g.cau(-3.6, 17.8, -2.4, 5.8, 4.6, 5.8, '#e9e9e9', o);
    if (v) g.cau(1, 23.6, -1, 5.2, 4, 5.2, '#ffffff', o); else g.cau(-1.5, 22.6, 2.4, 4.8, 3.8, 4.8, '#f6f6f6', o);
    return g; });
  // cột điện bê tông: xà ngang, sứ, hộp cáp, cần đèn đường vươn ra lòng đường
  M.cot = new Gom(); { const g = M.cot, bt = '#a8a49a';
    g.tru(0, 0, 0, 1.0, 0.62, 34, 8, bt, {aoDay: 0.75});
    g.thanh([0, 31.5, -3.6], [0, 31.5, 3.6], 0.5, 0.5, '#7d7f84'); for (const z of [-3.2, 0, 3.2]) g.tru(0, 31.7, z, 0.28, 0.28, 0.9, 6, '#6a3b2a');
    g.thanh([0, 25.6, -2.2], [0, 25.6, 2.2], 0.4, 0.4, '#7d7f84'); g.hop(0.7, 21.5, 0, 1.2, 2.6, 2, 0, '#55585e'); g.hop(-0.75, 23.6, 0.4, 0.9, 1.4, 1.2, 0, '#2a2c30'); }
  M.den = new Gom(); M.den.thanh([0, 27.5, 0], [0, 29.4, -6.5], 0.36, 0.36, '#8d9298'); M.den.hop(0, 29.0, -7.6, 1.5, 0.6, 3, 0, '#c9cdd2', {day: '#fff3c4', coDay: true});
  // xe máy dựng trên vỉa hè (không người)
  M.xeSon = new Gom(); M.xeCoDinh = new Gom();
  TP3.xe.hinhXeMay({son: M.xeSon, coDinh: M.xeCoDinh, ao: M.xeCoDinh, mu: M.xeCoDinh}, {son: '#ffffff'}, {khongNguoi: true});
  // ô che và bàn hàng ở phố chợ
  M.o = new Gom(); M.o.tru(0, 0, 0, 0.22, 0.22, 10.2, 6, '#d9d9d9'); M.o.tru(0, 9.2, 0, 7.2, 0.3, 2.6, 8, '#ffffff', {aoDay: 0.8}); M.o.tru(0, 9.15, 0, 7.2, 7.2, 0.05, 8, '#bdbdbd');
  M.ghe = new Gom(); M.ghe.hop(0, 1.5, 0, 1.6, 0.3, 1.6, 0, '#ffffff'); for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) M.ghe.hop(i*0.6, 0, j*0.6, 0.3, 1.5, 0.3, 0, '#ffffff');
  return M;
}
const XANH = ['#6fbf62', '#5fb062', '#84c96a', '#52a873', '#93cc78', '#6eb556'];
const SON_XE = ['#c0392b', '#2c5f9e', '#e8e8e8', '#2f2f35', '#3c8d5a', '#d8a22a', '#7a4a9c', '#d86a2a'];
const MAU_O = ['#d83a3a', '#2f79c4', '#e6b02e', '#3c9a5c', '#e06a2a'];

/* ---------- bàn bày hàng: mặt bàn dán ảnh hàng hoá, có thùng dưới gầm ---------- */
function banHang(G, x, z, a, dai, rong, loai){
  const A = TP3.anh.duc.o, c = Math.cos(a), s = Math.sin(a);
  G.hop(x, 2.6, z, dai, 0.5, rong, a, '#8a6a4a', {oTren: A['hang' + loai], tren: '#ffffff'});
  for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) G.hop(x + (i*c*(dai/2 - 0.4) - j*s*(rong/2 - 0.4)), 0, z + (i*s*(dai/2 - 0.4) + j*c*(rong/2 - 0.4)), 0.4, 2.6, 0.4, a, '#5a4634');
  G.hop(x, 0, z, dai * 0.5, 1.6, rong * 0.6, a, '#3f7fbf', {aoDay: 0.8});
}

TP3.themLop('trang-tri', (o, G) => {
  if (!MAU) MAU = taoMau();
  const D = G.duc, ct = TP3.Q.chiTiet, A = TP3.anh.duc.o;
  // --- cây ---
  for (const c of CAY){ if (!TP3.trongO(o, c.x, c.y)) continue;
    const s = 0.86 + bam(c.x, c.y, 3) * 0.36, g = bam(c.x, c.y, 5) * 6.28;
    D.dat(c.x, CAO, c.y, g, s); D.chen(MAU.than); D.chen(MAU.tan[bam(c.x, c.y, 6) < 0.5 ? 0 : 1], XANH[Math.floor(bam(c.x, c.y, 4) * XANH.length)]); D.dat();
    TP3.bongMo(G.bong, c.x + 2.5, CAO + 0.06, c.y + 2, 11 * s, 11 * s, 0);
  }
  // --- cột điện, đèn đường, dây điện ---
  for (const c of COT){ if (!TP3.trongO(o, c.x, c.y)) continue;
    const a = Math.atan2(c.d.y, c.d.x);
    D.dat(c.x, CAO, c.y, a); D.chen(MAU.cot); if (c.den) D.chen(MAU.den); D.dat();
    TP3.bongMo(G.bong, c.x, CAO + 0.05, c.y, 3, 3, 0);
    if (ct < 1) continue;
    const day = (x0, y0, z0, x1, y1, z1, vong, n) => { let px = x0, py = y0, pz = z0;   // một sợi dây võng xuống giữa nhịp
      for (let i = 1; i <= n; i++){ const t = i / n, x = x0 + (x1 - x0)*t, y = y0 + (y1 - y0)*t - vong * 4 * t * (1 - t), z = z0 + (z1 - z0)*t; G.day.push(px, py, pz, x, y, z); px = x; py = y; pz = z; } };
    if (c.noi){ const p = c.noi;
      for (const k of [-3.2, 0, 3.2]) day(p.x + p.n.x*k, CAO + 32.5, p.y + p.n.y*k, c.x + c.n.x*k, CAO + 32.5, c.y + c.n.y*k, 2.2, 6);          // ba dây điện trên xà
      for (let i = 0; i < 5; i++){ const k = -2 + i, v = 1.6 + bam(c.x, c.y, 10 + i) * 3.4;                                                 // bó cáp viễn thông chằng chịt
        day(p.x + p.n.x*k*0.8, CAO + 25.6 - i*0.25, p.y + p.n.y*k*0.8, c.x + c.n.x*k*0.8, CAO + 25.8 - (4 - i)*0.2, c.y + c.n.y*k*0.8, v, 6); } }
    for (let i = 0; i < 3; i++){   // dây kéo từ cột vào nhà
      const doc = (bam(c.x, c.y, 20 + i) - 0.5) * 70, tx = c.x + c.n.x*23.5 + c.d.x*doc, ty = c.y + c.n.y*23.5 + c.d.y*doc;
      if (hitsHouse(tx + c.n.x*3, ty + c.n.y*3, 0.5)) day(c.x, CAO + 24.5 + i*0.4, c.y, tx, CAO + 15 + bam(tx, ty, 2) * 14, ty, 1.2, 4);
    }
  }
  // --- đảo vòng xuyến: bồn hoa nhiều vòng màu, bụi cây, đài giữa ---
  for (const g of MAP.rings){ if (!TP3.trongO(o, g.x, g.y)) continue;
    D.tru(g.x, CAO, g.y, g.rIn - 0.4, g.rIn - 1.6, 1.4, 20, '#cfc8b8', {aoDay: 0.8});                       // bờ bồn
    D.tru(g.x, CAO + 1.4, g.y, g.rIn - 1.6, g.rIn - 1.6, 0.02, 20, '#6ea85a', {nap: true, mNap: '#6ea85a'});
    const HOA = ['#e8455a', '#ffd23f', '#ff8fc7', '#ffffff', '#f2792b'];
    for (const [k, r] of [[0, g.rIn - 6], [1, g.rIn - 13], [2, g.rIn - 20]]){ if (r < 8) continue; const n = Math.round(r * 1.1);
      for (let i = 0; i < n; i++){ const a = i / n * 6.283 + k * 0.3; D.cau(g.x + Math.cos(a)*r, CAO + 2.2, g.y + Math.sin(a)*r, 2.1, 1.3, 2.1, HOA[(k * 2 + (i >> 1)) % HOA.length], {n: 5, t: 3, aoDuoi: 0.6}); } }
    for (let i = 0; i < 6; i++){ const a = i / 6 * 6.283 + 0.4, r = Math.max(6, g.rIn - 28); D.cau(g.x + Math.cos(a)*r, CAO + 3.2, g.y + Math.sin(a)*r, 3.2, 2.8, 3.2, '#3f8a4a', {n: 6, t: 3, aoDuoi: 0.55}); }
    D.tru(g.x, CAO + 1.4, g.y, 6.5, 5.6, 3, 10, '#d8d2c4', {nap: true, aoDay: 0.8}); D.tru(g.x, CAO + 4.4, g.y, 2.3, 1.7, 17, 8, '#efe9dc');
    D.tru(g.x, CAO + 21.4, g.y, 3.2, 3.2, 0.8, 8, '#d8d2c4', {nap: true}); D.cau(g.x, CAO + 24.6, g.y, 2.4, 2.4, 2.4, '#f0b429', {n: 8, t: 4});
    TP3.bongMo(G.bong, g.x, CAO + 1.46, g.y, 11, 11, 0);
  }
  // --- chợ: mỗi ô "sạp" của game (h.stall) thành một dãy sạp mái bạt hai mái trên cột, bàn bày hàng, người bán đội nón lá ---
  for (const h of MAP.houses || []){ if (!h.stall || !TP3.trongO(o, h.x + h.w / 2, h.y + h.h / 2)) continue;
    const mau = ['#d83a3a', '#2f79c4', '#e6b02e', '#3c9a5c'][h.awn], ny = Math.max(1, Math.round(h.h / 48)), nx = Math.max(1, Math.round(h.w / 52));
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
      const x0 = h.x + h.w * i / nx + 2, x1 = h.x + h.w * (i + 1) / nx - 2, z0 = h.y + h.h * j / ny + 2, z1 = h.y + h.h * (j + 1) / ny - 2, xm = (x0 + x1) / 2, y0 = CAO;
      for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [xm, z0], [xm, z1]]) D.hop(x, y0, z, 0.6, x === xm ? 12.5 : 9.5, 0.6, 0, '#6f7378', {aoDay: 0.8});
      const u = TP3.catO(A.bat, 0, 1, 0, 1), mb = (i + j) % 2 ? mau : TP3.tron(mau, '#ffffff', 0.25);
      for (const [xa, n] of [[x0 - 1.5, -1], [x1 + 1.5, 1]]){   // hai mái bạt, cả mặt trên và mặt dưới
        D.tu([xa, y0 + 9.3, z1 + 1], [xa, y0 + 9.3, z0 - 1], [xm, y0 + 12.6, z0 - 1], [xm, y0 + 12.6, z1 + 1], [n * 0.3, 0.95, 0], mb, {o: u});
        D.tu([xa, y0 + 9.25, z1 + 1], [xa, y0 + 9.25, z0 - 1], [xm, y0 + 12.55, z0 - 1], [xm, y0 + 12.55, z1 + 1], [-n * 0.3, -0.95, 0], mb, {ao: 0.5}); }
      for (const [bx, k] of [[x0 + 7, 0], [x1 - 7, 1]]){ banHang(D, bx, (z0 + z1) / 2, Math.PI / 2, Math.min(26, z1 - z0 - 10), 7.5, (i + j + k) % 3);
        if (ct > 0 && TP3.nguoiTinh && bam(bx, z0, 1) < 0.6) TP3.nguoiTinh(D, bx + (k ? -6 : 6), y0, (z0 + z1) / 2 + (bam(bx, z0, 2) - 0.5) * 8, k ? Math.PI : 0, {ao: TP3.chon(['#c94f4f', '#4f7fc9', '#d9a441', '#5a9c6a'], bx, z0, 3), non: bam(bx, z0, 4) < 0.7}); }
      TP3.bongMo(G.bong, xm, y0 + 0.05, (z0 + z1) / 2, (x1 - x0) * 0.62, (z1 - z0) * 0.62, 0);
    }
  }
  // --- phố đi bộ: hàng ô che, bàn hàng, ghế nhựa hai bên lối đi ---
  for (const r of MAP.roads){ if (r.veh) continue;
    const s0 = r.gapA.gap + 34, s1 = r.len - r.gapB.gap - 30;
    for (let s = s0, i = 0; s < s1; s += 38, i++) for (const k of [-1, 1]){
      const p = MAP.pointAt(r, s + (k > 0 ? 0 : 19)), le = r.half - 5.5, x = p.x - p.dir.y*le*k, y = p.y + p.dir.x*le*k; if (!TP3.trongO(o, x, y)) continue;
      const a = Math.atan2(p.dir.y, p.dir.x), mo = MAU_O[(i * 2 + (k > 0 ? 0 : 1)) % MAU_O.length];
      D.dat(x, CAO, y, a + bam(x, y, 1)); D.chen(MAU.o, mo); D.dat();
      banHang(D.dat(0, CAO, 0), x + p.dir.x*1.5, y + p.dir.y*1.5, a, 9, 4.6, (i + (k > 0 ? 1 : 0)) % 3); D.dat();
      if (ct > 0) for (let q = 0; q < 2; q++){ D.dat(x - p.dir.x*(5 + q*2.6) + p.dir.y*k*2, CAO, y - p.dir.y*(5 + q*2.6) - p.dir.x*k*2, 0); D.chen(MAU.ghe, q ? '#d83a3a' : '#2f79c4'); D.dat(); }
      TP3.bongMo(G.bong, x, CAO + 0.05, y, 8, 8, 0);
    }
  }
  // --- xe máy dựng sát mặt tiền nhà (mức cao) ---
  if (ct > 1 && TP3.matNha) for (const h of MAP.houses || []){ if (h.stall || !TP3.trongO(o, h.x + h.w / 2, h.y + h.h / 2)) continue;
    for (const m of TP3.matNha(h)){ if (!m.pho) continue;
      const xd = {x: m.n.y, y: -m.n.x};
      for (let s = 10; s < m.dai - 8; s += 13){ if (bam(h.x + s, h.y + m.n.x * 7, 31) > 0.3) continue;
        const x = m.mx + xd.x*(s - m.dai / 2) + m.n.x*3.4, y = m.my + xd.y*(s - m.dai / 2) + m.n.y*3.4;
        if (gan(x, y, CAY, 6) || gan(x, y, COT, 5)) continue;
        D.dat(x, CAO, y, Math.atan2(xd.y, xd.x) + (bam(x, y, 32) - 0.5) * 0.5 + (bam(x, y, 33) < 0.5 ? Math.PI : 0)); D.chen(MAU.xeSon, SON_XE[Math.floor(bam(x, y, 34) * SON_XE.length)]); D.chen(MAU.xeCoDinh); D.dat();
        TP3.bongMo(G.bong, x, CAO + 0.05, y, 7, 3.2, Math.atan2(xd.y, xd.x));
      } } }
});
})();
