/* =========================================================
   Traffic Prune · thu-3d/3d/may-quay.js: HAI GÓC NHÌN 3D
   'nav'  (dẫn đường): sau và trên xe, nhìn theo hướng xe, quay theo xe mượt như bản 2D
   'bike' (sau tay lái / sau vô lăng): máy quay ở vị trí mắt người lái; ô tô thấy nắp capo, xe máy thấy ghi đông
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T;
const MQ = TP3.mayQuay = {goc: 0, nghieng: 0, gocTruoc: 0, toc: 0, VW: 800, VH: 600};
// vị trí mắt người lái trong hệ trục của xe: cao = độ cao, truoc = cách tâm xe về phía trước, nhin = độ chúc xuống của hướng nhìn
MQ.MAT = {bike: {cao: 9.8, truoc: -1.7, nhin: 17}, car: {cao: 6.75, truoc: 0.9, nhin: 8}};
MQ.datOngKinh = function(camera){
  const bike = S.view === 'bike', car = S.veh === 'car', VW = MQ.VW, VH = MQ.VH;
  // chừa phần dưới màn hình cho hàng nút cảm ứng (và bảng đồng hồ ở góc sau tay lái), phần trên cho bảng chỉ đường trên điện thoại:
  // tâm hình dồn vào khoảng giữa còn lại, hình không bị méo
  // (trên điện thoại cụm chữ gọn cao khoảng 150–190 điểm: xem giao-dien-gon.css)
  const tren = MQ.tren = isTouch ? Math.min(170, VH * 0.2) : 0, duoi = isTouch ? Math.min(190, VH * 0.25) : (bike ? 150 : 0);
  const caoThat = Math.max(120, VH - tren - duoi), tiLe = VW / caoThat, ngang = (bike ? 70 : 60) * Math.PI / 180;
  camera.fov = clamp(2 * Math.atan(Math.tan(ngang / 2) / tiLe) * 180 / Math.PI, bike ? 56 : 48, 94);
  camera.aspect = tiLe; camera.near = bike ? 0.4 : 4; camera.far = TP3.tamXa || TP3.Q.xa;
  if (tren || duoi) camera.setViewOffset(VW, caoThat, 0, -tren, VW, VH); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
};
MQ.theoXe = function(){ MQ.goc = player.a; MQ.gocTruoc = player.a; };
MQ.capNhat = function(camera, dt){
  const bike = S.view === 'bike', car = S.veh === 'car';
  const om = dt > 0 ? normA(player.a - MQ.gocTruoc) / dt : 0; MQ.gocTruoc = player.a;   // tốc độ quay đầu xe
  MQ.toc += (om - MQ.toc) * Math.min(1, dt * 8);
  if (bike){
    MQ.goc = player.a;
    const m = car ? MQ.MAT.car : MQ.MAT.bike, c = Math.cos(MQ.goc), s = Math.sin(MQ.goc);
    // xe máy ôm cua thì người và xe nghiêng vào trong: máy quay nghiêng theo
    const muon = car ? 0 : clamp(-om * 0.085, -0.16, 0.16) * Math.min(1, Math.abs(player.v) / 50);
    MQ.nghieng += (muon - MQ.nghieng) * Math.min(1, dt * 6);
    camera.position.set(player.x + c*m.truoc, m.cao, player.y + s*m.truoc); camera.up.set(0, 1, 0);
    camera.lookAt(player.x + c*100, m.cao - m.nhin, player.y + s*100);
    if (MQ.nghieng) camera.rotateZ(MQ.nghieng);
  } else {
    MQ.goc = normA(MQ.goc + normA(player.a - MQ.goc) * Math.min(1, dt * 4.5));
    const c = Math.cos(MQ.goc), s = Math.sin(MQ.goc), doc = MQ.VW < MQ.VH;   // màn hình dọc: lùi xa và cao hơn một chút
    const lui = doc ? 74 : 66, cao = doc ? 50 : 42, truoc = doc ? 44 : 40;
    camera.position.set(player.x - c*lui, cao, player.y - s*lui); camera.up.set(0, 1, 0);
    camera.lookAt(player.x + c*truoc, 3, player.y + s*truoc);
  }
};
})();
