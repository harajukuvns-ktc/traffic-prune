/* =========================================================
   Traffic Prune · thu-3d/3d/anh-sang.js: ÁNH SÁNG, BẦU TRỜI, SƯƠNG, BÓNG ĐỔ
   Mọi thông số nằm trong bảng TP3.CANH. Đợt này chỉ có CANH.ngay; giai đoạn sau muốn thêm đêm, mưa thì thêm một bảng
   cùng dạng (CANH.dem, CANH.mua) rồi gọi TP3.datCanh('dem'), không phải sửa các file dựng hình.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T;
TP3.CANH = {
  ngay: {
    phoiSang: 1.02,                                                            // độ phơi sáng chung (chỉnh màu kiểu ACES)
    nang: {huong: [0.46, 0.8, 0.38], mau: '#fff0d2', manh: 2.9},               // hướng TỚI mặt trời (x, cao, y bản đồ), màu và độ mạnh của nắng
    troi: {tren: '#cfe4ff', duoi: '#9a8f7c', manh: 1.55},                      // ánh trời từ trên xuống và ánh hắt từ mặt đất lên
    bauTroi: {dinh: '#4d8fdc', giua: '#9cc8f0', chanTroi: '#dfe9ee', may: 0.6, mauMay: '#ffffff', mauBungMay: '#c9d6e2'},
    suong: {mau: '#dfe9ee', gan: 0.45, xa: 0.97},                              // sương xa: bắt đầu và kín hẳn (phần của tầm nhìn)
    bong: {dam: 0.55, rong: 230, mem: 2.2}                                     // bóng đổ thật (mức cao): độ đậm, nửa bề rộng vùng có bóng quanh xe, độ mềm mép
  }
};
const AS = TP3.anhSang = {ten: 'ngay'};

function veBauTroi(c){
  const W = 1024, H = 256, cv = TP3.taoCanvas(W, H), g = cv.getContext('2d'), r = TP3.rng(2026);
  const gr = g.createLinearGradient(0, 0, 0, H);   // hàng trên cùng là đỉnh trời, hàng dưới cùng là chân trời
  gr.addColorStop(0, c.dinh); gr.addColorStop(0.55, c.giua); gr.addColorStop(0.93, c.chanTroi); gr.addColorStop(1, c.chanTroi);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // mây: từng cụm gồm nhiều đốm tròn mờ; càng gần chân trời cụm càng dẹt và nhỏ
  const dom = (x, y, rx, ry, mau, a) => { for (const dx of [-W, 0, W]){ g.save(); g.translate(x + dx, y); g.scale(1, ry / rx);
    const q = g.createRadialGradient(0, 0, 0, 0, 0, rx); q.addColorStop(0, mau.replace('A', a)); q.addColorStop(0.6, mau.replace('A', a * 0.6)); q.addColorStop(1, mau.replace('A', 0)); g.fillStyle = q; g.fillRect(-rx, -rx, 2*rx, 2*rx); g.restore(); } };
  const rgb = h => { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',A)'; };
  const trang = rgb(c.mauMay), bung = rgb(c.mauBungMay), so = Math.round(26 * c.may);
  for (let i = 0; i < so; i++){
    const y = 70 + r() * 150, k = 1.25 - (y - 70) / 150 * 0.75, x = r() * W, n = 4 + Math.floor(r() * 5), rong = (50 + r() * 60) * k;
    for (let j = 0; j < n; j++) dom(x + (r() - 0.5) * rong * 2, y + 5 * k, (16 + r() * 22) * k, (5 + r() * 4) * k, bung, 0.5);
    for (let j = 0; j < n; j++) dom(x + (r() - 0.5) * rong * 2, y - 2 * k + (r() - 0.5) * 5, (16 + r() * 24) * k, (6 + r() * 6) * k, trang, 0.85);
  }
  const mo = g.createLinearGradient(0, H - 34, 0, H); mo.addColorStop(0, rgb(c.chanTroi).replace('A', 0)); mo.addColorStop(1, rgb(c.chanTroi).replace('A', 1)); g.fillStyle = mo; g.fillRect(0, H - 34, W, 34);
  return cv;
}

// Dựng (hoặc dựng lại) đèn, bầu trời, sương theo bảng cảnh `ten`
TP3.datCanh = function(ten, scene, renderer){
  const c = TP3.CANH[ten] || TP3.CANH.ngay, Q = TP3.Q; AS.ten = ten; AS.canh = c;
  for (const k of ['nang', 'anhTroi', 'vom']) if (AS[k]){ scene.remove(AS[k]); if (AS[k].geometry) AS[k].geometry.dispose(); }
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = c.phoiSang; renderer.outputColorSpace = T.SRGBColorSpace;
  scene.background = new T.Color(c.suong.mau);
  scene.fog = new T.Fog(new T.Color(c.suong.mau), Q.xa * c.suong.gan, Q.xa * c.suong.xa);
  AS.anhTroi = new T.HemisphereLight(new T.Color(c.troi.tren), new T.Color(c.troi.duoi), c.troi.manh); scene.add(AS.anhTroi);
  const h = c.nang.huong, l = Math.hypot(h[0], h[1], h[2]); AS.huongNang = [h[0] / l, h[1] / l, h[2] / l];
  AS.nang = new T.DirectionalLight(new T.Color(c.nang.mau), c.nang.manh);
  AS.nang.position.set(AS.huongNang[0] * 400, AS.huongNang[1] * 400, AS.huongNang[2] * 400); scene.add(AS.nang); scene.add(AS.nang.target);
  // vòm trời: nửa cầu dán ảnh trời có mây, luôn đi theo máy quay, không bị sương che
  const cv = veBauTroi(c.bauTroi), anh = TP3.anhTuCanvas(cv, {}); anh.wrapS = T.RepeatWrapping;
  if (TP3.khoAnh) TP3.khoAnh.push({w: cv.width, h: cv.height});
  AS.vom = new T.Mesh(new T.SphereGeometry(Q.xa * 0.92, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({map: anh, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false}));
  AS.vom.frustumCulled = false; AS.vom.renderOrder = -1; scene.add(AS.vom);
  TP3.datBong(renderer, TP3.Q.bong);
};
// Bóng đổ thật: một nguồn nắng, vùng có bóng là một ô vuông bám theo xe người chơi (chỉ bật ở mức cao)
TP3.datBong = function(renderer, bat){
  const c = AS.canh.bong, L = AS.nang; AS.coBong = !!bat;
  renderer.shadowMap.enabled = !!bat; renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.needsUpdate = true;
  L.castShadow = !!bat;
  if (!bat) return;
  const N = TP3.Q.bongAnh || 2048, s = L.shadow;
  s.mapSize.set(N, N); s.camera.left = s.camera.bottom = -c.rong; s.camera.right = s.camera.top = c.rong; s.camera.near = 50; s.camera.far = 900;
  s.bias = -0.0008; s.normalBias = 0.6; s.radius = c.mem; s.intensity = c.dam; s.camera.updateProjectionMatrix();
  AS.oBong = 2 * c.rong / N;   // bề rộng một điểm ảnh bóng trên mặt đất
};
// mỗi khung hình: vòm trời theo máy quay; vùng bóng theo xe (dời theo từng nấc bằng một điểm ảnh bóng để mép bóng không rung)
TP3.capNhatAnhSang = function(camera, px, pz){
  AS.vom.position.set(camera.position.x, -3, camera.position.z);
  if (!AS.coBong) return;
  const k = AS.oBong * 4, x = Math.round(px / k) * k, z = Math.round(pz / k) * k, h = AS.huongNang;
  AS.nang.target.position.set(x, 0, z); AS.nang.position.set(x + h[0] * 420, h[1] * 420, z + h[2] * 420);
  AS.nang.target.updateMatrixWorld();
};
})();
