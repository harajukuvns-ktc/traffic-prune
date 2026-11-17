/* =========================================================
   Traffic Prune · thu-3d/3d/nha.js: NHÀ ỐNG VÀ TRƯỜNG HỌC
   Dữ liệu: MAP.houses của game (các ô chữ nhật, cũng là vùng va chạm) nên nhà 3D luôn nằm gọn trong ô đó.
   Mỗi ô chữ nhật sát đường được cắt thành nhiều nhà ống mặt tiền hẹp, cao thấp so le (2–6 tầng): tầng trệt là cửa tiệm
   (cửa cuốn, cửa kính, cửa sắt xếp) có bảng hiệu và mái hiên; tầng trên có ban công lan can, cửa sổ có khung, ô văng,
   cục nóng điều hoà; mái bằng có tum và bồn nước inox, hoặc mái tôn; tường bên trát xi măng loang ố.
   Ô chữ nhật nằm trong lõi khối phố (không sát đường) dựng thành nhà đơn giản mái tôn.
   Nhà gần điểm giao là trường học (biểu tượng 🏫 / 🎒 trong DESTS) dựng thành trường có sân, hàng rào, cổng và cột cờ.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const bam = TP3.bam, CAO = TP3.CAO_VIA, catO = TP3.catO;
const H_TRET = 18, H_TANG = 14.5;
// màu sơn nhà kiểu phố Việt: vàng kem, cam đất, hồng, xanh ngọc, xanh lơ, trắng ngà...
const SON = ['#f1ddb0', '#f3cf86', '#eec08a', '#e3a584', '#ecb3a4', '#c9dfbd', '#b9d5e4', '#f2ecdf', '#e2cfae', '#d6c2dc', '#f6e3a0', '#e9d9c4', '#cfe0d6', '#f0c9a0'];
const TON = ['#a4523f', '#7f97ab', '#5f8f73', '#9a9da1', '#b5694a', '#6b7f95'];
const BAT = ['#2f6fb3', '#2e8b57', '#c0392b', '#e0a526', '#5d6d7e', '#c0562a'];
const XI_MANG = '#b3aea4';

/* ---------- ảnh riêng của file này: tên trường trên cổng, lá cờ ---------- */
const TRUONG = DESTS.filter(d => d.icon === '🏫' || d.icon === '🎒');
for (const d of TRUONG) TP3.anh.duc.them('truong:' + d.name, 512, 96, (g, w, h) => {
  g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#ffd43b'; g.lineWidth = 4; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; let co = 44; g.font = '800 ' + co + 'px ' + TP3.FONT;
  const t = d.name.toUpperCase(); while (co > 14 && g.measureText(t).width > w - 40){ co--; g.font = '800 ' + co + 'px ' + TP3.FONT; } g.fillText(t, w/2, h/2 + 2);
});
TP3.anh.duc.them('co', 96, 64, (g, w, h) => { g.fillStyle = '#da251d'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffeb3b'; g.beginPath();
  for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i * Math.PI / 5, r = i % 2 ? 8 : 20; g.lineTo(w/2 + Math.cos(a)*r, h/2 + Math.sin(a)*r); } g.closePath(); g.fill(); });
// nhà nào là trường: ô chữ nhật gần ô đỗ của điểm giao nhất
const NHA_TRUONG = new Map();
for (const d of TRUONG){ let tot = null, dTot = 1e9;
  for (const h of MAP.houses || []){ if (h.stall) continue; const dd = rectCircleDist(h, d.bay.cx, d.bay.cy); if (dd < dTot){ dTot = dd; tot = h; } }
  if (tot && dTot < 80) NHA_TRUONG.set(tot, d); }

