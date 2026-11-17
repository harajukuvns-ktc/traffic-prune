/* =========================================================
   Traffic Prune · thu-3d/3d/chat-lieu.js: ẢNH CHẤT LIỆU TỰ SINH VÀ CHẤT LIỆU DÙNG CHUNG
   Không dùng file ảnh nào: mọi mặt tường, cửa, bảng hiệu, mái tôn... đều vẽ bằng canvas lúc mở trang.
   Hai bảng ảnh ghép dùng cho cả bản đồ:
     TP3.anh.duc    hình đặc (tường, cửa, bảng hiệu, mái...)            → chất liệu TP3.vl.duc
     TP3.anh.trong  hình có chỗ trong suốt (biển báo tròn, lan can...)  → chất liệu TP3.vl.trong
   Các file khác thêm ảnh của mình vào hai bảng này ngay khi được nạp (TP3.anh.duc.them(...)); chinh.js gọi
   TP3.taoChatLieu() sau cùng để xếp ảnh và tạo chất liệu.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, FONT = TP3.FONT;
TP3.anh = {duc: new TP3.BangAnh(2048, false), trong: new TP3.BangAnh(1024, true)};
// bộ sinh số ngẫu nhiên có hạt giống (mỗi ảnh một hạt giống cố định nên lần nào mở trang cũng ra cùng một hình)
TP3.rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
TP3.rrect = rr;

/* ---------- nhiễu lặp (dùng cho mặt đường, cỏ, hạt chất liệu) ---------- */
// bảng nhiễu 256 × 256 lặp được, giá trị 0..1, gồm vài lớp từ thô tới mịn
TP3.nhieu = (() => {
  const N = 256, a = new Float32Array(N * N), r = TP3.rng(77);
  for (const [buoc, bien] of [[32, 0.5], [16, 0.25], [8, 0.15], [2, 0.1]]){
    const n = N / buoc, l = new Float32Array(n * n); for (let i = 0; i < l.length; i++) l[i] = r();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){
      const fx = x / buoc, fy = y / buoc, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx*tx*(3 - 2*tx), sy = ty*ty*(3 - 2*ty);
      const v = (i, j) => l[((y0 + j) % n) * n + (x0 + i) % n];
      a[y*N + x] += bien * ((v(0, 0)*(1 - sx) + v(1, 0)*sx)*(1 - sy) + (v(0, 1)*(1 - sx) + v(1, 1)*sx)*sy);
    }
  }
  return {N, a, lay: (x, y) => a[((y & 255) << 8) | (x & 255)]};
})();

/* ---------- các nét vẽ dùng lại ---------- */
const hat = (g, w, h, r, n, a) => { for (let i = 0; i < n; i++){ g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,' + a + ')' : 'rgba(255,255,255,' + a + ')'; g.fillRect(r()*w, r()*h, 1 + r()*2, 1 + r()*2); } };
const loang = (g, w, h, r, n, mauRGB, a, cMin, cMax) => { for (let i = 0; i < n; i++){ const x = r()*w, y = r()*h, R = cMin + r()*(cMax - cMin), gr = g.createRadialGradient(x, y, 0, x, y, R);
  gr.addColorStop(0, 'rgba(' + mauRGB + ',' + a + ')'); gr.addColorStop(1, 'rgba(' + mauRGB + ',0)'); g.fillStyle = gr; g.fillRect(x - R, y - R, 2*R, 2*R); } };
// kính phản chiếu trời: trên sáng xanh, dưới sẫm, có vệt sáng chéo và bóng mây
const kinh = (g, x, y, w, h, r, toi) => {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, toi ? '#7fa6c9' : '#a9cdea'); gr.addColorStop(0.45, toi ? '#4f7396' : '#7ba6cc'); gr.addColorStop(1, toi ? '#22364a' : '#3d5b7a');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(x + w*0.15, y + h); g.lineTo(x + w*0.55, y); g.lineTo(x + w*0.75, y); g.lineTo(x + w*0.35, y + h); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x + w*(0.3 + r()*0.4), y + h*0.2, w*0.35, h*0.07, 0, 0, Math.PI*2); g.fill();
  g.fillStyle = 'rgba(10,16,24,.28)'; g.fillRect(x, y + h*0.72, w, h*0.28);
  g.restore();
};

