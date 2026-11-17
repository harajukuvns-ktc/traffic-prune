/* =========================================================
   Traffic Prune · thu-3d/3d/chinh.js: DỰNG CẢNH THEO Ô, VẼ MỖI KHUNG HÌNH, GIỮ MÁT MÁY, NỐI VÀO GAME
   Nạp SAU CÙNG. "Bộ não" của game (luật, bắt lỗi, xe NPC, chỉ đường, trợ lái, giao hàng, âm thanh, bảng thông tin) giữ nguyên;
   file này chỉ gán lại vài hàm toàn cục của game.js:
     render()  → góc 'nav' và 'bike' vẽ bằng 3D; góc 'map' gọi lại hàm vẽ 2D gốc
     resize()  → gọi hàm gốc rồi chỉnh thêm khung vẽ 3D
     newTrip() → chỉ nhận đơn ở các điểm giao trong khu phố cũ
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
   (7) newTrip() chọn thẳng trong DESTS → bọc lại, tạm thu DESTS về các điểm trong khu cũ trong lúc gọi hàm gốc.
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
TP3.taoChatLieu(renderer);
TP3.datCanh('ngay', scene, renderer);
const nenXa = TP3.dungNenXa(); scene.add(nenXa);
for (const f of TP3.khoiDong) f();

/* ---------- 2. các ô bản đồ: dựng dần, ô gần xe trước ---------- */
const OO = new Map(); let hang = [];
{ const R = TP3.O_RONG, V = TP3.VUNG;
  for (let j = Math.floor(V.y0 / R); j * R < V.y1; j++) for (let i = Math.floor(V.x0 / R); i * R < V.x1; i++){
    const o = {i, j, khoa: i + ',' + j, x0: i*R, y0: j*R, x1: (i + 1)*R, y1: (j + 1)*R, nhom: null};
    // ô nằm hẳn ngoài bản đồ và không có đường nào chạy qua thì khỏi dựng (chỉ có cỏ, đã có nền xa)
    if ((o.x1 <= 0 || o.y1 <= 0 || o.x0 >= W || o.y0 >= H) && !MAP.roads.some(r => r.veh && r.pts.some(p => p.x >= o.x0 - 60 && p.x <= o.x1 + 60 && p.y >= o.y0 - 60 && p.y <= o.y1 + 60) &&
        (MAP.nodes[r.a].kind === 'end' || MAP.nodes[r.b].kind === 'end'))) continue;
    OO.set(o.khoa, o); hang.push(o);
  } }
TP3.cacO = OO;
function dungO(o){
  const t0 = performance.now(), G = {duc: new TP3.Gom(), trong: new TP3.Gom(), bong: new TP3.Gom(), day: [], them: []};
  for (const l of TP3.lop) l.ham(o, G);
  const nhom = new T.Group(); let tam = 0;
  const them = (l, bong) => { l.matrixAutoUpdate = false; if (bong){ l.castShadow = true; l.receiveShadow = true; } nhom.add(l); if (l.geometry.index) tam += l.geometry.index.count / 3; };
  for (const l of G.them) them(l);
  if (G.duc.so) them(new T.Mesh(G.duc.hinh(), TP3.vl.duc), true);
  if (G.trong.so) them(new T.Mesh(G.trong.hinh(), TP3.vl.trong), true);
  if (G.bong.so){ const l = new T.Mesh(G.bong.hinh(), TP3.vl.bong); l.renderOrder = 1; them(l); }
  if (G.day.length){ const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(G.day), 3)); g.computeBoundingSphere();
    const l = new T.LineSegments(g, TP3.vl.day); l.matrixAutoUpdate = false; nhom.add(l); }
  nhom.matrixAutoUpdate = false; scene.add(nhom); o.nhom = nhom; o.tam = tam; o.ms = performance.now() - t0;
}
function boO(o){
  if (!o.nhom) return;
  o.nhom.traverse(l => { if (l.geometry) l.geometry.dispose(); if (l.userData.anh){ l.userData.anh.dispose(); l.material.dispose(); } });
  scene.remove(o.nhom); o.nhom = null;
  TP3.khoAnh = TP3.khoAnh.filter(a => a.o !== o.khoa);
}
function dungTiep(){   // dựng một ô đang chờ, chọn ô gần xe người chơi nhất
  if (!hang.length) return false;
  let tot = 0, dTot = 1e18;
  hang.forEach((o, i) => { const d = Math.hypot((o.x0 + o.x1) / 2 - player.x, (o.y0 + o.y1) / 2 - player.y); if (d < dTot){ dTot = d; tot = i; } });
  dungO(hang.splice(tot, 1)[0]);
  if (!hang.length){ let tam = 0, ms = 0, n = 0; for (const o of OO.values()) if (o.nhom){ tam += o.tam; ms += o.ms; n++; }
    Object.assign(TT, {soO: n, tamGiacTinh: Math.round(tam), msDungO: Math.round(ms), boNhoAnhMB: TP3.boNhoAnh(), msSanSang: Math.round(performance.now() - tDung0)});
    for (const f of choSanSang.splice(0)) f(); }
  return true;
}
const choSanSang = [];

