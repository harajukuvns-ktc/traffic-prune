/* =========================================================
   Traffic Prune · thu-3d/3d/xe.js: XE MÁY, Ô TÔ, XE BUÝT (xe NPC và xe của người chơi)
   Hình xe dựng bằng code trong hệ trục riêng (x tới trước, y lên trên, z sang phải), không dùng file mô hình.
   Xe máy NPC: bốn InstancedMesh dùng chung vị trí (phần sơn nhận màu xe, phần cố định, áo người lái, mũ bảo hiểm),
   mỗi khung hình chỉ ghi lại vị trí, hướng, màu. Xe buýt ít nên mỗi xe một lưới riêng (để mỗi xe mang số tuyến riêng).
   Kích thước: game vẽ xe máy to hơn thật nhiều so với ô tô (dễ nhìn trên bản đồ 2D); ở 3D xe máy thu lại một chút cho
   cân với ô tô, nhưng vẫn nằm trong vùng va chạm của game.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, Gom = TP3.Gom;
const TI_LE_XM = 6.2;   // xe máy và người lái dựng theo mét rồi phóng 6,2 lần
const vong = (cx, cy, r, n) => { const p = []; for (let i = 0; i < n; i++){ const a = i / n * Math.PI*2; p.push([cx + Math.cos(a)*r, cy + Math.sin(a)*r]); } return p; };
const LOP = '#1a1b1e', VANH = '#b9bec4', DA = '#e3b792', KINH_XE = '#2c4257';

/* ---------- xe máy tay ga có người lái (đơn vị: mét) ----------
   P: các Gom nhận hình {son, coDinh, ao, mu, toc}; m: màu {son, ao, quan}; o.thung: thùng giao hàng của shipper */
