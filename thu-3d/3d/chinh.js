/* =========================================================
   Traffic Prune · thu-3d/3d/chinh.js: DỰNG CẢNH THEO Ô, VẼ MỖI KHUNG HÌNH, GIỮ MÁT MÁY, NỐI VÀO GAME
   Nạp SAU CÙNG. "Bộ não" của game (luật, bắt lỗi, xe NPC, chỉ đường, trợ lái, giao hàng, âm thanh, bảng thông tin) giữ nguyên;
   file này chỉ gán lại vài hàm toàn cục của game.js:
     render()  → góc 'nav' và 'bike' vẽ bằng 3D; góc 'map' gọi lại hàm vẽ 2D gốc
     resize()  → gọi hàm gốc rồi chỉnh thêm khung vẽ 3D
     step()    → chỉ bọc lại để đo thời gian

   CHỖ DÍNH GIỮA "BỘ NÃO" VÀ PHẦN VẼ 2D, VÀ CÁCH XỬ LÝ:
   (1) render() của game làm ba việc: vẽ canvas 2D, vẽ bản đồ nhỏ (drawMini), cập nhật bảng thông tin (updHUD)
       → render mới tự gọi drawMini() và updHUD() sau khi vẽ 3D.
   (2) resize() của game vừa tính cỡ canvas 2D và phép nghiêng CSS, vừa đổi chữ nút góc nhìn, lớp body.bike, cỡ bản đồ nhỏ
       → resize mới gọi hàm gốc rồi thu nhỏ, ẩn canvas 2D và đặt cỡ khung 3D.
   (3) Sự kiện đổi cỡ cửa sổ gắn thẳng vào hàm resize GỐC → gắn thêm một bộ nghe riêng gọi resize mới.
   (4) Tên đường, tên điểm giao, tiền bay lên, 😤 💬 vẽ trong drawUprights bằng canvas 2D → chu-noi.js.
   (5) Biển báo, cột đèn trong dữ liệu chỉ có vị trí, không có hướng mặt biển → bien.js suy từ làn đường gần nhất.
   (6) Hình dáng, kích thước, màu xe và người nằm trong các hàm draw* → xe.js, nguoi.js dựng lại.
   (7) (đợt 1 từng bọc newTrip() để chỉ nhận đơn trong khu cũ; đợt 2 đã dựng cả bản đồ nên bỏ.)
   (8) Khoá lưu localStorage dùng chung với bản chơi chính → luu-rieng.js đổi sang khoá riêng.
   (9) frame() của game gọi step + render ở mỗi nhịp màn hình → giới hạn khung hình làm trong render mới (bỏ qua lần vẽ, bộ não vẫn chạy đủ nhịp).
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, Q = TP3.Q, TT = TP3.TT, tDung0 = performance.now();

/* ---------- 1. khung vẽ ---------- */
const glCanvas = document.createElement('canvas'); glCanvas.id = 'gl3d';
const nhanCanvas = document.createElement('canvas'); nhanCanvas.id = 'nhan3d';
stage.appendChild(glCanvas); stage.appendChild(nhanCanvas);
const nctx = nhanCanvas.getContext('2d');
let renderer;
try { renderer = new T.WebGLRenderer({canvas: glCanvas, antialias: Q.rangCua, alpha: false, powerPreference: 'high-performance', stencil: false}); }
catch (e){ TP3.hong = true; TP3.baoLoi('Máy này không bật được đồ họa 3D (WebGL). Bấm nút đổi góc nhìn để dùng kiểu bản đồ từ trên xuống.'); glCanvas.remove(); nhanCanvas.remove(); return; }
const scene = new T.Scene(), camera = new T.PerspectiveCamera(55, 1.6, 1, Q.xa);
Object.assign(TP3, {renderer, scene, camera, tamXa: Q.xa});
document.body.classList.add('co3d');   // có 3D: ẩn ghi đông SVG của game (thu-3d.css), dùng ghi đông 3D
TP3.taoChatLieu(renderer);
TP3.datCanh('ngay', scene, renderer);
const nenXa = TP3.dungNenXa(); scene.add(nenXa);
for (const f of TP3.khoiDong) f();

