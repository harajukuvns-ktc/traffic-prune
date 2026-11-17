/* =========================================================
   Traffic Prune · thu-3d/3d/ghi-dong.js: GHI ĐÔNG XE MÁY 3D (góc nhìn sau tay lái)
   Thay lớp SVG #cockpit của game: tay lái, tay nắm, tay phanh, hai gương, mặt nạ đầu xe, đồng hồ tốc độ, đèn báo xi-nhan.
   Cả cụm xoay quanh cổ lái theo S.wheel của game (bộ não tính sẵn: bấm rẽ thì đánh hết cỡ, trợ lái thì theo tốc độ quay thật).
   Đồng hồ là một ảnh canvas nhỏ dán lên mặt đồng hồ, chỉ vẽ lại khi số km/h, số xe hoặc mức quá tốc độ đổi.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, Gom = TP3.Gom, K = TP3.xe.TI_LE_XM, CO_LAI = 0.5;   // cổ lái cách tâm xe 0,5 m về phía trước
const GD = TP3.ghiDong = {khoa: ''};
function veDongHo(g, kmh, so, qua, gioiHan){
  const N = 128, c = N / 2;
  g.clearRect(0, 0, N, N);
  g.fillStyle = '#fffaf2'; g.beginPath(); g.arc(c, c, 62, 0, Math.PI*2); g.fill();
  g.fillStyle = '#1d1c23'; g.beginPath(); g.arc(c, c, 57, 0, Math.PI*2); g.fill();
  const goc = v => (-218 + Math.min(v, 80) / 80 * 256) * Math.PI / 180;   // 0 km/h ở dưới trái, 80 km/h ở dưới phải
  g.lineCap = 'round'; g.lineWidth = 5; g.strokeStyle = '#6b6875'; g.beginPath(); g.arc(c, c, 49, goc(0), goc(80)); g.stroke();
  g.strokeStyle = '#3ddc84'; g.beginPath(); g.arc(c, c, 49, goc(0), goc(gioiHan)); g.stroke();          // tới giới hạn tốc độ: xanh
  g.strokeStyle = '#e5484d'; g.beginPath(); g.arc(c, c, 49, goc(gioiHan), goc(80)); g.stroke();         // quá giới hạn: đỏ
  const a = goc(kmh); g.strokeStyle = '#ffb020'; g.lineWidth = 5; g.beginPath(); g.moveTo(c + Math.cos(a)*14, c + Math.sin(a)*14); g.lineTo(c + Math.cos(a)*44, c + Math.sin(a)*44); g.stroke();
  g.fillStyle = qua === 2 ? '#ff6b6b' : qua === 1 ? '#ffd666' : '#fffaf2'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 44px ' + TP3.FONT; g.fillText(String(kmh), c, c + 8);
  g.fillStyle = '#bdbbc7'; g.font = '600 13px ' + TP3.FONT; g.fillText('km/h' + (so ? ' · số ' + so : ''), c, c + 37);
}
(TP3.dong = TP3.dong || []).push({
  tao(scene){
    const G = new Gom(), cam = '#f07f2e', den = '#1c1c20'; G.dat(-CO_LAI * K, 0, 0, 0, K);
    G.hop(0.56, 0.86, 0, 0.16, 0.2, 0.34, 0, cam, {tren: '#f4913f'});                       // mặt nạ đầu xe (đèn pha ở mặt trước)
    G.dun([[0.3, 0.96], [0.62, 0.99], [0.62, 1.06], [0.44, 1.1], [0.3, 1.06]], -0.17, 0.17, cam);   // ốp cổ lái ôm đồng hồ
    G.thanh([0.47, 1.06, -0.38], [0.47, 1.06, 0.38], 0.04, 0.04, '#3a3d44');                // tay lái
    for (const z of [1, -1]){
      G.thanh([0.46, 1.06, z*0.25], [0.46, 1.06, z*0.4], 0.058, 0.058, den);                // tay nắm
      G.thanh([0.5, 1.07, z*0.2], [0.53, 1.07, z*0.37], 0.016, 0.022, '#c9ced3');           // tay phanh
      G.thanh([0.47, 1.07, z*0.22], [0.46, 1.2, z*0.37], 0.014, 0.014, den);                // cần gương
      G.hop(0.46, 1.185, z*0.41, 0.02, 0.06, 0.115, 0, den, {sau: '#b7d2ea'});              // gương nhỏ, thấp (không che làn hai bên); mặt quay về người lái phản chiếu trời
      G.hop(0.4, 1.085, z*0.115, 0.05, 0.012, 0.055, 0, '#3a2a12');                         // ô đèn báo xi-nhan khi tắt
    }
    const than = new T.Mesh(G.hinh(), TP3.vl.duc);
    // mặt đồng hồ: tấm tròn nghiêng về phía người lái, dán ảnh canvas
    const cv = TP3.taoCanvas(128, 128), anh = new T.CanvasTexture(cv); anh.colorSpace = T.SRGBColorSpace; anh.anisotropy = 4;
    if (TP3.khoAnh) TP3.khoAnh.push({w: 128, h: 128});
    const Gd = new Gom(); Gd.dat(-CO_LAI * K, 0, 0, 0, K);
    { const C = [0.405, 1.108, 0], U = [0.09, 0.062, 0], r = 0.108, P = (i, j) => [C[0] + U[0]*j, C[1] + U[1]*j, C[2] + r*i];
      Gd.tu(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), [-0.57, 0.82, 0], '#ffffff', {uv: [[0, 0], [1, 0], [1, 1], [0, 1]]}); }
    const dongHo = new T.Mesh(Gd.hinh(), new T.MeshBasicMaterial({map: anh, alphaTest: 0.5, toneMapped: false}));
    const nhay = [-1, 1].map(z => { const g = new Gom(); g.dat(-CO_LAI * K, 0, 0, 0, K); g.hop(0.4, 1.087, z*0.115, 0.052, 0.012, 0.057, 0, '#ffb000');
      g.hop(0.63, 0.9, z*0.2, 0.04, 0.05, 0.07, 0, '#ffb000'); return new T.Mesh(g.hinh(), TP3.vl.sang); });
    const truc = new T.Group(); truc.position.x = CO_LAI * K; truc.add(than); truc.add(dongHo); truc.add(nhay[0]); truc.add(nhay[1]);
    const nhom = new T.Group(); nhom.add(truc); nhom.visible = false; scene.add(nhom);
    Object.assign(GD, {nhom, truc, nhay, cv, g: cv.getContext('2d'), anh, khoa: ''});
  },
  capNhat(){
    const hien = S.view === 'bike' && S.veh !== 'car'; GD.nhom.visible = hien; if (!hien) return;
    GD.nhom.position.set(player.x, 0, player.y); GD.nhom.rotation.y = -player.a;
    GD.truc.rotation.y = -clamp((S.wheel || 0) / 90, -1, 1) * 0.42;   // tay lái đánh tối đa khoảng 24°
    GD.nhay[0].visible = S.turn < 0 && S.blinkOn; GD.nhay[1].visible = S.turn > 0 && S.blinkOn;
    const kmhF = Math.abs(player.v) / 3, kmh = Math.round(kmhF), over = kmhF - S.spdLimit, qua = over >= 5 ? 2 : over > 0 ? 1 : 0, so = S.sound.bike === 'ga' ? '' : (S.gear || 1);
    const khoa = kmh + '|' + so + '|' + qua + '|' + S.spdLimit;
    if (khoa !== GD.khoa){ GD.khoa = khoa; veDongHo(GD.g, kmh, so, qua, S.spdLimit); GD.anh.needsUpdate = true; }
  }
});
})();