function hinhXeMay(P, m, o){
  o = o || {};
  const S_ = P.son, C = P.coDinh, k = TI_LE_XM;
  for (const g of new Set(Object.values(P))) g.dat(0, 0, 0, 0, k);
  // bánh, vành, càng trước
  for (const x of [0.62, -0.62]){ C.dun(vong(x, 0.25, 0.25, 12), -0.055, 0.055, LOP); C.dun(vong(x, 0.25, 0.145, 10), -0.062, 0.062, VANH); }
  for (const z of [0.075, -0.075]) C.thanh([0.63, 0.25, z], [0.5, 0.94, z], 0.035, 0.035, '#9aa0a6');
  // thân xe (nhìn ngang): yếm trước, sàn để chân, thân dưới yên, đuôi
  S_.dun([[0.56, 0.34], [0.6, 0.94], [0.5, 1.0], [0.42, 0.9], [0.37, 0.4], [0.06, 0.36], [0.0, 0.62], [-0.14, 0.76], [-0.8, 0.8], [-0.93, 0.7], [-0.86, 0.5], [-0.55, 0.32], [0, 0.25]], -0.15, 0.15, m.son);
  S_.hop(0.5, 0.38, 0, 0.07, 0.56, 0.5, 0, m.son);                                   // yếm chắn gió
  S_.hop(0.535, 0.84, 0, 0.17, 0.2, 0.32, 0, m.son, {truoc: '#fff7d6'});             // đầu xe và đèn pha
  S_.hop(0.64, 0.5, 0, 0.38, 0.055, 0.14, 0, m.son);                                 // chắn bùn trước
  C.dun([[-0.78, 0.8], [-0.12, 0.775], [-0.1, 0.86], [-0.8, 0.9]], -0.14, 0.14, '#26272c');   // yên
  C.thanh([0.47, 1.03, -0.33], [0.47, 1.03, 0.33], 0.04, 0.04, '#26272c');           // ghi đông
  for (const z of [1, -1]){ C.thanh([0.47, 1.03, z*0.25], [0.43, 1.2, z*0.33], 0.02, 0.02, '#26272c'); C.hop(0.43, 1.16, z*0.34, 0.02, 0.09, 0.13, 0, '#3a3d44', {truoc: '#9fb6c9'}); }   // gương
  C.hop(-0.28, 0.2, 0, 0.5, 0.2, 0.2, 0, '#3a3c41'); C.thanh([-0.35, 0.3, 0.17], [-0.92, 0.43, 0.17], 0.075, 0.075, '#8d9298');   // máy, ống xả
  C.hop(-0.935, 0.66, 0, 0.03, 0.09, 0.17, 0, '#a3241c'); C.hop(-0.965, 0.5, 0, 0.012, 0.12, 0.2, 0, '#f2f2f2');                 // đèn hậu, biển số
  if (o.thung){ C.hop(-0.74, 0.9, 0, 0.44, 0.42, 0.46, 0, '#2f9e6b', {tren: '#38b47b'}); C.hop(-0.74, 1.32, 0, 0.46, 0.03, 0.48, 0, '#1f7a52'); }   // thùng giao hàng
  if (o.khongNguoi) return;
  // người lái: quần (cố định), áo (màu riêng), tay, đầu, mũ bảo hiểm (màu riêng) hoặc tóc
  const Q = m.quan || '#3b4252';
  for (const z of [1, -1]){ C.thanh([-0.36, 0.93, z*0.13], [0.08, 0.86, z*0.18], 0.14, 0.13, Q); C.thanh([0.08, 0.86, z*0.18], [0.2, 0.42, z*0.19], 0.105, 0.1, Q);
    C.hop(0.24, 0.36, z*0.19, 0.2, 0.07, 0.09, 0, '#1f2023');
    P.ao.thanh([-0.3, 1.36, z*0.2], [0.42, 1.05, z*0.3], 0.09, 0.09, m.ao); C.hop(0.44, 1.01, z*0.3, 0.08, 0.08, 0.09, 0, DA); }
  P.ao.thanh([-0.39, 0.9, 0], [-0.3, 1.43, 0], 0.37, 0.21, m.ao);
  C.cau(-0.27, 1.575, 0, 0.1, 0.118, 0.1, DA, {n: 8, t: 5});
  P.mu.cau(-0.275, 1.6, 0, 0.14, 0.135, 0.135, m.mu || '#ffffff', {n: 8, t: 5, den: 3}); P.mu.hop(-0.15, 1.565, 0, 0.07, 0.02, 0.21, 0, m.mu || '#ffffff');
  if (P.toc) P.toc.cau(-0.28, 1.6, 0, 0.112, 0.112, 0.11, '#2b211c', {n: 8, t: 5, den: 3});
}
// đèn xi-nhan bên phải của xe máy (bên trái dùng lại hình này lật gương) và đèn phanh
function hinhNhayXM(G){ G.dat(0, 0, 0, 0, TI_LE_XM); G.hop(0.56, 0.78, 0.2, 0.05, 0.06, 0.08, 0, '#ffb000'); G.hop(-0.9, 0.62, 0.15, 0.05, 0.06, 0.08, 0, '#ffb000'); }
function hinhPhanhXM(G){ G.dat(0, 0, 0, 0, TI_LE_XM); G.hop(-0.945, 0.655, 0, 0.03, 0.1, 0.18, 0, '#ff2a1f'); }