/* ---------- mặt nào của ô nhà quay ra đường ---------- */
function cacMat(h){
  const cx = h.x + h.w / 2, cy = h.y + h.h / 2;
  const ds = [{n: {x: 0, y: -1}, mx: cx, my: h.y, dai: h.w, sau: h.h}, {n: {x: 0, y: 1}, mx: cx, my: h.y + h.h, dai: h.w, sau: h.h},
              {n: {x: -1, y: 0}, mx: h.x, my: cy, dai: h.h, sau: h.w}, {n: {x: 1, y: 0}, mx: h.x + h.w, my: cy, dai: h.h, sau: h.w}];
  for (const m of ds){
    // mặt quay ra đường nếu đi ra ngoài 34 đơn vị (sân 5 + vỉa hè 22 + lấn vào đường) gặp lòng đường hoặc phố đi bộ
    const t = TP3.loaiDat(m.mx + m.n.x * 34, m.my + m.n.y * 34);
    m.pho = t !== 'off' && t !== 'island' && m.mx + m.n.x * 34 > 0 && m.my + m.n.y * 34 > 0 && m.mx + m.n.x * 34 < W && m.my + m.n.y * 34 < H;
  }
  return ds;
}
// khung riêng của một mặt: gốc ở góc bên trái (nhìn từ ngoài đường vào), x chạy sang phải dọc mặt tiền, z hướng ra đường
function khungMat(m){
  const xd = {x: m.n.y, y: -m.n.x};
  return {ox: m.mx - xd.x * m.dai / 2, oy: m.my - xd.y * m.dai / 2, a: Math.atan2(xd.y, xd.x)};
}

/* ---------- các nét dựng dùng lại (trong khung riêng của mặt tiền) ---------- */
// tấm đứng: gốc (ox, oz), chạy theo hướng (dx, dz) từ s0 đến s1, cao y0..y1, nhô ra `nho` theo pháp tuyến
function tam(G, ox, oz, dx, dz, s0, s1, y0, y1, nho, m, o){
  const nx = -dz, nz = dx, P = (s, y) => [ox + dx*s + nx*nho, y, oz + dz*s + nz*nho];
  G.tu(P(s0, y0), P(s1, y0), P(s1, y1), P(s0, y1), [nx, 0, nz], m, o);
}

