/* =========================================================
   Traffic Prune · thu-3d/3d/danh-muc.js: DANH MỤC VẬT TRÊN BẢN ĐỒ
   Mỗi loại vật của game (biển báo theo mã, cột đèn, chốt CSGT, vạch, ô đỗ, điểm giao, nhà...) khai báo MỘT mục:
     ma    mã ngắn (mã biển theo quy chuẩn nếu có)          ten   tên dễ hiểu
     phu   các bảng dữ liệu của game mà mục này lo (để bài kiểm biết bảng nào chưa ai lo)
     nguon hàm trả về danh sách vật lấy từ dữ liệu game; mỗi vật có x, y (toạ độ bản đồ) và các thông tin riêng
     kieu  'hinh'    dựng thành hình 3D bằng hàm TP3.hinhVat[hinh](G, v, m), từng ô bản đồ (bien.js)
           'mat-dat' đã nằm trong ảnh mặt đất (veNen của game vẽ; duong.js)
           'chu-noi' hiện bằng chữ nổi (chu-noi.js) hoặc vật động (chi-duong.js)
           'lop'     do cả một lớp dựng cảnh lo (hinh = tên lớp đã đăng ký bằng TP3.themLop)
     hinh  tên hàm dựng / tên lớp. Loại 'hinh' mà chưa có hàm dựng thì tự dùng HÌNH THAY THẾ (cột với tấm biển trắng ghi mã),
           nên vật mới thêm vào game không bao giờ biến mất khỏi cảnh 3D.
   THÊM MỘT LOẠI VẬT MỚI: thêm một mục vào bảng dưới + viết một hàm TP3.hinhVat.<tên> (xem thu-3d/HUONG-DAN-3D.md).
   File này không dùng three.js, nên bài kiểm kiem-tra/kiem-vat.js nạp được nó bằng Node (không cần trình duyệt).
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
TP3.hinhVat = TP3.hinhVat || {};
// chiều xe đi của làn đường sát một điểm trên vỉa hè (biển đặt bên phải theo chiều đi nên suy ra được mặt biển quay về đâu)
function chieuDiGan(x, y){
  let tot = null;
  for (const r of MAP.roads){ if (!r.veh) continue;
    for (const g of r.seg){ const t = Math.max(0, Math.min(g.l, (x - g.p.x)*g.d.x + (y - g.p.y)*g.d.y)), d = Math.hypot(x - g.p.x - g.d.x*t, y - g.p.y - g.d.y*t);
      if (!tot || d < tot.d) tot = {d, dir: g.d, lat: -(x - g.p.x)*g.d.y + (y - g.p.y)*g.d.x}; } }
  const k = tot.lat > 0 ? 1 : -1; return {x: tot.dir.x * k, y: tot.dir.y * k};
}
TP3.chieuDiGan = chieuDiGan;
const matVeXe = (x, y) => { const d = chieuDiGan(x, y); return {x: -d.x, y: -d.y}; };   // hướng mặt biển: quay về phía xe đang tới

TP3.DANH_MUC = [
  /* ----- biển báo: hinh 'bien' = cột + tấm biển; mat: tên nét vẽ mặt biển trong bien.js (MAT_BIEN) và tham số ----- */
  {ma: 'P.127', ten: 'Biển tốc độ tối đa cho phép', phu: ['SPEED_SIGNS:limit'], kieu: 'hinh', hinh: 'bien',
    nguon: () => SPEED_SIGNS.filter(s => s.kind === 'limit').map(s => ({x: s.x, y: s.y, n: matVeXe(s.x, s.y), mat: ['tocDo', s.v], dang: 'tron'}))},
  {ma: 'W.225', ten: 'Biển trẻ em', phu: ['SPEED_SIGNS:child'], kieu: 'hinh', hinh: 'bien',
    nguon: () => SPEED_SIGNS.filter(s => s.kind === 'child').map(s => ({x: s.x, y: s.y, n: matVeXe(s.x, s.y), mat: ['treEm'], dang: 'tamGiac'}))},
  {ma: 'chi-dan', ten: 'Biển chỉ dẫn hướng đi trước nút giao', phu: ['SIGNBOARDS'], kieu: 'hinh', hinh: 'bien',
    nguon: () => SIGNBOARDS.map(s => ({x: s.x, y: s.y, n: matVeXe(s.x, s.y), mat: ['chiDan', s.rows], dang: 'bang'}))},
  {ma: 'R.303', ten: 'Biển nơi giao nhau chạy theo vòng xuyến', phu: ['trangTri.bienVong'], kieu: 'hinh', hinh: 'bien',
    nguon: () => trangTri.bienVong.map(p => ({x: p.x, y: p.y, n: matVeXe(p.x, p.y), mat: ['vongXuyen'], dang: 'tron'}))},
  {ma: 'bien-P', ten: 'Biển chỗ đỗ xe ở đầu mỗi ô đỗ', phu: ['trangTri.bienP'], kieu: 'hinh', hinh: 'bien',
    nguon: () => BAYS.map((b, i) => ({x: trangTri.bienP[i].x, y: trangTri.bienP[i].y, n: {x: -b.dir.x, y: -b.dir.y}, mat: ['doXe'], dang: 'vuong'}))},
  {ma: 'P.104', ten: 'Biển cấm xe máy (đầu phố đi bộ)', phu: ['trangTri.bienDiBo:xe-may'], kieu: 'hinh', hinh: 'bien',
    nguon: () => bienCam('xe-may')},
  {ma: 'P.103a', ten: 'Biển cấm ô tô (đầu phố đi bộ)', phu: ['trangTri.bienDiBo:o-to'], kieu: 'hinh', hinh: 'bien',
    nguon: () => bienCam('o-to')},
  /* ----- đèn, chốt ----- */
  {ma: 'cot-den', ten: 'Cột đèn tín hiệu (có camera phạt nguội)', phu: ['trangTri.cotDen', 'MAP.lights'], kieu: 'hinh', hinh: 'cotDen', nguon: cotDen},
  {ma: 'chot-csgt', ten: 'Chốt CSGT: chòi, chú CSGT, cọc tiêu', phu: ['CSGT'], kieu: 'hinh', hinh: 'chotCSGT',
    nguon: () => CSGT.filter(p => !p.off).map(p => ({x: p.cabinPt.x, y: p.cabinPt.y, p}))},
  /* ----- thứ nằm trong ảnh mặt đất (veNen của game vẽ, duong.js dán lên mặt đất) ----- */
  {ma: 'vach-dung', ten: 'Vạch dừng và vạch người đi bộ ở ngã có đèn', phu: ['MAP.stopLines'], kieu: 'mat-dat', hinh: 'veNen', nguon: () => MAP.stopLines.map(s => ({x: s.sx, y: s.sy}))},
  {ma: 'vach-qua-duong', ten: 'Vạch người đi bộ qua đường', phu: ['CROSSWALKS'], kieu: 'mat-dat', hinh: 'veNen', nguon: () => CROSSWALKS.filter(w => !w.off).map(w => ({x: w.x, y: w.y}))},
  {ma: 'o-do', ten: 'Ô đỗ xe kẻ vạch trên lòng đường', phu: ['BAYS'], kieu: 'mat-dat', hinh: 'veNen', nguon: () => BAYS.map(b => ({x: b.cx, y: b.cy}))},
  {ma: 'vach-kiem-tra', ten: 'Vạch kiểm tra màu cam ở chốt CSGT', phu: [], kieu: 'mat-dat', hinh: 'anhMatDat', nguon: () => CSGT.filter(p => !p.off).map(p => ({x: p.x, y: p.y}))},
  {ma: 'duong', ten: 'Mặt đường, vạch giữa, vỉa hè, phố đi bộ, hẻm', phu: ['duong:big', 'duong:normal', 'duong:alley', 'duong:ped', 'nut:light', 'nut:priority', 'nut:plain', 'nut:end'], kieu: 'lop', hinh: 'duong',
    nguon: () => MAP.roads.map(r => ({x: r.pts[0].x, y: r.pts[0].y}))},
  /* ----- chữ nổi và vật động ----- */
  {ma: 'diem-giao', ten: 'Tên điểm giao, ô đích nhấp nháy và mốc xanh', phu: ['DESTS'], kieu: 'chu-noi', hinh: 'chuNoi', nguon: () => DESTS.map(d => ({x: d.lx, y: d.ly}))},
  {ma: 'bang-pho-di-bo', ten: 'Bảng "PHỐ ĐI BỘ"', phu: ['trangTri.nhanDiBo'], kieu: 'chu-noi', hinh: 'chuNoi', nguon: () => trangTri.nhanDiBo},
  {ma: 'ten-duong', ten: 'Tên đường', phu: ['trangTri.nhanDuong'], kieu: 'chu-noi', hinh: 'chuNoi', nguon: () => trangTri.nhanDuong},
  {ma: 'het-khu', ten: 'Chữ "Hết khu chơi thử" ở mép bản đồ', phu: ['trangTri.nhanMep'], kieu: 'chu-noi', hinh: 'chuNoi', nguon: () => trangTri.nhanMep},
  /* ----- do cả một lớp dựng cảnh lo ----- */
  {ma: 'nha', ten: 'Nhà ống, nhà trong lõi khối phố, trường học', phu: ['MAP.houses:nha'], kieu: 'lop', hinh: 'nha', nguon: () => (MAP.houses || []).filter(h => !h.stall)},
  {ma: 'cho', ten: 'Sạp chợ', phu: ['MAP.houses:stall'], kieu: 'lop', hinh: 'trang-tri', nguon: () => (MAP.houses || []).filter(h => h.stall)},
  {ma: 'vong-xuyen', ten: 'Đảo vòng xuyến có bồn hoa', phu: ['nut:ring', 'MAP.rings'], kieu: 'lop', hinh: 'trang-tri', nguon: () => MAP.rings}
];
function bienCam(icon){   // biển cấm ở đầu phố đi bộ: quay dọc theo đường xe chạy ngang qua, xem được từ cả hai chiều
  return trangTri.bienDiBo.filter(b => b.icon === icon).map(b => {
    let nut = null;
    for (const id in MAP.nodes){ const nd = MAP.nodes[id]; if (!nd.arms.some(a => !a.road.veh)) continue;
      if (!nut || Math.hypot(nd.x - b.x, nd.y - b.y) < Math.hypot(nut.x - b.x, nut.y - b.y)) nut = nd; }
    const va = nut && nut.arms.find(a => a.road.veh), u = va ? va.out : {x: 1, y: 0};
    return {x: b.x, y: b.y, n: {x: u.x, y: u.y}, mat: ['cam', icon], dang: 'tron', haiMat: true};
  });
}
// Cột đèn: cột ở góc bên phải mỗi nhánh (trangTri.cotDen, cùng thứ tự với MAP.stopLines), hộp đèn chính quay về phía xe đang tới,
// pha đèn riêng của nhánh (sl.phase). Xe đứng ở vạch dừng thường không thấy hộp chính của mình (cột ở ngang hoặc sau lưng, nhất là ở
// ngã năm, ngã ba lệch), nên mỗi nhánh có thêm một HỘP NHẮC LẠI gắn trên cột khác của nút: chọn cột nằm phía trước vạch dừng
// 40–260 đơn vị, lệch ngang ít nhất (ưu tiên bên phải). Bài kiểm kiem-vat.js bảo đảm vạch dừng nào cũng có hộp đèn nhìn thấy được.
function cotDen(){
  const ds = [], theoNut = {};
  MAP.stopLines.forEach((sl, i) => {
    const p = trangTri.cotDen[i]; if (!p) return;
    const c = {x: p.x, y: p.y, hop: [{n: {x: -sl.d.x, y: -sl.d.y}, L: sl.L, phase: sl.phase}], cam: Math.atan2(-sl.d.y, -sl.d.x), sl};
    ds.push(c); (theoNut[sl.node] = theoNut[sl.node] || []).push(c);
  });
  for (const sl of MAP.stopLines){
    let tot = null, dTot = 1e9;
    for (const c of theoNut[sl.node] || []){
      if (c.sl === sl) continue;
      const vx = c.x - sl.sx, vy = c.y - sl.sy, truoc = vx*sl.d.x + vy*sl.d.y, ngang = -vx*sl.d.y + vy*sl.d.x;   // ngang dương: bên phải
      if (truoc < 40 || truoc > 260 || ngang < -70 || ngang > 120) continue;
      const diem = Math.abs(ngang) + (ngang < 0 ? 25 : 0) + truoc * 0.2;
      if (diem < dTot && !c.hop.some(h => -h.n.x*sl.d.x - h.n.y*sl.d.y > 0.9)){ dTot = diem; tot = c; }
    }
    if (tot) tot.hop.push({n: {x: -sl.d.x, y: -sl.d.y}, L: sl.L, phase: sl.phase, nhac: true});
  }
  return ds;
}
// Mọi "bảng dữ liệu" của game cần có mục lo (bài kiểm so danh sách này với cột phu của danh mục)
TP3.bangCanLo = function(){
  const k = new Set(['SIGNBOARDS', 'CSGT', 'CROSSWALKS', 'BAYS', 'DESTS', 'MAP.stopLines', 'MAP.lights', 'MAP.rings', 'MAP.houses:nha', 'MAP.houses:stall']);
  for (const s of SPEED_SIGNS) k.add('SPEED_SIGNS:' + s.kind);
  for (const ten in trangTri){ if (ten === 'bienDiBo') for (const b of trangTri.bienDiBo) k.add('trangTri.bienDiBo:' + b.icon); else k.add('trangTri.' + ten); }
  for (const r of MAP.roads) k.add('duong:' + r.cap);
  for (const id in MAP.nodes) k.add('nut:' + MAP.nodes[id].kind);
  return [...k];
};
})();