/* ---------- ô tô con (đơn vị bản đồ; dài 20, rộng 9,4, cao 7,8) ---------- */
function hinhOTo(P, son){
  const Th = P.than, Bu = P.buong, hw = 4.7;
  // thân dưới: cản trước, nắp capo dốc, hông xe, cốp
  Th.dun([[10, 1.9], [10, 3.75], [9.5, 4.45], [5.3, 5.05], [-8.3, 5.35], [-9.85, 4.9], [-10, 2.0], [-9.3, 1.35], [9.3, 1.35]], -hw, hw, son, {mCanh: {7: '#2a2c31', 8: '#1c1d20'}});
  for (const z of [hw + 0.02, -hw - 0.02]) for (const x of [6.2, -6.2]){   // hốc bánh
    const p = vong(x, 1.95, 2.5, 14).filter(q => q[1] >= 1.35); Th.daGiac(p, z, z > 0 ? 1 : -1, '#141518'); }
  for (const x of [6.2, -6.2]) for (const z of [1, -1]){ Th.dun(vong(x, 1.95, 1.95, 14), z*3.5, z*4.82, LOP); Th.dun(vong(x, 1.95, 1.2, 10), z*4.7, z*4.88, VANH); }
  const mt = (x, y0, y1, z0, z1, mau, n) => Th.tu([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], [n, 0, 0], mau);
  mt(10.03, 2.15, 3.0, -2.3, 2.3, '#17181b', 1);                                                    // lưới tản nhiệt
  for (const z of [1, -1]){ mt(10.03, 3.05, 3.72, z*2.6, z*4.25, '#fff6d8', 1); mt(-10.03, 3.9, 4.7, z*2.5, z*4.4, '#7d1814', -1); }   // đèn pha, đèn hậu
  mt(-10.04, 2.6, 3.4, -1.4, 1.4, '#f2f2f2', -1); mt(10.04, 2.25, 2.9, -1.2, 1.2, '#f2f2f2', 1);     // biển số
  for (const z of [1, -1]) Th.hop(4.5, 5.1, z*5.05, 0.8, 0.85, 1.1, 0, son, {sau: '#9fb6c9'});       // gương
  // buồng lái: kính chắn gió, nóc, kính sau; cửa kính hai bên
  Bu.dun([[5.3, 5.05], [2.7, 7.55], [-4.4, 7.8], [-8.3, 5.35]], -4.2, 4.2, son, {mCanh: {0: KINH_XE, 2: KINH_XE}});
  for (const z of [4.22, -4.22]){ const n = z > 0 ? 1 : -1;
    Bu.daGiac([[4.45, 5.3], [2.62, 7.12], [-0.5, 7.3], [-0.5, 5.3]], z, n, KINH_XE); Bu.daGiac([[-1.15, 5.3], [-1.15, 7.3], [-4.3, 7.42], [-7.35, 5.5], [-7.35, 5.3]], z, n, KINH_XE); }
}
function hinhNhayOTo(G){ for (const x of [10.04, -10.04]) G.tu([x, 3.05, 4.25], [x, 3.05, 4.68], [x, 3.72, 4.68], [x, 3.72, 4.25], [x > 0 ? 1 : -1, 0, 0], '#ffb000');
  G.hop(9.2, 3.1, 4.72, 1.2, 0.55, 0.1, 0, '#ffb000'); G.hop(-9.3, 4.0, 4.72, 1, 0.6, 0.1, 0, '#ffb000'); }
function hinhPhanhOTo(G){ for (const z of [1, -1]) G.tu([-10.06, 3.9, z*2.5], [-10.06, 3.9, z*4.4], [-10.06, 4.7, z*4.4], [-10.06, 4.7, z*2.5], [-1, 0, 0], '#ff2a1f');
  G.tu([-7.2, 7.0, -1.6], [-7.2, 7.0, 1.6], [-7.0, 7.25, 1.6], [-7.0, 7.25, -1.6], [-0.8, 0.6, 0], '#ff2a1f'); }