/* ---------- 2. các ô bản đồ: dựng dần quanh xe, nhả ô xa ----------
   Cả bản đồ chia thành ô 512 × 512. Chỉ những ô gần xe (trong Q.oBanKinh, tối đa Q.oToiDa ô) được dựng đầy đủ; ô xa hơn bị nhả
   (huỷ hình và ảnh mặt đất) nên bộ nhớ không tăng theo diện tích bản đồ. Ô chưa dựng vẫn có "nhà xa": các khối hộp đơn giản
   (một lưới nhỏ mỗi ô, dựng sẵn lúc mở trang) để nhìn xa trong sương không thấy phố trống.
   Dựng một ô chia thành nhiều bước (mỗi lớp một bước, rồi một bước tạo lưới), mỗi khung hình chỉ làm một bước cho khỏi giật. */
const OO = new Map();
{ const R = TP3.O_RONG, V = TP3.VUNG;
  for (let j = Math.floor(V.y0 / R); j * R < V.y1; j++) for (let i = Math.floor(V.x0 / R); i * R < V.x1; i++){
    const o = {i, j, khoa: i + ',' + j, x0: i*R, y0: j*R, x1: (i + 1)*R, y1: (j + 1)*R, nhom: null, xa: null};
    // ô nằm hẳn ngoài bản đồ và không có đoạn đường kéo dài nào chạy qua thì khỏi dựng (chỉ có cỏ, đã có nền xa)
    if ((o.x1 <= 0 || o.y1 <= 0 || o.x0 >= W || o.y0 >= H) && !MAP.roads.some(r => r.veh && r.pts.some(p => p.x >= o.x0 - 60 && p.x <= o.x1 + 60 && p.y >= o.y0 - 60 && p.y <= o.y1 + 60) &&
        (MAP.nodes[r.a].kind === 'end' || MAP.nodes[r.b].kind === 'end'))) continue;
    OO.set(o.khoa, o);
  } }