/* ---------- một căn nhà ống ---------- */
// x0..x1: khoảng mặt tiền; D: chiều sâu; lui: mặt tiền lùi vào bao nhiêu; hat: hạt giống ngẫu nhiên; benTrai / benPhai: tường bên cũng quay ra đường
function nhaOng(G, GT, x0, x1, D, lui, hx, hy, o){
  const A = TP3.anh.duc.o, B = TP3.anh.trong.o, w = x1 - x0, ct = TP3.Q.chiTiet, r = k => bam(hx, hy, k);
  const tang = o.tang || [2, 3, 3, 3, 4, 4, 4, 5, 5, 6][Math.floor(r(1) * 10)];
  const son = SON[Math.floor(r(2) * SON.length)], vien = TP3.tron(son, '#ffffff', 0.55), ben = TP3.tron(XI_MANG, son, 0.22);
  const Hm = H_TRET + (tang - 1) * H_TANG, z0 = -lui, tuong = A['tuong' + Math.floor(r(3) * 3)];
  const coBC = r(4) < 0.62, lanCan = Math.floor(r(5) * 4);   // lanCan 3 = lan can xây kín
  const cs = A['cs' + Math.floor(r(6) * TP3.SO_CUA_SO)], cuaBC = A[r(7) < 0.6 ? 'cs3' : 'cs2'];
  const mat = (s0, s1, y0, y1, nho, m, oo) => tam(G, x0, z0, 1, 0, s0, s1, y0, y1, nho, m, oo);   // tấm trên mặt tiền
  // --- tường mặt tiền, từng tầng một (đỉnh tầng sẫm hơn nếu phía trên có ban công che) ---
  for (let k = 0; k < tang; k++){
    const yb = k === 0 ? 0 : H_TRET + (k - 1) * H_TANG, yt = k === 0 ? H_TRET : yb + H_TANG, che = coBC && k < tang - 1 && ct > 0;
    mat(0, w, yb, yt, 0, son, {o: tuong, ao: [k === 0 ? 0.8 : 0.96, k === 0 ? 0.8 : 0.96, che ? 0.8 : 1, che ? 0.8 : 1]});
  }
  // --- tầng trệt: cửa tiệm, bảng hiệu, mái hiên ---
  const tiem = r(8) < 0.78, kieuCua = tiem ? Math.floor(r(9) * TP3.SO_CUA_TIEM) : (r(9) < 0.5 ? 3 : 0);
  mat(1.1, w - 1.1, 0, 12.4, 0.12, '#ffffff', {o: A['ct' + kieuCua], ao: [0.86, 0.86, 1, 1]});
  if (tiem){
    const bw = Math.min(w - 1.4, 21), bx = (w - bw) / 2, bh = A['bh' + Math.floor(r(10) * TP3.SO_BANG_HIEU)];
    G.hop(x0 + w/2, 12.9, z0 + 0.45, bw, 4.9, 0.9, 0, '#3a3d42', {oBen: null});
    mat(bx, bx + bw, 12.9, 17.8, 0.92, '#ffffff', {o: bh});
    if (ct > 0 && r(11) < 0.45){   // mái hiên bạt sọc
      const mb = BAT[Math.floor(r(12) * BAT.length)], ya = 12.6, yb = 10.3, ra = 6.2, o_ = A.bat, nn = [0, 0.93, 0.36];
      G.tu([x0 + 0.6, yb, z0 + ra], [x1 - 0.6, yb, z0 + ra], [x1 - 0.6, ya, z0 + 0.3], [x0 + 0.6, ya, z0 + 0.3], nn, mb, {o: o_});
      G.tu([x0 + 0.6, yb, z0 + ra], [x1 - 0.6, yb, z0 + ra], [x1 - 0.6, ya, z0 + 0.3], [x0 + 0.6, ya, z0 + 0.3], [0, -0.93, -0.36], mb, {ao: 0.55});
      G.tu([x0 + 0.6, yb - 1, z0 + ra], [x1 - 0.6, yb - 1, z0 + ra], [x1 - 0.6, yb, z0 + ra], [x0 + 0.6, yb, z0 + ra], [0, 0, 1], mb, {o: catO(o_, 0, 1, 0, 0.3)});
    }
  }
  // --- các tầng trên ---
  const soCua = w > 31 ? 2 : 1;
  for (let k = 1; k < tang; k++){
    const yb = H_TRET + (k - 1) * H_TANG, bc = coBC && ct > 0;
    if (ct > 0) G.hop(x0 + w/2, yb - 0.5, z0 + 0.3, w, 0.6, 0.6, 0, vien);   // gờ chỉ giữa hai tầng
    for (let c = 0; c < soCua; c++){
      const cx = w * (c + 0.5) / soCua;
      if (bc) mat(cx - 3.5, cx + 3.5, yb + 0.7, yb + 11.2, 0.12, '#ffffff', {o: cuaBC});
      else { mat(cx - 2.9, cx + 2.9, yb + 3.2, yb + 11.6, 0.12, '#ffffff', {o: cs});
        if (ct > 0) G.hop(x0 + cx, yb + 11.9, z0 + 0.8, 7.4, 0.5, 1.6, 0, vien, {coDay: true}); }   // ô văng che cửa sổ
    }
    if (bc){   // ban công: sàn đua ra, lan can sắt (có lỗ thủng) hoặc xây kín
      const ra = 4.4, bx0 = x0 + 0.5, bx1 = x1 - 0.5;
      G.hop((bx0 + bx1) / 2, yb - 0.1, z0 + ra / 2, bx1 - bx0, 0.8, ra, 0, vien, {coDay: true, ao: 0.97});
      if (lanCan === 3){ G.hop((bx0 + bx1) / 2, yb + 0.7, z0 + ra - 0.3, bx1 - bx0, 4, 0.6, 0, son, {aoDay: 0.85});
        G.hop(bx0 + 0.3, yb + 0.7, z0 + ra / 2, 0.6, 4, ra, 0, son); G.hop(bx1 - 0.3, yb + 0.7, z0 + ra / 2, 0.6, 4, ra, 0, son); }
      else { const lc = B['lc' + lanCan], n = Math.max(1, Math.round((bx1 - bx0) / 8.4));
        for (let i = 0; i < n; i++) tam(GT, bx0, z0 + ra - 0.15, 1, 0, (bx1 - bx0) * i / n, (bx1 - bx0) * (i + 1) / n, yb + 0.7, yb + 4.9, 0, '#ffffff', {o: lc});
        tam(GT, bx0 + 0.15, z0, 0, 1, 0, ra, yb + 0.7, yb + 4.9, 0, '#ffffff', {o: catO(lc, 0, 0.5, 0, 1)});
        tam(GT, bx1 - 0.15, z0, 0, 1, 0, ra, yb + 0.7, yb + 4.9, 0, '#ffffff', {o: catO(lc, 0, 0.5, 0, 1)}); }
      if (ct > 1 && r(20 + k) < 0.5){ const px = bx0 + 1.6 + r(30 + k) * (bx1 - bx0 - 3.2);   // chậu cây trên ban công
        G.hop(px, yb + 0.7, z0 + ra - 1.4, 1.5, 1.3, 1.5, 0, '#a8623f'); G.cau(px, yb + 3.1, z0 + ra - 1.4, 1.5, 1.6, 1.5, r(40 + k) < 0.3 ? '#d6457a' : '#4f9a4a', {n: 6, t: 3, aoDuoi: 0.6}); }
    }
    if (ct > 0 && w >= 21 && r(50 + k) < 0.42){   // cục nóng điều hoà trên giá sắt
      const ax = r(60 + k) < 0.5 ? x0 + 2.9 : x1 - 2.9, ay = bc ? yb + 8.4 : yb + 1.0;
      G.hop(ax, ay, z0 + 1.1, 4.2, 3, 1.8, 0, '#dfe2e4', {coDay: true}); mat(ax - x0 - 2.1, ax - x0 + 2.1, ay, ay + 3, 2.02, '#ffffff', {o: A.dh});
    }
  }
  // --- mái ---
  const maiTon = o.maiTon !== undefined ? o.maiTon : r(13) < 0.38;
  let dinhBen = Hm;   // tường bên cao tới đâu
  if (maiTon){   // mái tôn hai mái, nóc chạy ngang song song mặt tiền
    const mt = TON[Math.floor(r(14) * TON.length)], len = Math.min(5.5, D * 0.12), zn = z0 - D / 2, t = A.ton, u = catO(t, 0, Math.min(1, w / 32), 0, 1);
    G.tu([x0, Hm - 0.3, z0 + 1.2], [x1, Hm - 0.3, z0 + 1.2], [x1, Hm + len, zn], [x0, Hm + len, zn], [0, 0.97, 0.24], mt, {o: u});
    G.tu([x1, Hm - 0.3, -D - 0.6], [x0, Hm - 0.3, -D - 0.6], [x0, Hm + len, zn], [x1, Hm + len, zn], [0, 0.97, -0.24], mt, {o: u});
    for (const [x, nx] of [[x0, -1], [x1, 1]]) G.tamGiac([x, Hm, z0], [x, Hm, -D], [x, Hm + len, zn], [nx, 0, 0], ben);   // hai đầu hồi
    mat(0, w, Hm - 0.9, Hm, 0.5, vien, {});
  } else {       // mái bằng: tường chắn mái, tum cầu thang, bồn nước inox
    dinhBen = Hm + 2.2;
    G.tu([x0, Hm, z0], [x1, Hm, z0], [x1, Hm, -D], [x0, Hm, -D], [0, 1, 0], '#9d988f', {o: A.maiBang, ao: 0.92});
    mat(0, w, Hm, Hm + 2.2, 0, son, {o: catO(tuong, 0, 1, 0.8, 1)}); G.hop(x0 + w/2, Hm + 2.2, z0 - 0.1, w + 0.4, 0.5, 1.2, 0, vien);
    tam(G, x1, z0, -1, 0, 0, w, Hm, Hm + 2.2, 0.6, ben, {ao: 0.85});   // mặt trong của tường chắn mái
    if (ct > 0){
      const tw = Math.min(w - 3, 11), tx = r(15) < 0.5 ? x0 + tw / 2 + 0.6 : x1 - tw / 2 - 0.6, tz = -D + 6 + r(16) * Math.max(0, D - 30);
      G.hop(tx, Hm, tz, tw, 8, 9, 0, ben, {tren: '#8f8a82', aoDay: 0.8});
      if (r(17) < 0.7){ const bx = tx + (r(18) - 0.5) * 2, bz = tz;
        for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) G.hop(bx + i*1.7, Hm + 8, bz + j*1.7, 0.4, 2.2, 0.4, 0, '#6f757b');
        G.tru(bx, Hm + 10.2, bz, 2.3, 2.3, 4.6, 10, '#ffffff', {nap: true, mNap: '#cfd5da', o: A.bon}); }
    }
  }
  // --- tường bên và tường sau: xi măng loang ố; tường bên quay ra đường thì sơn và có cửa sổ ---
  const tb = A['tuong' + (2 + Math.floor(r(19) * 2))];
  for (const [trai, pho] of [[true, o.benTrai], [false, o.benPhai]]){
    const ox = trai ? x0 : x1, oz = trai ? -D : z0, dz = trai ? 1 : -1, dai = D - lui;
    tam(G, ox, oz, 0, dz, 0, dai, 0, dinhBen, 0, pho ? son : ben, {o: tb, ao: [0.8, 0.8, 1, 1]});
    if (pho) for (let k = 0; k < tang; k++) for (let s = 12; s < dai - 8; s += 24){
      const yb = k === 0 ? 0 : H_TRET + (k - 1) * H_TANG;
      tam(G, ox, oz, 0, dz, s - 2.9, s + 2.9, yb + 3.4, yb + 11.8, 0.12, '#ffffff', {o: k === 0 ? A.cs4 : cs});
    }
  }
  tam(G, x1, -D, -1, 0, 0, w, 0, dinhBen, 0, ben, {o: tb, ao: [0.8, 0.8, 1, 1]});
  return Hm;
}