/* ---------- xe buýt xanh (dài 46, rộng 15,6, cao 15,2): cửa bên phải, kính, số tuyến ---------- */
function hinhXeBuyt(G, soTuyen){
  const A = TP3.anh.duc.o, xanh = '#2f9e5e', xanhSam = '#237a48', kinh = '#2b4458', hw = 7.8;
  G.dun([[23, 2.2], [23, 10.5], [22.3, 14.4], [21, 15.2], [-22.4, 15.2], [-23, 14.4], [-23, 2.2], [-22, 1.5], [22, 1.5]], -hw, hw, xanh, {mCanh: {3: '#e9efe9', 7: '#1c1d20', 6: xanhSam, 8: xanhSam}});
  const ben = (x0, x1, y0, y1, z, mau, o) => { const n = z > 0 ? 1 : -1, e = z + n * 0.03;   // tấm dán trên hông xe
    if (n > 0) G.tu([x0, y0, e], [x1, y0, e], [x1, y1, e], [x0, y1, e], [0, 0, 1], mau, o); else G.tu([x1, y0, e], [x0, y0, e], [x0, y1, e], [x1, y1, e], [0, 0, -1], mau, o); };
  for (const z of [hw, -hw]){
    ben(-22.6, 22.6, 5.4, 6.7, z, '#f4f6f4'); ben(-22.6, 22.6, 1.6, 2.9, z, xanhSam);       // sọc trắng, váy xe
    for (let i = 0; i < 6; i++){ const x0 = -20.5 + i * 6.6; if (z > 0 && (i === 5 || i === 2)) continue; ben(x0, x0 + 5.7, 7.6, 12.8, z, kinh); }   // cửa kính
    ben(-13.5 - 2.2, -13.5 + 2.2, 1.5, 3.6, z, '#141518'); ben(15.5 - 2.2, 15.5 + 2.2, 1.5, 3.6, z, '#141518');   // hốc bánh
  }
  for (const x0 of [-7.3, 12.5]){ ben(x0, x0 + 5.7, 2.6, 12.8, hw, '#1d2b38'); ben(x0 + 2.75, x0 + 2.95, 2.6, 12.8, hw + 0.02, '#c9ced3'); ben(x0 + 0.5, x0 + 2.4, 5.5, 12.2, hw + 0.02, kinh); ben(x0 + 3.3, x0 + 5.2, 5.5, 12.2, hw + 0.02, kinh); }   // hai cửa lên xuống bên phải
  for (const x of [15.5, -13.5]) for (const z of [1, -1]){ G.dun(vong(x, 2.5, 2.5, 14), z*6.1, z*7.86, LOP); G.dun(vong(x, 2.5, 1.5, 10), z*7.7, z*7.92, VANH); }
  const mt = (x, y0, y1, z0, z1, mau, n, o) => G.tu(n > 0 ? [x, y0, z1] : [x, y0, z0], n > 0 ? [x, y0, z0] : [x, y0, z1], n > 0 ? [x, y1, z0] : [x, y1, z1], n > 0 ? [x, y1, z1] : [x, y1, z0], [n, 0, 0], mau, o);
  mt(23.04, 6.3, 10.5, -7, 7, kinh, 1); G.tu([23.05, 10.5, 7], [23.05, 10.5, -7], [22.5, 13.4, -7], [22.5, 13.4, 7], [0.98, 0.2, 0], kinh);   // kính lái
  G.tu([22.5, 13.5, 3.4], [22.5, 13.5, -3.4], [22.32, 14.5, -3.4], [22.32, 14.5, 3.4], [0.98, 0.2, 0], '#ffffff', {o: A['so' + soTuyen]});        // bảng số tuyến
  ben(-3, 3.4, 9.2, 12.4, -hw - 0.02, '#ffffff', {o: A['so' + soTuyen]});
  for (const z of [1, -1]){ mt(23.04, 3.0, 4.2, z*4.4 - 1.2, z*4.4 + 1.2, '#fff6d8', 1); mt(-23.04, 3.2, 5.2, z*5.6 - 0.9, z*5.6 + 0.9, '#a3241c', -1); }
  mt(-23.04, 7.6, 12.6, -6.2, 6.2, kinh, -1); mt(23.05, 2.4, 3.2, -1.6, 1.6, '#f2f2f2', 1);
  G.hop(-4, 15.2, 0, 12, 1.5, 9, 0, '#dfe5df');                                                   // máy lạnh trên nóc
  for (const z of [1, -1]) G.thanh([22.6, 11.5, z*7.8], [23.6, 10.2, z*9.2], 0.3, 0.3, '#17181b');   // gương
}