TP3.cacO = OO;
const cachO = o => Math.hypot(Math.max(o.x0 - player.x, 0, player.x - o.x1), Math.max(o.y0 - player.y, 0, player.y - o.y1));   // khoảng cách từ xe tới ô (0 nếu xe ở trong ô)
let viec = null, soODa = 0;   // viec: ô đang dựng dở {o, G, buoc}
function taoLuoiO(o, G){
  const nhom = new T.Group(); let tam = 0;
  const them = (l, bong) => { l.matrixAutoUpdate = false; if (bong){ l.castShadow = true; l.receiveShadow = true; } nhom.add(l); if (l.geometry.index) tam += l.geometry.index.count / 3; };
  for (const l of G.them) them(l);
  if (G.duc.so) them(new T.Mesh(G.duc.hinh(), TP3.vl.duc), true);
  if (G.trong.so) them(new T.Mesh(G.trong.hinh(), TP3.vl.trong), true);
  if (G.bong.so){ const l = new T.Mesh(G.bong.hinh(), TP3.vl.bong); l.renderOrder = 1; them(l); }
  if (G.day.length){ const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(G.day), 3)); g.computeBoundingSphere();
    const l = new T.LineSegments(g, TP3.vl.day); l.matrixAutoUpdate = false; nhom.add(l); }
  nhom.matrixAutoUpdate = false; scene.add(nhom); o.nhom = nhom; o.tam = tam; soODa++;
  if (o.xa) o.xa.visible = false;
}
function boO(o){
  if (!o.nhom) return;
  o.nhom.traverse(l => { if (l.geometry) l.geometry.dispose(); if (l.userData.anh){ l.userData.anh.dispose(); l.material.dispose(); } });
  scene.remove(o.nhom); o.nhom = null; soODa--;
  if (o.xa) o.xa.visible = true;
  TP3.khoAnh = TP3.khoAnh.filter(a => a.o !== o.khoa);
}
// các ô nên có lúc này: gần xe nhất trước, trong bán kính, không quá số tối đa
function oCanCo(){
  const ds = []; for (const o of OO.values()){ o.d = cachO(o); if (o.d < Q.oBanKinh) ds.push(o); }
  ds.sort((a, b) => a.d - b.d); return ds.slice(0, Q.oToiDa);
}
// mỗi khung hình: nhả ô xa, rồi làm MỘT bước dựng. hetSuc = true: làm một mạch tới khi xong ô (lúc khởi động). Trả về true nếu vừa làm việc nặng.
// "hình xa" của một ô (khối nhà trơn, cây đơn giản): dựng khi ô lọt vào tầm nhìn, mỗi khung hình một ô, giữ luôn (rất nhẹ)
function dungXaTiep(){
  let tot = null; const tam = TP3.tamXa + 260;
  for (const o of OO.values()) if (!o.xaDa && o.d < tam && (!tot || o.d < tot.d)) tot = o;
  if (!tot) return false;
  tot.xaDa = true; const l = TP3.dungNhaXa ? TP3.dungNhaXa(tot) : null;
  if (l){ l.matrixAutoUpdate = false; l.visible = !tot.nhom; scene.add(l); tot.xa = l; }
  return true;
}
function dungTiep(hetSuc){
  const can = oCanCo(), trongDs = new Set(can);
  for (const o of OO.values()) if (o.nhom && !trongDs.has(o) && (o.d > Q.oBanKinh + 220 || soODa > Q.oToiDa)) boO(o);
  if (viec && !trongDs.has(viec.o)) viec = null;   // ô đang dựng dở đã ra xa: bỏ
  if (!hetSuc && dungXaTiep()) return true;
  if (!viec){ const o = can.find(q => !q.nhom); if (!o){ if (choSanSang.length){ ghiThongTinO(); for (const f of choSanSang.splice(0)) f(); } return false; }
    viec = {o, buoc: 0, ms: 0, G: {duc: new TP3.Gom(), trong: new TP3.Gom(), bong: new TP3.Gom(), day: [], them: []}}; }
  do {
    const t0 = performance.now(), v = viec;
    if (v.buoc < TP3.lop.length) TP3.lop[v.buoc].ham(v.o, v.G); else { taoLuoiO(v.o, v.G); viec = null; }
    const ms = performance.now() - t0; v.buoc++; v.ms += ms;
    if (!hetSuc) TT.msBuocLonNhat = Math.max(TT.msBuocLonNhat || 0, Math.round(ms));
    if (!viec){ v.o.ms = v.ms; TT.msOLonNhat = Math.max(TT.msOLonNhat || 0, Math.round(v.ms)); TT.soLanDungO = (TT.soLanDungO || 0) + 1; }
  } while (hetSuc && viec);
  return true;
}
function ghiThongTinO(){
  let tam = 0; for (const o of OO.values()) if (o.nhom) tam += o.tam;
  Object.assign(TT, {soO: soODa, soOTong: OO.size, tamGiacTinh: Math.round(tam), boNhoAnhMB: TP3.boNhoAnh(), msSanSang: TT.msSanSang || Math.round(performance.now() - tDung0)});
}
const choSanSang = [];

/* ---------- 3. vật động (xe, người, đèn tín hiệu...) ---------- */
for (const d of TP3.dong || []) d.tao(scene);