/* ---------- nhà trong lõi khối phố: đơn giản, mái tôn ---------- */
function nhaLoi(G, h){
  const A = TP3.anh.duc.o, n = h.w > 70 ? 2 : 1;
  for (let i = 0; i < n; i++){
    const x0 = h.x + h.w * i / n + 1, x1 = h.x + h.w * (i + 1) / n - 1, tang = 2 + Math.floor(bam(x0, h.y, 1) * 2), Hm = 16 + (tang - 1) * 13;
    const mau = TP3.tron(XI_MANG, SON[Math.floor(bam(x0, h.y, 2) * SON.length)], 0.5), mt = TON[Math.floor(bam(x0, h.y, 3) * TON.length)], tb = A['tuong' + (1 + Math.floor(bam(x0, h.y, 4) * 3))];
    G.dat(0, CAO, 0, 0);
    const ao = [0.8, 0.8, 1, 1], zs = h.y + h.h, zn = h.y, zm = h.y + h.h / 2;
    G.tu([x0, 0, zs], [x1, 0, zs], [x1, Hm, zs], [x0, Hm, zs], [0, 0, 1], mau, {o: tb, ao});
    G.tu([x1, 0, zn], [x0, 0, zn], [x0, Hm, zn], [x1, Hm, zn], [0, 0, -1], mau, {o: tb, ao});
    G.tu([x1, 0, zs], [x1, 0, zn], [x1, Hm, zn], [x1, Hm, zs], [1, 0, 0], mau, {o: tb, ao});
    G.tu([x0, 0, zn], [x0, 0, zs], [x0, Hm, zs], [x0, Hm, zn], [-1, 0, 0], mau, {o: tb, ao});
    G.tu([x0, Hm, zs], [x1, Hm, zs], [x1, Hm + 5, zm], [x0, Hm + 5, zm], [0, 0.97, 0.24], mt, {o: A.ton});
    G.tu([x1, Hm, zn], [x0, Hm, zn], [x0, Hm + 5, zm], [x1, Hm + 5, zm], [0, 0.97, -0.24], mt, {o: A.ton});
    for (const [x, nx] of [[x0, -1], [x1, 1]]) G.tamGiac([x, Hm, zs], [x, Hm, zn], [x, Hm + 5, zm], [nx, 0, 0], mau);
  }
}