/* ---------- ghi ma trận đặt vật vào ô thứ i của một InstancedMesh ---------- */
// đặt tại (x, y0, z), quay theo góc bản đồ a; kz = −1 thì lật gương theo chiều ngang (đèn xi-nhan bên trái)
TP3.datMaTran = function(arr, i, x, y0, z, a, kz){
  const c = Math.cos(a), s = Math.sin(a), o = i * 16, k = kz || 1;
  arr[o] = c; arr[o+1] = 0; arr[o+2] = s; arr[o+3] = 0;  arr[o+4] = 0; arr[o+5] = 1; arr[o+6] = 0; arr[o+7] = 0;
  arr[o+8] = -s * k; arr[o+9] = 0; arr[o+10] = c * k; arr[o+11] = 0;  arr[o+12] = x; arr[o+13] = y0; arr[o+14] = z; arr[o+15] = 1;
};
TP3.taoLap = function(ve, so, o){   // tạo một InstancedMesh từ hàm vẽ hình; o.mau: có màu riêng từng vật; o.vl: chất liệu
  o = o || {}; const G = new Gom(); ve(G);
  const l = new T.InstancedMesh(G.hinh(), o.vl || TP3.vl.duc, so);
  l.instanceMatrix.setUsage(T.DynamicDrawUsage); l.frustumCulled = false; l.matrixAutoUpdate = false; l.count = 0; l.castShadow = !o.khongBong;
  if (o.mau){ l.setColorAt(0, new T.Color(1, 1, 1)); l.instanceColor.setUsage(T.DynamicDrawUsage); }
  return l;
};
// bóng mờ dưới gầm xe, dưới chân người: một InstancedMesh các tấm dẹt, mỗi khung hình xếp lại
const BD = TP3.bongDong = {n: 0,
  tao(scene){ const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]), 3));
    g.setAttribute('uv', new T.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2)); g.setIndex([0, 2, 1, 0, 3, 2]);
    BD.luoi = new T.InstancedMesh(g, TP3.vl.bong, 160); BD.luoi.instanceMatrix.setUsage(T.DynamicDrawUsage); BD.luoi.frustumCulled = false; BD.luoi.matrixAutoUpdate = false; BD.luoi.renderOrder = 1; scene.add(BD.luoi); },
  batDau(){ BD.n = 0; },
  them(x, y, z, a, dai, rong){ if (BD.n >= 160) return; const arr = BD.luoi.instanceMatrix.array, o = BD.n++ * 16, c = Math.cos(a), s = Math.sin(a);
    arr[o] = c*dai; arr[o+1] = 0; arr[o+2] = s*dai; arr[o+3] = 0; arr[o+4] = 0; arr[o+5] = 1; arr[o+6] = 0; arr[o+7] = 0; arr[o+8] = -s*rong; arr[o+9] = 0; arr[o+10] = c*rong; arr[o+11] = 0; arr[o+12] = x; arr[o+13] = y; arr[o+14] = z; arr[o+15] = 1; },
  xong(){ BD.luoi.count = BD.n; BD.luoi.instanceMatrix.needsUpdate = true; }
};

/* ---------- xe NPC sắp rẽ bên nào? (dữ liệu của game không có xi-nhan cho NPC: suy từ tuyến đi phía trước) ---------- */
function sapRe(n){
  const pts = n.route && n.route.pts; if (!pts || n.v < 6) return 0;
  let x = n.x, y = n.y, i = n.idx, d = 0, N = pts.length;
  for (let b = 0; b < 8 && d < 75; b++){ const p = pts[i]; if (!p) break; d += Math.hypot(p.x - x, p.y - y); x = p.x; y = p.y; i++; if (i >= N){ if (n.route.loop) i = 0; else break; } }
  const p = pts[Math.min(i, N - 1)]; if (!p || (p.x === x && p.y === y)) return 0;
  const lech = normA(Math.atan2(p.y - y, p.x - x) - n.a);
  return Math.abs(lech) < 0.5 ? 0 : (lech > 0 ? 1 : -1);   // y hướng xuống nên góc tăng là rẽ phải
}
const AO_NPC = ['#e8e4d8', '#4a6fa5', '#b5483a', '#3f7d5c', '#d9a441', '#6b5b95', '#2f3640', '#c97a9a', '#7fa3b8'].map(m => TP3.mau(m));