/* ---------- 4. nối vào game ---------- */
const renderGoc = render, resizeGoc = resize, stepGoc = step;
const la3D = () => S.view !== 'map';
let VW = 800, VH = 600, heSoNet = 1;
function datCoKhung(){
  const pr = Math.min(window.devicePixelRatio || 1, Q.pr) * heSoNet;
  renderer.setPixelRatio(pr); renderer.setSize(VW, VH, false);
  TT.diemAnh = Math.round(VW * pr) + '×' + Math.round(VH * pr);
}
resize = function(){
  resizeGoc();
  VW = window.innerWidth || 800; VH = window.innerHeight || 600;
  const ba = la3D();
  glCanvas.style.display = nhanCanvas.style.display = ba ? 'block' : 'none';
  canvas.style.display = ba ? 'none' : 'block';
  if (!ba) return;
  canvas.width = canvas.height = 1;   // canvas 2D không dùng ở góc 3D: thu về 1 điểm ảnh cho đỡ tốn bộ nhớ
  datCoKhung();
  TP3.chuNoi.pr = Math.min(window.devicePixelRatio || 1, 2);
  nhanCanvas.width = Math.round(VW * TP3.chuNoi.pr); nhanCanvas.height = Math.round(VH * TP3.chuNoi.pr);
  TP3.mayQuay.VW = VW; TP3.mayQuay.VH = VH; TP3.mayQuay.datOngKinh(camera); TP3.mayQuay.theoXe();
};
window.addEventListener('resize', () => resize());

/* ---------- 5. giữ mát máy: tự hạ / nâng độ nét theo sức máy ----------
   Mỗi 2,5 giây xem thời gian trung bình giữa hai lần vẽ. Chậm hơn nhịp mong muốn 22% hai lần liền thì hạ một nấc;
   chạy đủ nhịp 20 giây liền thì thử nâng lại một nấc; nâng lên mà lại chậm thì hạ xuống và chờ lâu gấp đôi mới thử lại. */
const NAC = [{net: 1, xa: 1, bong: true}, {net: 1, xa: 1, bong: false}, {net: 0.85, xa: 0.9, bong: false}, {net: 0.72, xa: 0.8, bong: false}, {net: 0.6, xa: 0.7, bong: false}];
const TC = {nac: 0, t: 0, n: 0, tong: 0, cham: 0, du: 0, khoa: 0, cho: 30000, vuaNang: 0};
if (!Q.bong) TC.nac = 1;
function apDungNac(){
  const n = NAC[TC.nac]; heSoNet = n.net; TP3.tamXa = Q.xa * n.xa;
  const c = TP3.anhSang.canh.suong; scene.fog.near = TP3.tamXa * c.gan; scene.fog.far = TP3.tamXa * c.xa;
  TP3.anhSang.vom.scale.setScalar(n.xa);
  const bong = !!(Q.bong && n.bong);
  if (bong !== TP3.anhSang.coBong){ TP3.datBong(renderer, bong); scene.traverse(l => { if (l.material) l.material.needsUpdate = true; }); }
  if (la3D()){ datCoKhung(); TP3.mayQuay.datOngKinh(camera); }
  TT.nac = TC.nac;
}
function theoDoi(khung, ky){
  if (!TP3.tuChinh || vuaDung || khung > 1500) return;   // khung vừa dựng một bước của ô, hoặc vừa bị khựng (chuyển tab): không tính
  TC.t += khung; TC.n++; TC.tong += khung;
  if (TC.t < 2500) return;
  const tb = TC.tong / TC.n, now = performance.now(); TC.t = TC.n = TC.tong = 0;
  if (tb > ky * 1.22){ TC.du = 0;
    if (++TC.cham >= 2 && TC.nac < NAC.length - 1){ TC.cham = 0; if (TC.vuaNang && now - TC.vuaNang < 12000){ TC.cho = Math.min(TC.cho * 2, 480000); } TC.khoa = now + TC.cho; TC.vuaNang = 0; TC.nac++; apDungNac(); } }
  else { TC.cham = 0;
    if (tb < ky * 1.08 && ++TC.du >= 8 && TC.nac > (Q.bong ? 0 : 1) && now > TC.khoa){ TC.du = 0; TC.nac--; TC.vuaNang = now; apDungNac(); } }
}

/* ---------- 6. mất ngữ cảnh WebGL (iPhone chuyển ứng dụng rồi quay lại): dựng lại các ô, không để trắng màn ---------- */
let matNguCanh = false;
glCanvas.addEventListener('webglcontextlost', e => { e.preventDefault(); matNguCanh = true; TT.matNguCanh = (TT.matNguCanh || 0) + 1; });
glCanvas.addEventListener('webglcontextrestored', () => {
  // three.js tự nạp lại hình và ảnh còn giữ trên bộ nhớ thường; ảnh mặt đất của các ô đã bỏ bản gốc nên phải dựng lại ô
  for (const o of OO.values()) boO(o);
  viec = null; matNguCanh = false; dungTiep(true); resize();
});