/* ---------- trường học: sân trước có hàng rào, cổng ghi tên trường, cột cờ; dãy lớp hai tầng tường vàng ---------- */
function truongHoc(G, GT, h, m, d, Gb){
  const A = TP3.anh.duc.o, B = TP3.anh.trong.o, kh = khungMat(m), L = m.dai, D = m.sau, san = Math.min(30, D * 0.34);
  G.dat(kh.ox, CAO, kh.oy, kh.a); GT.dat(kh.ox, CAO, kh.oy, kh.a);
  const vang = '#f2cd68', vien = '#fbf3d6', mai = '#a8483a';
  // dãy lớp học
  const z0 = -san, Hm = H_TRET + H_TANG, t = A.tuong0;
  for (let k = 0; k < 2; k++){ const yb = k ? H_TRET : 0, yt = k ? Hm : H_TRET;
    tam(G, 0, z0, 1, 0, 0, L, yb, yt, 0, vang, {o: t, ao: [0.85, 0.85, k ? 1 : 0.82, k ? 1 : 0.82]});
    for (let s = 6; s < L - 5; s += 10.5) tam(G, 0, z0, 1, 0, s - 3, s + 3, yb + 4, yb + 12.4, 0.12, '#ffffff', {o: (Math.round(s / 10.5) % 4 === 1) ? A.cs3 : A.cs0}); }
  G.hop(L / 2, H_TRET - 0.4, z0 + 2.2, L, 0.8, 4.4, 0, vien, {coDay: true});                    // hành lang tầng hai
  G.hop(L / 2, H_TRET + 0.4, z0 + 4.1, L, 4, 0.6, 0, vang, {aoDay: 0.85});
  for (let s = 0.6; s <= L; s += (L - 1.2) / Math.max(2, Math.round(L / 20))) G.hop(s, 0, z0 + 4, 1.3, H_TRET - 0.4, 1.3, 0, vien, {aoDay: 0.8});   // hàng cột
  tam(G, L, z0, 0, -1, 0, D - san, 0, Hm, 0, vang, {o: A.tuong1, ao: [0.8, 0.8, 1, 1]}); tam(G, 0, -D, 0, 1, 0, D - san, 0, Hm, 0, vang, {o: A.tuong1, ao: [0.8, 0.8, 1, 1]});
  tam(G, L, -D, -1, 0, 0, L, 0, Hm, 0, vang, {o: A.tuong2, ao: [0.8, 0.8, 1, 1]});
  const zn = (z0 - D) / 2, u = catO(A.ton, 0, 1, 0, 1);
  G.tu([-1, Hm - 0.4, z0 + 5.5], [L + 1, Hm - 0.4, z0 + 5.5], [L + 1, Hm + 7, zn], [-1, Hm + 7, zn], [0, 0.95, 0.3], mai, {o: u});
  G.tu([L + 1, Hm - 0.4, -D - 1], [-1, Hm - 0.4, -D - 1], [-1, Hm + 7, zn], [L + 1, Hm + 7, zn], [0, 0.95, -0.3], mai, {o: u});
  for (const [x, nx] of [[0, -1], [L, 1]]) G.tamGiac([x, Hm, z0], [x, Hm, -D], [x, Hm + 7, zn], [nx, 0, 0], vang);
  // hàng rào mặt trước và hai bên sân: bệ xây thấp, song sắt xanh, trụ vuông; chừa cổng ở giữa
  const cong = Math.min(L / 2, Math.max(8, (d.bay.cx - kh.ox) * Math.cos(kh.a) + (d.bay.cy - kh.oy) * Math.sin(kh.a) + 40)), rc = 15;   // cổng lệch khỏi ô đỗ một chút
  const rao = (ox, oz, dx, dz, dai) => { const n = Math.max(1, Math.round(dai / 11));
    for (let i = 0; i < n; i++){ const s0 = dai * i / n, s1 = dai * (i + 1) / n;
      tam(G, ox, oz, dx, dz, s0, s1, 0, 1.8, 0.3, vien, {ao: [0.8, 0.8, 1, 1]}); tam(G, ox, oz, -dx, -dz, -s1, -s0, 0, 1.8, 0.3, vien, {ao: [0.8, 0.8, 1, 1]});
      G.tu([ox + dx*s0 - dz*0.3, 1.8, oz + dz*s0 + dx*0.3], [ox + dx*s1 - dz*0.3, 1.8, oz + dz*s1 + dx*0.3], [ox + dx*s1 + dz*0.3, 1.8, oz + dz*s1 - dx*0.3], [ox + dx*s0 + dz*0.3, 1.8, oz + dz*s0 - dx*0.3], [0, 1, 0], vien);
      tam(GT, ox, oz, dx, dz, s0, s1, 1.8, 7.2, 0, '#ffffff', {o: B.hr});
      G.hop(ox + dx*s0, 0, oz + dz*s0, 1.3, 7.6, 1.3, 0, vien, {aoDay: 0.8}); }
    G.hop(ox + dx*dai, 0, oz + dz*dai, 1.3, 7.6, 1.3, 0, vien, {aoDay: 0.8}); };
  rao(0, 0, 1, 0, cong - rc / 2); rao(cong + rc / 2, 0, 1, 0, L - cong - rc / 2); rao(0, -san, 0, 1, san); rao(L, -san, 0, 1, san);
  for (const x of [cong - rc / 2, cong + rc / 2]) G.hop(x, 0, 0, 2.4, 12.5, 2.4, 0, vang, {aoDay: 0.8, tren: vien});   // cổng: hai trụ, bảng tên bắc ngang
  G.hop(cong, 11, 0, rc + 5, 4.6, 1.2, 0, '#1f5fa8'); const bt = A['truong:' + d.name];
  tam(G, cong - rc / 2 - 2, 0, 1, 0, 0, rc + 4, 11.2, 15.4, 0.62, '#ffffff', {o: bt}); tam(G, cong + rc / 2 + 2, 0, -1, 0, 0, rc + 4, 11.2, 15.4, 0.62, '#ffffff', {o: bt});
  // cột cờ giữa sân
  const cx = Math.min(L - 8, cong + rc), cz = -san * 0.5;
  G.tru(cx, 0, cz, 0.9, 0.9, 1, 8, '#d9d3c5', {nap: true}); G.tru(cx, 1, cz, 0.22, 0.16, 25, 6, '#d5d9dd');
  G.tu([cx, 20, cz], [cx + 6.6, 20, cz], [cx + 6.6, 24.4, cz], [cx, 24.4, cz], [0, 0, 1], '#ffffff', {o: A.co}); G.tu([cx + 6.6, 20, cz], [cx, 20, cz], [cx, 24.4, cz], [cx + 6.6, 24.4, cz], [0, 0, -1], '#ffffff', {o: A.co});
  G.dat(); GT.dat();
}