const X = TP3.xe = {};
(TP3.dong = TP3.dong || []).push({
  tao(scene){
    const so = Math.max(8, npcs.length), P = {son: new Gom(), coDinh: new Gom(), ao: new Gom(), mu: new Gom()};
    hinhXeMay(P, {son: '#ffffff', ao: '#ffffff', mu: '#ffffff'});
    const lap = (G, mau, vl) => { const l = new T.InstancedMesh(G.hinh(), vl || TP3.vl.duc, so); l.frustumCulled = false; l.matrixAutoUpdate = false; l.count = 0; l.castShadow = true;
      if (mau){ l.setColorAt(0, new T.Color(1, 1, 1)); l.instanceColor.setUsage(T.DynamicDrawUsage); } scene.add(l); return l; };
    X.son = lap(P.son, true); X.son.instanceMatrix.setUsage(T.DynamicDrawUsage);
    X.coDinh = lap(P.coDinh, false); X.ao = lap(P.ao, true); X.mu = lap(P.mu, true);
    X.coDinh.instanceMatrix = X.ao.instanceMatrix = X.mu.instanceMatrix = X.son.instanceMatrix;   // bốn phần dùng chung vị trí
    X.nhay = TP3.taoLap(hinhNhayXM, so, {vl: TP3.vl.sang, khongBong: true}); X.phanh = TP3.taoLap(hinhPhanhXM, so, {vl: TP3.vl.sang, khongBong: true}); scene.add(X.nhay); scene.add(X.phanh);
    X.buyt = new Map(); X.scene = scene;
    BD.tao(scene);
    // xe máy của người chơi (shipper áo cam, thùng hàng xanh): thân, mũ hoặc tóc, đèn xi-nhan, đèn phanh
    { const G = new Gom(), Gm = new Gom(), Gt = new Gom();
      hinhXeMay({son: G, coDinh: G, ao: G, mu: Gm, toc: Gt}, {son: '#ff8a3d', ao: '#f7a35a', mu: '#ffffff', quan: '#2f3a4d'}, {thung: true});
      const nhom = new T.Group(), M = (g, vl) => { const l = new T.Mesh(g.hinh(), vl || TP3.vl.duc); l.castShadow = true; nhom.add(l); return l; };
      const than = M(G), mu = M(Gm), toc = M(Gt);
      const nhay = [-1, 1].map(kz => { const g = new Gom(); hinhNhayXM(g); const l = M(g, TP3.vl.sang); l.scale.z = kz; l.castShadow = false; return l; });
      const gp = new Gom(); hinhPhanhXM(gp); const phanh = M(gp, TP3.vl.sang); phanh.castShadow = false;
      scene.add(nhom); X.xeToi = {nhom, than, mu, toc, nhay, phanh}; }
    // ô tô của người chơi: thân dưới (có nắp capo), buồng lái (ẩn khi nhìn từ sau vô lăng), mặt táp-lô (chỉ hiện khi nhìn từ sau vô lăng)
    { const Gt = new Gom(), Gb = new Gom(); hinhOTo({than: Gt, buong: Gb}, '#f07f2e');
      const nhom = new T.Group(), M = (g, vl) => { const l = new T.Mesh(g.hinh(), vl || TP3.vl.duc); l.castShadow = true; nhom.add(l); return l; };
      const than = M(Gt), buong = M(Gb), Gl = new Gom(); Gl.hop(3.9, 3.6, 0, 1.4, 2.0, 9.2, 0, '#25242b', {tren: '#2f2e36'}); const tapLo = M(Gl);
      const nhay = [-1, 1].map(kz => { const g = new Gom(); hinhNhayOTo(g); const l = M(g, TP3.vl.sang); l.scale.z = kz; l.castShadow = false; return l; });
      const gp = new Gom(); hinhPhanhOTo(gp); const phanh = M(gp, TP3.vl.sang); phanh.castShadow = false;
      scene.add(nhom); X.oTo = {nhom, than, buong, tapLo, nhay, phanh}; }
  },
  capNhat(dt){
    const tam = TP3.tamXa * (S.view === 'bike' ? 0.7 : 0.62), tam2 = tam * tam, px = player.x, py = player.y, nhip = (S.now % 0.7) < 0.35;
    BD.batDau();
    const mx = X.son.instanceMatrix.array, cs = X.son.instanceColor.array, ca = X.ao.instanceColor.array, cm = X.mu.instanceColor.array, mn = X.nhay.instanceMatrix.array, mp = X.phanh.instanceMatrix.array;
    let nx = 0, nn = 0, np = 0; const conBuyt = new Set();
    for (const n of npcs){
      if (n.hidden) continue;
      const dx = n.x - px, dy = n.y - py; if (dx*dx + dy*dy > tam2) continue;
      const m = n._m3 || (n._m3 = {son: TP3.mau(n.color), mu: TP3.mau(n.helmet), ao: AO_NPC[n.id % AO_NPC.length], so: TP3.SO_TUYEN[n.id % TP3.SO_TUYEN.length]});
      if (n.kind === 'bus'){
        let l = X.buyt.get(n); if (!l){ const G = new Gom(); hinhXeBuyt(G, m.so); l = new T.Mesh(G.hinh(), TP3.vl.duc); l.castShadow = true; X.scene.add(l); X.buyt.set(n, l); }
        l.visible = true; l.position.set(n.x, 0, n.y); l.rotation.y = -n.a; conBuyt.add(n); BD.them(n.x, 0.07, n.y, n.a, 29, 12.5);
        continue;
      }
      // xe đang "nhường xuyên qua" (bản 2D vẽ mờ) thì vẽ nhạt màu hơn
      const mo = n.ghostP > 0 || n.ghostT > 0 ? 1.6 : 1;
      TP3.datMaTran(mx, nx, n.x, 0, n.y, n.a);
      cs[nx*3] = m.son[0]*mo; cs[nx*3+1] = m.son[1]*mo; cs[nx*3+2] = m.son[2]*mo; ca[nx*3] = m.ao[0]; ca[nx*3+1] = m.ao[1]; ca[nx*3+2] = m.ao[2]; cm[nx*3] = m.mu[0]; cm[nx*3+1] = m.mu[1]; cm[nx*3+2] = m.mu[2]; nx++;
      BD.them(n.x, 0.07, n.y, n.a, 9.5, 5);
      if (nhip){ const re = n._re3 = (n._reT3 || 0) > S.now ? n._re3 : (n._reT3 = S.now + 0.3, sapRe(n)); if (re) TP3.datMaTran(mn, nn++, n.x, 0, n.y, n.a, re); }
      // đèn phanh: đang giảm tốc rõ hoặc đang đứng chờ
      const giam = n._v3 !== undefined && dt > 0 && (n._v3 - n.v) / dt > 30; n._v3 = n.v;
      if (giam || n.v < 1.5) TP3.datMaTran(mp, np++, n.x, 0, n.y, n.a);
    }
    for (const [n, l] of X.buyt) if (!conBuyt.has(n)) l.visible = false;
    X.son.count = X.coDinh.count = X.ao.count = X.mu.count = nx; X.nhay.count = nn; X.phanh.count = np;
    X.son.instanceMatrix.needsUpdate = true; X.son.instanceColor.needsUpdate = true; X.ao.instanceColor.needsUpdate = true; X.mu.instanceColor.needsUpdate = true;
    X.nhay.instanceMatrix.needsUpdate = true; X.phanh.instanceMatrix.needsUpdate = true;
    TP3.TT.xeVe = nx + conBuyt.size;
    // xe của người chơi: đèn xi-nhan nháy theo S.turn / S.blinkOn của game, đèn phanh khi đang bóp phanh; đầu trần nếu chưa đội mũ (S.helmet)
    const car = S.veh === 'car', bike = S.view === 'bike', B = X.xeToi, O = X.oTo, dangPhanh = (keys.brake || keys.down) && player.v > -1;
    B.nhom.visible = !car && !bike; O.nhom.visible = car;
    const nhom = car ? O.nhom : B.nhom; nhom.position.set(px, 0, py); nhom.rotation.y = -player.a;
    if (car){ O.buong.visible = !bike; O.tapLo.visible = bike; } else { B.mu.visible = !!S.helmet; B.toc.visible = !S.helmet; }
    const V = car ? O : B; V.nhay[0].visible = S.turn < 0 && S.blinkOn; V.nhay[1].visible = S.turn > 0 && S.blinkOn; V.phanh.visible = dangPhanh;
    if (!bike || car) BD.them(px, 0.07, py, player.a, car ? 14.5 : 9.5, car ? 8.6 : 5);
  }
});
X.hinhXeMay = hinhXeMay; X.TI_LE_XM = TI_LE_XM;
})();