/* ---------- tường trát (trắng, nhận màu sơn của từng nhà) có vệt bẩn do mưa ---------- */
function veTuong(muc){ return (g, w, h) => {
  const r = TP3.rng(100 + muc);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  loang(g, w, h, r, 10 + muc*5, '120,108,92', 0.05 + muc*0.02, 20, 70);
  if (muc === 3){ g.strokeStyle = 'rgba(60,56,50,.10)'; g.lineWidth = 1; for (let y = 6; y < h; y += 9 + r()*6){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - .5)*4); g.stroke(); }
    for (let i = 0; i < 5; i++){ g.fillStyle = 'rgba(' + (r() < .5 ? '255,255,255' : '70,66,60') + ',.10)'; g.fillRect(r()*w, r()*h, 20 + r()*50, 14 + r()*30); } }
  // vệt nước mưa chảy từ mép trên xuống
  for (let i = 0; i < 6 + muc*5; i++){ const x = r()*w, rg = 3 + r()*9, d = 40 + r()*(60 + muc*50), gr = g.createLinearGradient(0, 0, 0, d);
    gr.addColorStop(0, 'rgba(62,56,46,' + (0.14 + muc*0.05) + ')'); gr.addColorStop(1, 'rgba(62,56,46,0)'); g.fillStyle = gr; g.fillRect(x, 0, rg, d); }
  let gr = g.createLinearGradient(0, 0, 0, 34); gr.addColorStop(0, 'rgba(60,54,44,' + (0.14 + muc*0.04) + ')'); gr.addColorStop(1, 'rgba(60,54,44,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, 34);
  // chân tường ố bẩn, bắn bùn
  gr = g.createLinearGradient(0, h, 0, h - 46); gr.addColorStop(0, 'rgba(70,62,50,' + (0.26 + muc*0.05) + ')'); gr.addColorStop(1, 'rgba(70,62,50,0)'); g.fillStyle = gr; g.fillRect(0, h - 46, w, 46);
  hat(g, w, h, r, 500, 0.035);
}; }
/* ---------- cửa sổ, cửa ban công ---------- */
const CUA_SO = [
  (g, w, h, r) => {   // hai cánh kính khung trắng
    g.fillStyle = '#f1eee6'; g.fillRect(0, 0, w, h); kinh(g, 10, 10, w/2 - 14, h - 26, r); kinh(g, w/2 + 4, 10, w/2 - 14, h - 26, r);
    g.fillStyle = '#d9d5cb'; g.fillRect(0, h - 12, w, 12); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, h - 13, w, 2);
    g.fillStyle = '#f1eee6'; g.fillRect(10, h*0.36, w - 20, 4); },
  (g, w, h, r) => {   // cửa chớp gỗ xanh lá
    g.fillStyle = '#27584a'; g.fillRect(0, 0, w, h);
    for (const x of [8, w/2 + 3]){ g.fillStyle = '#2f6b55'; g.fillRect(x, 8, w/2 - 11, h - 18);
      for (let y = 12; y < h - 14; y += 7){ g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 3, y + 4, w/2 - 17, 2); g.fillStyle = 'rgba(255,255,255,.13)'; g.fillRect(x + 3, y, w/2 - 17, 2); } }
    g.fillStyle = '#1d4539'; g.fillRect(0, h - 9, w, 9); },
  (g, w, h, r) => {   // kính lớn khung nhôm sẫm
    g.fillStyle = '#3a3f47'; g.fillRect(0, 0, w, h); kinh(g, 7, 7, w - 14, h*0.26, r, true); kinh(g, 7, h*0.26 + 13, w/2 - 10, h*0.74 - 22, r, true); kinh(g, w/2 + 3, h*0.26 + 13, w/2 - 10, h*0.74 - 22, r, true); },
  (g, w, h, r) => {   // cửa ban công gỗ, trên kính dưới pa-nô
    g.fillStyle = '#6e4a31'; g.fillRect(0, 0, w, h);
    for (const x of [9, w/2 + 3]){ kinh(g, x, 10, w/2 - 12, h*0.6, r); g.fillStyle = '#845a3c'; g.fillRect(x, h*0.6 + 18, w/2 - 12, h*0.4 - 28); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.strokeRect(x + 5, h*0.6 + 23, w/2 - 22, h*0.4 - 38); }
    g.fillStyle = '#d9b25a'; g.fillRect(w/2 - 7, h*0.55, 3, 12); g.fillRect(w/2 + 4, h*0.55, 3, 12); },
  (g, w, h, r) => {   // cửa sổ có song sắt
    g.fillStyle = '#e9e5dc'; g.fillRect(0, 0, w, h); kinh(g, 9, 9, w - 18, h - 24, r, true);
    g.strokeStyle = '#1f2226'; g.lineWidth = 3; for (let x = 20; x < w - 12; x += 14){ g.beginPath(); g.moveTo(x, 9); g.lineTo(x, h - 15); g.stroke(); }
    g.lineWidth = 3; for (const y of [h*0.3, h*0.62]){ g.beginPath(); g.moveTo(9, y); g.lineTo(w - 9, y); g.stroke(); }
    g.fillStyle = '#cfcabf'; g.fillRect(0, h - 12, w, 12); },
  (g, w, h, r) => {   // cửa kính có rèm
    g.fillStyle = '#f1eee6'; g.fillRect(0, 0, w, h); kinh(g, 9, 9, w - 18, h - 24, r);
    g.fillStyle = 'rgba(247,238,214,.82)'; g.beginPath(); g.moveTo(9, 9); g.lineTo(w*0.42, 9); g.quadraticCurveTo(w*0.3, h*0.5, 9 + 10, h - 15); g.lineTo(9, h - 15); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w - 9, 9); g.lineTo(w*0.58, 9); g.quadraticCurveTo(w*0.7, h*0.5, w - 19, h - 15); g.lineTo(w - 9, h - 15); g.closePath(); g.fill();
    g.fillStyle = '#f1eee6'; g.fillRect(w/2 - 2, 9, 4, h - 24); g.fillStyle = '#d9d5cb'; g.fillRect(0, h - 12, w, 12); },
  (g, w, h, r) => {   // cửa chớp xanh lam kiểu cũ
    g.fillStyle = '#31587f'; g.fillRect(0, 0, w, h);
    for (const x of [8, w/2 + 3]){ g.fillStyle = '#3f6f9e'; g.fillRect(x, 8, w/2 - 11, h - 18);
      for (let y = 12; y < h - 14; y += 7){ g.fillStyle = 'rgba(0,0,0,.26)'; g.fillRect(x + 3, y + 4, w/2 - 17, 2); g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x + 3, y, w/2 - 17, 2); } }
    g.fillStyle = '#264665'; g.fillRect(0, h - 9, w, 9); }
];
/* ---------- mặt tiền tầng trệt ---------- */
const keHang = (g, x, y, w, h, r) => {   // kệ bày hàng nhiều màu trong cửa tiệm
  const MAU = ['#e5484d', '#ffb020', '#3fa7d6', '#59a14f', '#f2f2f2', '#ff8a3d', '#b07aa1', '#ffd43b'];
  for (let yy = y; yy < y + h - 8; yy += 20){ g.fillStyle = '#5a4634'; g.fillRect(x, yy + 16, w, 3);
    for (let xx = x + 2; xx < x + w - 6; ){ const ww = 5 + r()*9; g.fillStyle = MAU[Math.floor(r()*MAU.length)]; g.fillRect(xx, yy + 3 + r()*4, ww, 13 - r()*4); xx += ww + 1; } }
};
const CUA_TIEM = [
  (g, w, h, r) => {   // cửa cuốn đóng kín
    g.fillStyle = '#6b6f75'; g.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 12; y += 9){ const gr = g.createLinearGradient(0, y, 0, y + 9); gr.addColorStop(0, '#d3d6da'); gr.addColorStop(0.7, '#a9adb3'); gr.addColorStop(1, '#7c8086'); g.fillStyle = gr; g.fillRect(8, y, w - 16, 9); }
    g.fillStyle = '#83878d'; g.fillRect(8, h - 14, w - 16, 14); g.fillStyle = '#3a3d42'; g.fillRect(w/2 - 9, h - 11, 18, 7);
    loang(g, w, h, r, 6, '70,60,48', 0.12, 20, 50);
    g.save(); g.translate(w*0.5, h*0.5); g.rotate(-0.06); g.fillStyle = 'rgba(28,52,120,.62)'; g.font = '800 17px ' + FONT; g.textAlign = 'center'; g.fillText('KHOAN CẮT BÊ TÔNG', 0, 0); g.restore(); },
  (g, w, h, r) => {   // cửa cuốn kéo lên một nửa, thấy hàng bên trong
    g.fillStyle = '#2a2520'; g.fillRect(0, 0, w, h); keHang(g, 16, h*0.38, w - 32, h*0.5, r);
    g.fillStyle = '#7d6a55'; g.fillRect(8, h - 16, w - 16, 16);
    for (let y = 0; y < h*0.34; y += 9){ const gr = g.createLinearGradient(0, y, 0, y + 9); gr.addColorStop(0, '#d3d6da'); gr.addColorStop(0.7, '#a9adb3'); gr.addColorStop(1, '#7c8086'); g.fillStyle = gr; g.fillRect(8, y, w - 16, 9); }
    g.fillStyle = '#6b6f75'; g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h); },
  (g, w, h, r) => {   // cửa kính khung nhôm trắng
    g.fillStyle = '#eceae4'; g.fillRect(0, 0, w, h);
    kinh(g, 10, 10, w*0.3 - 12, h - 22, r, true); kinh(g, w*0.7 + 2, 10, w*0.3 - 12, h - 22, r, true); kinh(g, w*0.3 + 6, 10, w*0.4 - 12, h - 14, r, true);
    g.fillStyle = '#eceae4'; g.fillRect(w/2 - 2, 10, 4, h - 14); g.fillStyle = '#8d9199'; g.fillRect(w/2 - 9, h*0.5, 4, 26); g.fillRect(w/2 + 5, h*0.5, 4, 26);
    g.fillStyle = 'rgba(229,72,77,.85)'; g.fillRect(w*0.3 + 6, h*0.3, w*0.4 - 12, 12); },
  (g, w, h, r) => {   // cửa sắt xếp
    g.fillStyle = '#1f1c1a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#4f84ad'; g.lineWidth = 2;
    for (let x = 6; x < w; x += 12){ g.beginPath(); g.moveTo(x, 4); g.lineTo(x, h); g.stroke(); }
    g.lineWidth = 1.5; for (let y = 10; y < h; y += 24) for (let x = 6; x < w - 12; x += 12){ g.beginPath(); g.moveTo(x, y); g.lineTo(x + 12, y + 24); g.moveTo(x + 12, y); g.lineTo(x, y + 24); g.stroke(); }
    g.fillStyle = '#3f6c8f'; g.fillRect(0, 0, w, 6); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h); },
  (g, w, h, r) => {   // tiệm tạp hóa mở cửa: kệ hàng, dây bánh kẹo treo, tủ kính
    g.fillStyle = '#3a2f26'; g.fillRect(0, 0, w, h); keHang(g, 10, 30, w - 20, h*0.55, r);
    const MAU = ['#ffd43b', '#e5484d', '#59a14f', '#3fa7d6', '#ff8a3d'];
    for (let x = 14; x < w - 10; x += 13){ const c = MAU[Math.floor(r()*MAU.length)], d = 30 + r()*30; for (let y = 4; y < d; y += 9){ g.fillStyle = c; g.fillRect(x, y, 8, 7); } }
    g.fillStyle = 'rgba(190,220,235,.55)'; g.fillRect(14, h - 54, w*0.5, 40); g.strokeStyle = '#d9d9d9'; g.lineWidth = 2; g.strokeRect(14, h - 54, w*0.5, 40);
    g.fillStyle = '#8a6a4a'; g.fillRect(0, h - 14, w, 14); },
  (g, w, h, r) => {   // quán cà phê khung gỗ, đèn vàng
    g.fillStyle = '#5c3f28'; g.fillRect(0, 0, w, h);
    const gr = g.createRadialGradient(w/2, h*0.45, 10, w/2, h*0.45, w*0.6); gr.addColorStop(0, '#ffd98a'); gr.addColorStop(1, '#6b4a22');
    for (const [x, ww] of [[10, w*0.3 - 12], [w*0.3 + 6, w*0.4 - 12], [w*0.7 + 2, w*0.3 - 12]]){ g.fillStyle = gr; g.fillRect(x, 12, ww, h - 30); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, 12, ww, (h - 30)*0.3); }
    g.fillStyle = '#2b2420'; for (const x of [28, 60, w - 70, w - 38]){ g.fillRect(x, h - 50, 14, 26); g.beginPath(); g.arc(x + 7, h - 56, 7, 0, Math.PI*2); g.fill(); }
    g.fillStyle = '#5c3f28'; g.fillRect(0, h - 20, w*0.3, 20); g.fillRect(w*0.7, h - 20, w*0.3, 20); }
];
/* ---------- bảng hiệu (tên hư cấu) ---------- */
const BANG_HIEU = [
  ['TẠP HÓA CÔ BA', 'Bánh kẹo · Nước ngọt', '#c62828', '#fff'], ['PHỞ BÒ GIA TRUYỀN', 'Tái · Nạm · Gầu', '#8d1c1c', '#ffe082'], ['CẮT TÓC NAM', 'Gội đầu · Cạo mặt', '#1565c0', '#fff'],
  ['SỬA XE MÁY ÚT', 'Vá lốp · Thay nhớt', '#263238', '#ffd43b'], ['CÀ PHÊ SÁNG', 'Rang xay nguyên chất', '#4e342e', '#ffcc80'], ['NHA KHOA NỤ CƯỜI', 'Nhổ răng không đau', '#00838f', '#fff'],
  ['TRÀ SỮA MÈO', 'Trân châu đường đen', '#ad1457', '#fff'], ['BÁNH MÌ NÓNG GIÒN', 'Thịt · Chả · Pa-tê', '#ef6c00', '#fff'], ['HIỆU THUỐC AN TÂM', 'Thuốc tây · Dụng cụ y tế', '#2e7d32', '#fff'],
  ['ĐIỆN THOẠI · SIM THẺ', 'Sửa chữa lấy liền', '#283593', '#ffeb3b'], ['MAY ĐO ÁO DÀI', 'Nhận sửa quần áo', '#6a1b9a', '#fff'], ['CƠM TẤM SƯỜN BÌ', 'Mở cửa từ 6 giờ', '#bf360c', '#fff3e0'],
  ['BÚN CHẢ QUẠT THAN', 'Nem cua bể', '#33691e', '#fff'], ['VÀNG BẠC KIM NGÂN', 'Mua bán · Cầm đồ', '#f9a825', '#b71c1c'], ['PHOTOCOPY · IN ẤN', 'Đánh máy · Ép dẻo', '#37474f', '#fff'],
  ['GIẶT ỦI SẠCH THƠM', 'Lấy nhanh trong ngày', '#0277bd', '#fff'], ['NƯỚC MÍA SIÊU SẠCH', 'Sinh tố · Nước dừa', '#558b2f', '#fffde7'], ['VĂN PHÒNG PHẨM', 'Sách vở · Đồ dùng học sinh', '#1976d2', '#fff'],
  ['CHÈ BÀ BẢY', 'Chè thập cẩm · Tàu hũ', '#7b1fa2', '#ffe0b2'], ['ĐIỆN NƯỚC TƯ THÀNH', 'Sửa chữa tận nhà', '#455a64', '#ffeb3b'], ['HOA TƯƠI SÁNG SỚM', 'Hoa cưới · Lẵng hoa', '#c2185b', '#fff'],
  ['BÚN BÒ CÔ NĂM', 'Giò heo · Chả cua', '#a1260d', '#fff'], ['RỬA XE · THAY NHỚT', 'Xe máy · Ô tô', '#00695c', '#fff'], ['GẠO NGON MIỀN TÂY', 'Giao tận nơi', '#827717', '#fff']
];
TP3.SO_BANG_HIEU = BANG_HIEU.length;
function veBangHieu(i){ return (g, w, h) => {
  const [ten, phu, nen, chu] = BANG_HIEU[i], r = TP3.rng(900 + i);
  g.fillStyle = nen; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = chu; g.globalAlpha = 0.7; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6); g.globalAlpha = 1;
  g.fillStyle = chu; g.textAlign = 'center'; g.textBaseline = 'middle';
  let co = 30; g.font = '800 ' + co + 'px ' + FONT; while (co > 12 && g.measureText(ten).width > w - 22){ co--; g.font = '800 ' + co + 'px ' + FONT; }
  g.fillText(ten, w/2, h*0.4);
  g.font = '600 13px ' + FONT; g.globalAlpha = 0.9; g.fillText(phu, w/2, h*0.78); g.globalAlpha = 1;
  loang(g, w, h, r, 3, '40,34,28', 0.12, 20, 60);
}; }
/* ---------- mái, cục nóng, bồn nước, bạt che, hàng bày bán ---------- */
function veTon(g, w, h){
  const r = TP3.rng(31); g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 8){ const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, 'rgba(0,0,0,.26)'); gr.addColorStop(0.5, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,.2)'); g.fillStyle = gr; g.fillRect(x, 0, 8, h); }
  g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 62; y < h; y += 64) g.fillRect(0, y, w, 2);
  loang(g, w, h, r, 14, '120,62,30', 0.2, 10, 44);
}
function veMaiBang(g, w, h){ const r = TP3.rng(32); g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h); loang(g, w, h, r, 12, '60,58,52', 0.12, 12, 44); loang(g, w, h, r, 6, '50,80,40', 0.14, 8, 30); hat(g, w, h, r, 300, 0.05); }
function veDieuHoa(g, w, h){
  g.fillStyle = '#e9ebec'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9bdc0'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
  g.fillStyle = '#3d4348'; g.beginPath(); g.arc(w*0.4, h/2, h*0.38, 0, Math.PI*2); g.fill(); g.strokeStyle = '#aab0b5'; g.lineWidth = 1;
  for (let k = 1; k < 5; k++){ g.beginPath(); g.arc(w*0.4, h/2, h*0.38*k/5, 0, Math.PI*2); g.stroke(); }
  g.fillStyle = '#c9cdd0'; for (let y = 6; y < h - 6; y += 4) g.fillRect(w*0.76, y, w*0.18, 2);
}
function veBon(g, w, h){ for (let y = 0; y < h; y += 8){ const gr = g.createLinearGradient(0, y, 0, y + 8); gr.addColorStop(0, '#f4f6f8'); gr.addColorStop(0.5, '#b9c0c7'); gr.addColorStop(1, '#8e969e'); g.fillStyle = gr; g.fillRect(0, y, w, 8); }
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
function veBat(g, w, h){ g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = '#9a9a9a'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 16, h);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.0)'); gr.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
function veHang(loai){ return (g, w, h) => {
  const r = TP3.rng(60 + loai), BO = loai === 0 ? ['#ff8a3d', '#e5484d', '#ffd43b', '#7cb342'] : loai === 1 ? ['#4caf50', '#8bc34a', '#c0ca33', '#ef5350'] : ['#b0bec5', '#ef9a9a', '#ffcc80', '#90caf9'];
  g.fillStyle = '#6d4c33'; g.fillRect(0, 0, w, h);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++){ const x = i*w/2 + 4, y = j*h/2 + 4, ww = w/2 - 8, hh = h/2 - 8, c = BO[(i + j*2) % 4];
    g.fillStyle = '#3e2a1c'; g.fillRect(x, y, ww, hh);
    for (let k = 0; k < 16; k++){ const cx = x + 7 + r()*(ww - 14), cy = y + 7 + r()*(hh - 14); g.fillStyle = c; g.beginPath(); g.arc(cx, cy, 6.5, 0, Math.PI*2); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(cx - 2, cy - 2, 2, 0, Math.PI*2); g.fill(); } }
}; }
function veSoTuyen(so){ return (g, w, h) => { g.fillStyle = '#15171a'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb300'; g.font = '800 24px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(so, w/2, h/2 + 1); }; }
TP3.SO_TUYEN = ['08', '32', '19', '55'];
/* ---------- lan can, hàng rào (có chỗ trong suốt) ---------- */
const LAN_CAN = [
  (g, w, h) => { g.strokeStyle = '#1f2226'; g.lineWidth = 4; g.strokeRect(2, 4, w - 4, h - 8); g.lineWidth = 3; for (let x = 12; x < w - 6; x += 11){ g.beginPath(); g.moveTo(x, 4); g.lineTo(x, h - 4); g.stroke(); } },
  (g, w, h) => { g.strokeStyle = '#2b2f36'; g.lineWidth = 4; g.strokeRect(2, 4, w - 4, h - 8); g.lineWidth = 2.5;
    for (let x = 16; x < w - 8; x += 22){ g.beginPath(); g.moveTo(x, 4); g.lineTo(x, h - 4); g.stroke(); g.beginPath(); g.arc(x + 11, h/2, 8, 0, Math.PI*2); g.stroke(); } },
  (g, w, h) => { g.strokeStyle = '#c9ced4'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 5); g.lineTo(w, 5); g.stroke(); g.lineWidth = 3;
    for (const y of [h*0.4, h*0.65, h - 5]){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.lineWidth = 4; for (const x of [3, w - 3]){ g.beginPath(); g.moveTo(x, 3); g.lineTo(x, h); g.stroke(); } }
];
function veHangRao(g, w, h){ g.strokeStyle = '#2e7d5b'; g.fillStyle = '#2e7d5b'; g.lineWidth = 4;
  for (let x = 8; x < w; x += 16){ g.beginPath(); g.moveTo(x, 12); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(x - 5, 14); g.lineTo(x, 1); g.lineTo(x + 5, 14); g.closePath(); g.fill(); }
  g.lineWidth = 5; for (const y of [26, h - 14]){ g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }

// đăng ký ảnh của file này
{ const A = TP3.anh.duc, B = TP3.anh.trong;
  for (let i = 0; i < 4; i++) A.them('tuong' + i, 256, 256, veTuong(i));
  CUA_SO.forEach((ve, i) => A.them('cs' + i, 128, 192, (g, w, h) => ve(g, w, h, TP3.rng(300 + i))));
  CUA_TIEM.forEach((ve, i) => A.them('ct' + i, 256, 208, (g, w, h) => ve(g, w, h, TP3.rng(400 + i))));
  BANG_HIEU.forEach((b, i) => A.them('bh' + i, 256, 64, veBangHieu(i)));
  A.them('ton', 256, 256, veTon); A.them('maiBang', 128, 128, veMaiBang); A.them('dh', 64, 48, veDieuHoa); A.them('bon', 64, 64, veBon); A.them('bat', 128, 64, veBat);
  for (let i = 0; i < 3; i++) A.them('hang' + i, 128, 128, veHang(i));
  TP3.SO_TUYEN.forEach(s => A.them('so' + s, 64, 32, veSoTuyen(s)));
  LAN_CAN.forEach((ve, i) => B.them('lc' + i, 128, 64, ve));
  B.them('hr', 128, 96, veHangRao);
  TP3.SO_CUA_SO = CUA_SO.length; TP3.SO_CUA_TIEM = CUA_TIEM.length;
}

/* ---------------------------------------------------------
   TẠO CHẤT LIỆU (gọi một lần từ chinh.js, và gọi lại sau khi mất ngữ cảnh WebGL)
   --------------------------------------------------------- */
TP3.anhTuCanvas = (c, o) => {
  o = o || {};
  const t = new T.CanvasTexture(c); t.colorSpace = o.khongMau ? T.NoColorSpace : T.SRGBColorSpace;
  if (o.lap) t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = Math.min(o.net || 1, TP3.netToiDa || 1);
  return t;
};
TP3.taoChatLieu = function(renderer){
  const vl = TP3.vl = {}, kho = TP3.khoAnh = [];   // khoAnh: mọi ảnh đã đưa lên card đồ họa, để tính bộ nhớ và để huỷ khi dựng lại
  TP3.netToiDa = renderer.capabilities.getMaxAnisotropy();
  const ghi = (t, c) => { kho.push({w: c.width, h: c.height}); return t; };
  for (const k of ['duc', 'trong']){ const b = TP3.anh[k]; if (!b.canvas) b.xep(); }
  const net = TP3.mucTen === 'thap' ? 2 : 4;
  vl.anhDuc = ghi(TP3.anhTuCanvas(TP3.anh.duc.canvas, {net}), TP3.anh.duc.canvas);
  vl.anhTrong = ghi(TP3.anhTuCanvas(TP3.anh.trong.canvas, {net}), TP3.anh.trong.canvas);
  // hình đặc: chất liệu nhận nắng kiểu Lambert (rẻ hơn hẳn MeshStandardMaterial trên điện thoại mà phố ban ngày vẫn đủ đẹp)
  vl.duc = new T.MeshLambertMaterial({map: vl.anhDuc, vertexColors: true});
  vl.trong = new T.MeshLambertMaterial({map: vl.anhTrong, vertexColors: true, alphaTest: 0.5, side: T.DoubleSide});
  // Ở góc dẫn đường, tán cây / cột / dây biển nằm GIỮA máy quay và xe người chơi sẽ che mất xe. Chèn vài dòng vào chương trình tô màu:
  // điểm nào cao hơn 12 đơn vị và nằm trong ống bán kính uCat.y quanh đường ngắm máy quay → xe thì bỏ không vẽ (mép ống vẽ thưa cho mềm).
  // Tính trong hệ toạ độ của máy quay: uXe = vị trí xe, uLen = hướng "lên trên", uCat.x = độ cao máy quay. uCat.y = 0 thì tắt (góc sau tay lái).
  TP3.catTam = {uXe: {value: new T.Vector3(0, 0, -1)}, uLen: {value: new T.Vector3(0, 1, 0)}, uCat: {value: new T.Vector2(0, 0)}};
  for (const m of [vl.duc, vl.trong]){
    m.onBeforeCompile = sh => {
      if (sh.fragmentShader.indexOf('#include <clipping_planes_fragment>') < 0) return;   // three.js đổi cấu trúc thì bỏ tính năng này, cảnh vẫn vẽ bình thường
      Object.assign(sh.uniforms, TP3.catTam);
      sh.fragmentShader = 'uniform vec3 uXe;\nuniform vec3 uLen;\nuniform vec2 uCat;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
	if ( uCat.y > 0.0 ) { vec3 pC = - vViewPosition; if ( dot( pC, uLen ) + uCat.x > 12.0 ) { float tC = dot( pC, uXe ) / dot( uXe, uXe );
		if ( tC > 0.04 && tC < 0.93 ) { float dC = length( pC - uXe * tC ); if ( dC < uCat.y || ( dC < uCat.y + 3.0 && mod( gl_FragCoord.x + gl_FragCoord.y, 2.0 ) < 1.0 ) ) discard; } } }`);
    };
    m.customProgramCacheKey = () => 'tp3-cat-tam';
  }
  // bóng mờ dưới chân vật: ảnh tròn sẫm ở giữa, trắng dần ra mép, NHÂN vào màu mặt đất bên dưới
  // (không dùng độ trong suốt của ảnh: ảnh đen có độ trong suốt đưa lên card đồ họa bị mất hẳn khi thử trên Chrome)
  { const c = TP3.taoCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
    gr.addColorStop(0, 'rgb(72,74,84)'); gr.addColorStop(0.55, 'rgb(128,130,140)'); gr.addColorStop(1, 'rgb(255,255,255)'); g.fillStyle = gr; g.fillRect(1, 1, 62, 62);
    vl.anhBong = ghi(TP3.anhTuCanvas(c), c);
    vl.bong = new T.MeshBasicMaterial({map: vl.anhBong, transparent: true, depthWrite: false, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.DstColorFactor, blendDst: T.ZeroFactor}); }
  vl.day = new T.LineBasicMaterial({color: 0x24262b});
  vl.den = new T.MeshBasicMaterial({vertexColors: true, fog: false, toneMapped: false});   // bóng đèn tín hiệu tự phát sáng
  vl.sang = new T.MeshBasicMaterial({vertexColors: true, toneMapped: false});              // đèn xi-nhan, đèn phanh khi bật
  // ảnh hạt mịn nhân thêm lên mặt đất khi nhìn gần (mặt đường nhựa có hạt)
  { const N = 256, c = TP3.taoCanvas(N, N), g = c.getContext('2d'), d = g.createImageData(N, N), r = TP3.rng(5);
    for (let i = 0; i < N*N; i++){ const v = 128 + (TP3.nhieu.a[i] - 0.5) * 70 + (r() - 0.5) * 70; d.data[i*4] = d.data[i*4+1] = d.data[i*4+2] = Math.max(0, Math.min(255, v)); d.data[i*4+3] = 255; }
    g.putImageData(d, 0, 0);
    vl.anhHat = ghi(TP3.anhTuCanvas(c, {lap: true, khongMau: true, net: 2}), c); }
  // Mặt đất của một ô: ảnh nền của ô nhân với ảnh hạt lặp lại (chèn một dòng vào chương trình tô màu của three.js).
  vl.matDat = anh => {
    const m = new T.MeshLambertMaterial({map: anh});
    m.onBeforeCompile = sh => {
      if (sh.fragmentShader.indexOf('#include <map_fragment>') < 0) return;   // three.js đổi cấu trúc thì bỏ lớp hạt, mặt đất vẫn vẽ bình thường
      sh.uniforms.anhHat = {value: vl.anhHat};
      sh.fragmentShader = 'uniform sampler2D anhHat;\n' + sh.fragmentShader.replace('#include <map_fragment>',
        '#include <map_fragment>\n\tdiffuseColor.rgb *= 0.55 + 0.9 * texture2D( anhHat, vMapUv * ' + (TP3.O_RONG / 26).toFixed(3) + ' ).g;');
    };
    m.customProgramCacheKey = () => 'tp3-mat-dat';
    return m;
  };
  return vl;
};
// ước tính bộ nhớ ảnh trên card đồ họa (MB), kể cả các bản thu nhỏ
TP3.boNhoAnh = () => Math.round((TP3.khoAnh || []).reduce((s, a) => s + a.w * a.h * 4 * 1.34, 0) / 1048576 * 10) / 10;
})();