/* ---------- lớp "nhà": dựng mọi nhà có tâm nằm trong ô ---------- */
TP3.themLop('nha', (o, G) => {
  const D = G.duc, GT = G.trong;
  for (const h of MAP.houses || []){
    const cx = h.x + h.w / 2, cy = h.y + h.h / 2;
    if (!TP3.trongO(o, cx, cy) || h.stall) continue;   // sạp chợ dựng ở trang-tri.js
    const ms = cacMat(h), pho = ms.filter(m => m.pho);
    if (!pho.length){ nhaLoi(D, h); D.dat(); continue; }
    const chinh = pho.reduce((a, b) => b.dai > a.dai + 1 ? b : a, pho[0]);
    if (NHA_TRUONG.has(h)){ truongHoc(D, GT, h, chinh, NHA_TRUONG.get(h), G.bong); continue; }
    const kh = khungMat(chinh), L = chinh.dai, n = Math.max(1, Math.round(L / 27));
    // tường bên nào cũng quay ra đường (nhà ở góc phố)? bên trái có pháp tuyến ngược trục x riêng
    const xd = {x: chinh.n.y, y: -chinh.n.x}, phoTrai = pho.some(m => m.n.x === -xd.x && m.n.y === -xd.y), phoPhai = pho.some(m => m.n.x === xd.x && m.n.y === xd.y);
    D.dat(kh.ox, CAO, kh.oy, kh.a); GT.dat(kh.ox, CAO, kh.oy, kh.a);
    const cat = [0]; for (let i = 1; i < n; i++) cat.push(L * i / n + (bam(h.x + i, h.y, 7) - 0.5) * 7); cat.push(L);
    for (let i = 0; i < n; i++){
      const sx = h.x + i * 3.7, lui = bam(sx, h.y, 21) < 0.3 ? 0 : bam(sx, h.y, 22) * 2.2, sau = chinh.sau * (0.86 + 0.14 * bam(sx, h.y, 23));
      nhaOng(D, GT, cat[i], cat[i + 1], sau, lui, sx, h.y + 0.37, {benTrai: i === 0 && phoTrai, benPhai: i === n - 1 && phoPhai});
    }
    D.dat(); GT.dat();
  }
});
TP3.nhaOng = nhaOng; TP3.matNha = cacMat;
})();