/* ---------- 3. vật động (xe, người, đèn tín hiệu...) ---------- */
for (const d of TP3.dong || []) d.tao(scene);

/* ---------- 4. nối vào game ---------- */
const renderGoc = render, resizeGoc = resize, newTripGoc = newTrip, stepGoc = step;
const DIEM_KHU = DESTS.filter(d => TP3.trongKhu(d.bay.cx, d.bay.cy));
newTrip = function(){
  const tatCa = DESTS.slice();
  DESTS.length = 0; DESTS.push(...DIEM_KHU);
  try { newTripGoc(); } finally { DESTS.length = 0; DESTS.push(...tatCa); }
};
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
  if (!TP3.tuChinh || hang.length || khung > 400) return;
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
  for (const o of OO.values()){ if (o.nhom){ boO(o); } if (!hang.includes(o)) hang.push(o); }
  matNguCanh = false; dungTiep(); resize();
});

/* ---------- 7. vẽ mỗi khung hình và số đo ---------- */
const DO = {t: 0, n: 0, tong: 0, ve: 0, nao: 0, ghi: null, msNaoKhung: 0, boQua: 0};
const oDo = document.createElement('div'); oDo.id = 'do3d'; if (TP3.hienDo) document.body.appendChild(oDo);
step = function(dt){ const t0 = performance.now(); stepGoc(dt); DO.msNaoKhung = performance.now() - t0; };
function ve3D(dt){
  dungTiep();
  for (const d of TP3.dong || []) d.capNhat(dt);
  TP3.mayQuay.capNhat(camera, dt);
  TP3.capNhatAnhSang(camera, player.x, player.y);
  renderer.render(scene, camera);
  TP3.chuNoi.ve(nctx, camera, VW, VH);
}
let daVe = false, lanGoi = 0, lanVe = 0, tich = 0;
render = function(dt){
  const t0 = performance.now(), ba = la3D(), ky = 1000 / TP3.fpsToiDa;
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
    if (TP3.hienDo) oDo.textContent = (ba ? '3D ' + S.view : '2D map') + ' · ' + TP3.mucTen + (ba && TC.nac > (Q.bong ? 0 : 1) ? ' (hạ ' + (TC.nac - (Q.bong ? 0 : 1)) + ' nấc)' : '') + '\n' + fps.toFixed(0) + ' khung/giây · ' + ms.toFixed(1) + ' ms\n' +
      'vẽ ' + (DO.ve / DO.n).toFixed(1) + ' · não ' + (DO.nao / DO.n).toFixed(1) + ' ms\n' + (ba ? lenh + ' lệnh vẽ · ' + (tam / 1000).toFixed(0) + ' nghìn tam giác\n' + (TT.diemAnh || '') + (hang.length ? ' · còn ' + hang.length + ' ô' : '') : '');
    DO.t = DO.n = DO.tong = DO.ve = DO.nao = 0;
  }
  daVe = true;
};

/* ---------- 8. khởi động và cửa kiểm tra tự động (window.__T3D) ---------- */
dungTiep();   // ô có xe người chơi dựng ngay; các ô còn lại dựng dần, mỗi khung hình một ô
TT.msDung = Math.round(performance.now() - tDung0);
if (!S.trip || !DIEM_KHU.includes(S.trip.dest)) newTrip();   // game.js đã nhận một đơn lúc khởi động (có thể ở ngoài khu cũ)
apDungNac(); resize();

window.__T3D = {
  THREE: T, TP3, renderer, scene, camera, thongTin: TT, KHU: TP3.KHU, VUNG: TP3.VUNG, diemKhu: DIEM_KHU, renderGoc, resizeGoc,
  daVe: () => daVe,
  // chờ tới khi mọi ô đã dựng xong
  sanSang(){ return new Promise(xong => { if (!hang.length) xong(TT); else choSanSang.push(() => xong(TT)); }); },
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
          lenhVe: Math.round(lenh / n), tamGiac: Math.round(tam / n), diemAnh: la3D() ? TT.diemAnh : canvas.width + '×' + canvas.height, manHinh: VW + '×' + VH, boNhoAnhMB: TP3.boNhoAnh()}); }
    }; }); }
};
})();