/* ---------- 7. vẽ mỗi khung hình và số đo ---------- */
const DO = {t: 0, n: 0, tong: 0, ve: 0, nao: 0, ghi: null, msNaoKhung: 0, boQua: 0};
const oDo = document.createElement('div'); oDo.id = 'do3d'; const kieuDo = TP3.giaoDien.kieuDo; if (kieuDo !== 'tat') document.body.appendChild(oDo); if (kieuDo === 'gon') oDo.className = 'gon';
step = function(dt){ const t0 = performance.now(); stepGoc(dt); DO.msNaoKhung = performance.now() - t0; };
let vuaDung = false;
function ve3D(dt){
  vuaDung = dungTiep();
  for (const d of TP3.dong || []) d.capNhat(dt);
  TP3.mayQuay.capNhat(camera, dt);
  TP3.capNhatAnhSang(camera, player.x, player.y);
  // ống "cắt tầm" giữa máy quay và xe (xem chat-lieu.js): chỉ bật ở góc dẫn đường
  camera.updateMatrixWorld(); const C = TP3.catTam;
  C.uXe.value.set(player.x, 6, player.y).applyMatrix4(camera.matrixWorldInverse); C.uLen.value.set(0, 1, 0).transformDirection(camera.matrixWorldInverse);
  C.uCat.value.set(camera.position.y, S.view === 'nav' ? 9 : 0);
  renderer.render(scene, camera);
  TP3.chuNoi.ve(nctx, camera, VW, VH);
}
let daVe = false, lanGoi = 0, lanVe = 0, tich = 0;
render = function(dt){
  const t0 = performance.now(), ba = la3D(), ky = 1000 / TP3.fpsToiDa;
  TP3.giaoDien.capNhat(ba);
  if (ba){
    if (document.hidden || matNguCanh) return;        // tab ẩn hoặc đang mất ngữ cảnh: không vẽ
    // giới hạn khung hình: cộng dồn thời gian, đủ một nhịp mới vẽ (bộ não của game vẫn chạy ở mọi nhịp màn hình)
    tich = Math.min(tich + (lanGoi ? t0 - lanGoi : ky), ky * 3); lanGoi = t0;
    if (tich < ky - 1.5){ DO.boQua++; return; }
    tich = Math.min(tich - ky, ky);
    const dtVe = lanVe ? Math.min(0.1, (t0 - lanVe) / 1000) : 0.016;
    ve3D(dtVe); drawMini(); updHUD();
  } else renderGoc(dt || 0.016);
  const t1 = performance.now(), khung = lanVe ? t0 - lanVe : 0; lanVe = t0;
  const lenh = ba ? renderer.info.render.calls : 0, tam = ba ? renderer.info.render.triangles : 0;
  DO.n++; DO.tong += khung; DO.ve += t1 - t0; DO.nao += DO.msNaoKhung; DO.t += khung;
  if (DO.ghi) DO.ghi(khung, t1 - t0, DO.msNaoKhung, lenh, tam);
  if (ba) theoDoi(khung, ky);
  if (DO.t >= 500){
    const fps = 1000 * DO.n / DO.tong, ms = DO.tong / DO.n;
    if (kieuDo === 'gon') oDo.textContent = fps.toFixed(0) + ' k/g' + (ba && TC.nac > (Q.bong ? 0 : 1) ? ' ↓' + (TC.nac - (Q.bong ? 0 : 1)) : '');
    else if (kieuDo === 'du') oDo.textContent = (ba ? '3D ' + S.view : '2D map') + ' · ' + TP3.mucTen + (ba && TC.nac > (Q.bong ? 0 : 1) ? ' (hạ ' + (TC.nac - (Q.bong ? 0 : 1)) + ' nấc)' : '') + '\n' + fps.toFixed(0) + ' khung/giây · ' + ms.toFixed(1) + ' ms\n' +
      'vẽ ' + (DO.ve / DO.n).toFixed(1) + ' · não ' + (DO.nao / DO.n).toFixed(1) + ' ms\n' + (ba ? lenh + ' lệnh vẽ · ' + (tam / 1000).toFixed(0) + ' nghìn tam giác\n' + (TT.diemAnh || '') + ' · ' + soODa + ' ô' + (viec ? ' (đang dựng)' : '') : '');
    DO.t = DO.n = DO.tong = DO.ve = DO.nao = 0;
  }
  daVe = true;
};

/* ---------- 8. khởi động và cửa kiểm tra tự động (window.__T3D) ---------- */
dungTiep(true);   // ô có xe người chơi dựng ngay một mạch; các ô còn lại dựng dần, mỗi khung hình một bước
TT.msDung = Math.round(performance.now() - tDung0);
apDungNac(); resize();

window.__T3D = {
  THREE: T, TP3, renderer, scene, camera, thongTin: TT, VUNG: TP3.VUNG, renderGoc, resizeGoc,
  daVe: () => daVe,
  // chờ tới khi mọi ô đã dựng xong
  sanSang(){ return new Promise(xong => choSanSang.push(() => xong(TT))); },
  soO: () => soODa,
  // đặt xe ở toạ độ bản đồ (x, y), hướng a (rad; 0 = sang phải, π/2 = đi xuống), vận tốc v
  datXe(x, y, a, v){ player.x = x; player.y = y; player.a = a || 0; player.v = v || 0; TP3.mayQuay.theoXe(); S.route = computeRoute(); },
  gocNhin(v){ if (VIEWS.includes(v)){ S.view = v; hudCache.ck = null; resize(); } return S.view; },
  doiXe(v){ setVehicle(v); resize(); return S.veh; },
  // giữ các phím trong `phim` (ví dụ {up: true}) suốt `giay` giây rồi nhả
  lai(phim, giay){ return new Promise(xong => { Object.assign(keys, phim); setTimeout(() => { for (const k in phim) keys[k] = false; xong(); }, giay * 1000); }); },
  nac: () => TC.nac, datNac(n){ TC.nac = clamp(n, 0, NAC.length - 1); apDungNac(); return TC.nac; },
  // thử mất rồi có lại ngữ cảnh WebGL
  thuMatNguCanh(ms){ return new Promise(xong => { renderer.forceContextLoss(); setTimeout(() => { renderer.forceContextRestore(); setTimeout(() => window.__T3D.sanSang().then(() => xong({mat: TT.matNguCanh, dangMat: matNguCanh})), 300); }, ms || 500); }); },
  // đo trung bình n lần vẽ: khung/giây, ms mỗi khung, ms vẽ (CPU), ms bộ não, số lệnh vẽ, số tam giác
  do(n){ n = n || 60; return new Promise(xong => {
    let k = -2, tong = 0, ve = 0, nao = 0, lenh = 0, tam = 0, lonNhat = 0;   // bỏ hai khung đầu
    DO.ghi = (khung, msVe, msNao, l, t) => {
      if (++k <= 0) return;
      tong += khung; ve += msVe; nao += msNao; lenh += l; tam += t; lonNhat = Math.max(lonNhat, khung);
      if (k >= n){ DO.ghi = null; const r = v => Math.round(v * 100) / 100;
        xong({gocNhin: S.view, xe: S.veh, muc: TP3.mucTen, nac: TC.nac, khung: n, fps: r(1000 * n / tong), msKhung: r(tong / n), msKhungLonNhat: r(lonNhat), msVe: r(ve / n), msNao: r(nao / n),
          lenhVe: Math.round(lenh / n), tamGiac: Math.round(tam / n), diemAnh: la3D() ? TT.diemAnh : canvas.width + '×' + canvas.height, manHinh: VW + '×' + VH, boNhoAnhMB: TP3.boNhoAnh(), soO: soODa}); }
    }; }); }
};
})();
