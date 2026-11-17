/* =========================================================
   Traffic Prune · thu-3d/3d/nen-tang.js: NỀN TẢNG CHUNG CỦA PHẦN VẼ 3D (đợt 1: "gần giống thật", khu phố cũ)
   Nạp sau ../js/game.js và lib/three.r187.js, TRƯỚC mọi file khác trong thư mục 3d/.

   Phần vẽ 3D chia thành nhiều file script thường, cùng gắn vào một đối tượng chung window.TP3:
     nen-tang.js   tham số, mức đồ họa, công cụ gộp hình (Gom), bảng ảnh ghép (BangAnh), chia ô bản đồ
     chat-lieu.js  ảnh chất liệu tự sinh bằng canvas (tường, cửa, bảng hiệu, mái tôn...) và các chất liệu dùng chung
     anh-sang.js   bảng "cảnh" (CANH.ngay), nắng, ánh trời, bầu trời có mây, sương, bóng đổ
     duong.js      mặt đất từng ô (dùng lại veNen của game), vỉa hè nhô cao, bó vỉa
     nha.js        nhà ống, trường học
     bien.js       biển báo, đèn tín hiệu, chốt CSGT
     trang-tri.js  cây, cột điện và dây điện, vòng xuyến, sạp chợ, xe dựng vỉa hè
     xe.js         xe máy, ô tô, xe buýt (xe NPC và xe người chơi)
     nguoi.js      người đi bộ
     may-quay.js   hai góc nhìn 3D
     chu-noi.js    chữ nổi (tên đường, điểm giao, tiền bay lên)
     chinh.js      dựng cảnh theo ô, vẽ mỗi khung hình, giữ mát máy, nối vào game (render / resize / newTrip), window.__T3D

   Toạ độ: bản đồ (x, y) với y hướng xuống → 3D là (X = x, Y = độ cao, Z = y). 4 đơn vị = 1 mét.
   Quy ước hệ trục riêng của một vật (xe, nhà...): x tới trước (hoặc dọc mặt tiền), y lên trên, z sang phải.
   ========================================================= */
'use strict';
(function(){
const T = window.THREE;
const TP3 = window.TP3 = {T, hong: !T};
TP3.baoLoi = chu => { let d = document.getElementById('loi3d'); if (!d){ d = document.createElement('div'); d.id = 'loi3d'; document.body.appendChild(d); } d.textContent = chu; };
if (!T){ TP3.baoLoi('Không nạp được thư viện 3D (lib/three.r187.js). Bấm nút đổi góc nhìn để dùng kiểu bản đồ từ trên xuống.'); return; }

/* ---------------------------------------------------------
   1. THAM SỐ VÀ MỨC ĐỒ HỌA
   ?q=thap|vua|cao  mức đồ họa (không ghi thì chọn theo máy: điện thoại 'vua', máy tính 'cao')
   ?fps=30|45|60    giới hạn số khung hình mỗi giây (mặc định: điện thoại 45, máy tính 60)
   ?tu=0            tắt việc tự hạ / nâng độ nét theo sức máy (dùng khi đo và chụp ảnh)
   ?do=0            tắt ô số đo
   --------------------------------------------------------- */
const thamSo = new URLSearchParams(location.search);
const camUng = ('ontouchstart' in window) || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
// pr: tỉ lệ điểm ảnh tối đa · nen: điểm ảnh của ảnh mặt đất cho mỗi đơn vị bản đồ · xa: tầm nhìn · rangCua: khử răng cưa
// chiTiet: 0 = nhà trơn, không dây điện · 1 = đủ ban công, cục nóng, dây điện · 2 = thêm xe dựng vỉa hè, chậu cây
// bong: bóng đổ thật (một nguồn nắng) · bongAnh: cỡ ảnh bóng
const MUC = {
  thap: {pr: 1,   nen: 1,   xa: 900,  rangCua: false, chiTiet: 0, bong: false},
  vua:  {pr: 1.5, nen: 1.5, xa: 1300, rangCua: true,  chiTiet: 1, bong: false},
  cao:  {pr: 2,   nen: 2,   xa: 1900, rangCua: true,  chiTiet: 2, bong: true, bongAnh: 2048}
};
TP3.MUC = MUC;
TP3.mucTen = MUC[thamSo.get('q')] ? thamSo.get('q') : (camUng ? 'vua' : 'cao');
TP3.Q = Object.assign({}, MUC[TP3.mucTen]);
TP3.camUng = camUng;
TP3.fpsToiDa = [30, 45, 60].includes(+thamSo.get('fps')) ? +thamSo.get('fps') : (camUng ? 45 : 60);
TP3.tuChinh = thamSo.get('tu') !== '0';
TP3.hienDo = thamSo.get('do') !== '0';
TP3.KHU = {x0: 0, y0: 0, x1: 1600, y1: 1200};            // khu phố cũ: đơn giao hàng chỉ ở trong này
TP3.O_RONG = 512;                                        // bản đồ chia thành các ô vuông 512 đơn vị, mỗi ô dựng riêng
TP3.VUNG = {x0: -512, y0: -512, x1: 2048, y1: 1536};     // vùng dựng 3D đầy đủ (đợt 1): khu cũ và một dải viền, tròn theo ô
TP3.CAO_VIA = 1.2;                                       // vỉa hè nhô cao 1,2 đơn vị (0,3 m)
TP3.TT = {muc: TP3.mucTen};                              // thông tin dựng cảnh, để báo cáo qua __T3D.thongTin
TP3.trongVung = (x, y, le) => x >= TP3.VUNG.x0 - (le || 0) && x <= TP3.VUNG.x1 + (le || 0) && y >= TP3.VUNG.y0 - (le || 0) && y <= TP3.VUNG.y1 + (le || 0);
TP3.trongKhu = (x, y) => x >= TP3.KHU.x0 && x <= TP3.KHU.x1 && y >= TP3.KHU.y0 && y <= TP3.KHU.y1;
TP3.trongO = (o, x, y) => x >= o.x0 && x < o.x1 && y >= o.y0 && y < o.y1;
// số "ngẫu nhiên" cố định theo vị trí (cùng chỗ thì lần dựng nào cũng ra cùng một kết quả)
TP3.bam = (x, y, k) => { const v = Math.sin(x*12.9898 + y*78.233 + (k || 0)*37.719) * 43758.5453; return v - Math.floor(v); };
TP3.chon = (ds, x, y, k) => ds[Math.floor(TP3.bam(x, y, k) * ds.length) % ds.length];
TP3.FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
TP3.taoCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

/* ---------------------------------------------------------
   2. MÀU
   --------------------------------------------------------- */
const khoMau = new Map();
// màu '#rrggbb' → [r, g, b] trong không gian màu tuyến tính của three.js
TP3.mau = m => { if (typeof m !== 'string') return m; let v = khoMau.get(m); if (!v){ const c = new T.Color(m); v = [c.r, c.g, c.b]; khoMau.set(m, v); } return v; };
// trộn hai màu '#rrggbb' (k = 0: màu a, k = 1: màu b), trả về '#rrggbb'
TP3.tron = (a, b, k) => { const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16), f = (s) => Math.round(((p >> s) & 255) * (1 - k) + ((q >> s) & 255) * k);
  return '#' + ((1 << 24) | (f(16) << 16) | (f(8) << 8) | f(0)).toString(16).slice(1); };
TP3.TRANG = [0.004, 0.996];   // toạ độ ảnh của ô trắng ở góc trên trái mọi bảng ảnh ghép: hình không có ảnh thì trỏ vào đây

/* ---------------------------------------------------------
   3. GOM: công cụ gộp hình (three.js bản gom không kèm BufferGeometryUtils).
   Mỗi đỉnh có vị trí, pháp tuyến (để nhận nắng), màu (màu sơn nhân với độ "che sáng" tô sẵn) và toạ độ ảnh.
   Gom có một "khung đặt" hiện hành (dat): mọi hình thêm vào đều được dời, quay quanh trục đứng và phóng theo khung đó,
   nên một vật dựng trong hệ trục riêng có thể đặt ở bất cứ đâu trên bản đồ.
   --------------------------------------------------------- */
class Gom {
  constructor(){ this.p = []; this.n = []; this.c = []; this.uv = []; this.i = []; this.so = 0; this.dat(); }
  // đặt khung: gốc (x, y0, z) trên bản đồ, quay góc a (góc bản đồ: 0 = trục x riêng trùng trục x bản đồ), phóng s lần
  dat(x, y0, z, a, s){ this.kx = x || 0; this.ky = y0 || 0; this.kz = z || 0; this.kc = Math.cos(a || 0); this.ks = Math.sin(a || 0); this.kp = s || 1; return this; }
  dinh(x, y, z, nx, ny, nz, r, g, b, u, v){
    const c = this.kc, s = this.ks, k = this.kp;
    this.p.push(this.kx + (x*c - z*s)*k, this.ky + y*k, this.kz + (x*s + z*c)*k);
    this.n.push(nx*c - nz*s, ny, nx*s + nz*c);
    this.c.push(r, g, b); this.uv.push(u, v);
    return this.so++;
  }
  // Tứ giác a, b, c, d (mỗi điểm [x, y, z]); n: pháp tuyến; m: màu.
  // o.o: ô ảnh {u0, v0, u1, v1} (a = dưới trái, b = dưới phải, c = trên phải, d = trên trái) · o.uv: toạ độ ảnh từng đỉnh
  // o.ao: độ che sáng từng đỉnh [a, b, c, d] (1 = sáng đủ) hoặc một số chung · o.n4: pháp tuyến riêng từng đỉnh (mặt cong)
  tu(a, b, c, d, n, m, o){
    o = o || {};
    const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = d[0]-a[0], vy = d[1]-a[1], vz = d[2]-a[2];
    const thuan = (uy*vz - uz*vy)*n[0] + (uz*vx - ux*vz)*n[1] + (ux*vy - uy*vx)*n[2] >= 0;
    const col = TP3.mau(m), ao = o.ao, q = [0, 0, 0, 0], P = [a, b, c, d];
    const r = o.o, UV = o.uv || (r ? [[r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1], [r.u0, r.v1]] : null);
    for (let j = 0; j < 4; j++){
      const k = ao === undefined ? 1 : (typeof ao === 'number' ? ao : ao[j]), nn = o.n4 ? o.n4[j] : n, t = UV ? UV[j] : TP3.TRANG;
      q[j] = this.dinh(P[j][0], P[j][1], P[j][2], nn[0], nn[1], nn[2], col[0]*k, col[1]*k, col[2]*k, t[0], t[1]);
    }
    if (thuan) this.i.push(q[0], q[1], q[2], q[0], q[2], q[3]); else this.i.push(q[0], q[2], q[1], q[0], q[3], q[2]);
  }
  tamGiac(a, b, c, n, m, o){
    o = o || {};
    const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
    const thuan = (uy*vz - uz*vy)*n[0] + (uz*vx - ux*vz)*n[1] + (ux*vy - uy*vx)*n[2] >= 0;
    const col = TP3.mau(m), k = o.ao === undefined ? 1 : o.ao, P = [a, b, c];
    const q = P.map((p, j) => { const nn = o.n3 ? o.n3[j] : n, t = o.uv ? o.uv[j] : TP3.TRANG; return this.dinh(p[0], p[1], p[2], nn[0], nn[1], nn[2], col[0]*k, col[1]*k, col[2]*k, t[0], t[1]); });
    if (thuan) this.i.push(q[0], q[1], q[2]); else this.i.push(q[0], q[2], q[1]);
  }
  // Khối hộp: tâm đáy (x, z), đáy ở độ cao y0; dai theo trục x riêng (quay thêm góc a), rong theo trục z, cao lên trên.
  // o.tren / truoc / sau / ben: màu riêng từng mặt · o.khongNoc / coDay · o.oTruoc / oSau / oBen / oTren: ô ảnh của mặt
  // o.aoDay: độ che sáng ở chân khối (mặc định 1) · o.ao: độ che sáng cả khối
  hop(x, y0, z, dai, cao, rong, a, m, o){
    o = o || {};
    const c = Math.cos(a || 0), s = Math.sin(a || 0), hx = dai / 2, hz = rong / 2, y1 = y0 + cao;
    const P = (lx, y, lz) => [x + lx*c - lz*s, y, z + lx*s + lz*c];
    const k1 = o.ao === undefined ? 1 : o.ao, k0 = k1 * (o.aoDay === undefined ? 1 : o.aoDay), ao = [k0, k0, k1, k1];
    this.tu(P(hx, y0, hz), P(hx, y0, -hz), P(hx, y1, -hz), P(hx, y1, hz), [c, 0, s], o.truoc || m, {ao, o: o.oTruoc});
    this.tu(P(-hx, y0, -hz), P(-hx, y0, hz), P(-hx, y1, hz), P(-hx, y1, -hz), [-c, 0, -s], o.sau || m, {ao, o: o.oSau});
    this.tu(P(-hx, y0, hz), P(hx, y0, hz), P(hx, y1, hz), P(-hx, y1, hz), [-s, 0, c], o.ben || m, {ao, o: o.oBen});
    this.tu(P(hx, y0, -hz), P(-hx, y0, -hz), P(-hx, y1, -hz), P(hx, y1, -hz), [s, 0, -c], o.ben || m, {ao, o: o.oBen});
    if (!o.khongNoc) this.tu(P(-hx, y1, hz), P(hx, y1, hz), P(hx, y1, -hz), P(-hx, y1, -hz), [0, 1, 0], o.tren || m, {ao: k1, o: o.oTren});
    if (o.coDay) this.tu(P(-hx, y0, -hz), P(hx, y0, -hz), P(hx, y0, hz), P(-hx, y0, hz), [0, -1, 0], o.day || m, {ao: k0 * 0.7});
  }
  // Thanh nối hai điểm p1 → p2, tiết diện chữ nhật rộng w (ngang) × h (đứng / vuông góc): chân, tay, càng xe, xà cột điện
  thanh(p1, p2, w, h, m, o){
    o = o || {};
    const dx = p2[0]-p1[0], dy = p2[1]-p1[1], dz = p2[2]-p1[2], L = Math.hypot(dx, dy, dz) || 1, d = [dx/L, dy/L, dz/L];
    // trục ngang u vuông góc với thanh và nằm ngang; trục v vuông góc với cả hai
    let u = [-d[2], 0, d[0]]; const lu = Math.hypot(u[0], u[2]);
    if (lu < 1e-4) u = [0, 0, 1]; else { u[0] /= lu; u[2] /= lu; }
    const v = [d[1]*u[2] - d[2]*u[1], d[2]*u[0] - d[0]*u[2], d[0]*u[1] - d[1]*u[0]], a = w / 2, b = (h === undefined ? w : h) / 2;
    const C = (p, i, j) => [p[0] + u[0]*a*i + v[0]*b*j, p[1] + u[1]*a*i + v[1]*b*j, p[2] + u[2]*a*i + v[2]*b*j];
    const mat = (i0, j0, i1, j1, n) => this.tu(C(p1, i0, j0), C(p1, i1, j1), C(p2, i1, j1), C(p2, i0, j0), n, m, {ao: o.ao});
    mat(1, -1, 1, 1, u); mat(-1, 1, -1, -1, [-u[0], -u[1], -u[2]]); mat(1, 1, -1, 1, v); mat(-1, -1, 1, -1, [-v[0], -v[1], -v[2]]);
    if (!o.khongDau){ this.tu(C(p2, -1, -1), C(p2, 1, -1), C(p2, 1, 1), C(p2, -1, 1), d, m, {ao: o.ao});
      this.tu(C(p1, -1, -1), C(p1, 1, -1), C(p1, 1, 1), C(p1, -1, 1), [-d[0], -d[1], -d[2]], m, {ao: o.ao}); }
  }
  // Khối trụ / nón cụt đứng, mặt cong mịn: bán kính đáy r0, đỉnh r1, n cạnh; o.nap: có nắp trên · o.aoDay: che sáng ở chân
  tru(x, y0, z, r0, r1, cao, n, m, o){
    o = o || {};
    const doc = (r0 - r1) / (cao || 1), ln = Math.hypot(1, doc), k0 = o.aoDay === undefined ? 1 : o.aoDay;
    for (let i = 0; i < n; i++){
      const a0 = i / n * Math.PI*2, a1 = (i + 1) / n * Math.PI*2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const n0 = [c0/ln, doc/ln, s0/ln], n1 = [c1/ln, doc/ln, s1/ln], nm = [(c0 + c1)/2, doc, (s0 + s1)/2];
      if (r1 > 0) this.tu([x + c0*r0, y0, z + s0*r0], [x + c1*r0, y0, z + s1*r0], [x + c1*r1, y0 + cao, z + s1*r1], [x + c0*r1, y0 + cao, z + s0*r1], nm, m, {n4: [n0, n1, n1, n0], ao: [k0, k0, 1, 1], o: o.o});
      else this.tamGiac([x + c0*r0, y0, z + s0*r0], [x + c1*r0, y0, z + s1*r0], [x, y0 + cao, z], nm, m, {n3: [n0, n1, nm]});
      if (r1 > 0 && o.nap) this.tamGiac([x, y0 + cao, z], [x + c0*r1, y0 + cao, z + s0*r1], [x + c1*r1, y0 + cao, z + s1*r1], [0, 1, 0], o.mNap || m);
    }
  }
  // Khối cầu dẹt (elip) ít mặt, mặt cong mịn: tâm (cx, cy, cz), bán kính rx, ry, rz; o.n: số múi (mặc định 8), o.t: số tầng (4)
  // o.tu / o.den: chỉ lấy phần từ tầng tu đến tầng den (ví dụ nửa trên làm mũ bảo hiểm) · o.aoDuoi: che sáng nửa dưới (tán cây)
  cau(cx, cy, cz, rx, ry, rz, m, o){
    o = o || {};
    const n = o.n || 8, t = o.t || 4, t0 = o.tu || 0, t1 = o.den === undefined ? t : o.den, k = o.aoDuoi === undefined ? 1 : o.aoDuoi;
    const P = (i, j) => { const th = j / t * Math.PI, ph = i / n * Math.PI*2, st = Math.sin(th), nx = st*Math.cos(ph), ny = Math.cos(th), nz = st*Math.sin(ph);
      return {p: [cx + nx*rx, cy + ny*ry, cz + nz*rz], n: [nx, ny, nz], ao: k + (1 - k) * (ny * 0.5 + 0.5)}; };
    for (let j = t0; j < t1; j++) for (let i = 0; i < n; i++){
      const a = P(i, j + 1), b = P(i + 1, j + 1), c = P(i + 1, j), d = P(i, j), nm = [(a.n[0] + c.n[0])/2, (a.n[1] + c.n[1])/2, (a.n[2] + c.n[2])/2];
      if (j === 0) this.tamGiacAO(a, b, d, nm, m); else if (j === t - 1) this.tamGiacAO(d, c, a, nm, m);
      else this.tu(a.p, b.p, c.p, d.p, nm, m, {n4: [a.n, b.n, c.n, d.n], ao: [a.ao, b.ao, c.ao, d.ao]});
    }
  }
  tamGiacAO(a, b, c, n, m){   // tam giác với pháp tuyến và độ che sáng riêng từng đỉnh (dùng trong cau)
    const ux = b.p[0]-a.p[0], uy = b.p[1]-a.p[1], uz = b.p[2]-a.p[2], vx = c.p[0]-a.p[0], vy = c.p[1]-a.p[1], vz = c.p[2]-a.p[2];
    const thuan = (uy*vz - uz*vy)*n[0] + (uz*vx - ux*vz)*n[1] + (ux*vy - uy*vx)*n[2] >= 0, col = TP3.mau(m);
    const q = [a, b, c].map(v => this.dinh(v.p[0], v.p[1], v.p[2], v.n[0], v.n[1], v.n[2], col[0]*v.ao, col[1]*v.ao, col[2]*v.ao, TP3.TRANG[0], TP3.TRANG[1]));
    if (thuan) this.i.push(q[0], q[1], q[2]); else this.i.push(q[0], q[2], q[1]);
  }
  // Khối đùn: một hình phẳng khép kín trong mặt phẳng x–y (danh sách điểm [x, y]) đùn dọc trục z từ z0 đến z1.
  // Dùng cho thân xe nhìn ngang, bánh xe, thân người... Mặt quanh được làm mịn ở các góc thoải (dưới khoảng 50°).
  // o.mCanh: {số thứ tự cạnh: màu} (ví dụ cạnh kính chắn gió) · o.mDau: màu hai mặt đầu · o.khongDau: bỏ hai mặt đầu · o.ao
  dun(pts, z0, z1, m, o){
    o = o || {};
    const N = pts.length; let dt = 0;
    for (let i = 0; i < N; i++){ const p = pts[i], q = pts[(i + 1) % N]; dt += p[0]*q[1] - q[0]*p[1]; }
    const dau = dt > 0 ? 1 : -1, nc = [];   // pháp tuyến hướng ra ngoài của từng cạnh
    for (let i = 0; i < N; i++){ const p = pts[i], q = pts[(i + 1) % N], L = Math.hypot(q[0]-p[0], q[1]-p[1]) || 1; nc.push([(q[1]-p[1]) / L * dau, -(q[0]-p[0]) / L * dau]); }
    const nd = (i, e) => { const a = nc[e], b = nc[i === e ? (e + N - 1) % N : (e + 1) % N];   // pháp tuyến ở đỉnh i khi vẽ cạnh e
      if (a[0]*b[0] + a[1]*b[1] < 0.64) return [a[0], a[1], 0];
      const L = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1; return [(a[0] + b[0]) / L, (a[1] + b[1]) / L, 0]; };
    for (let e = 0; e < N; e++){
      const p = pts[e], q = pts[(e + 1) % N], np = nd(e, e), nq = nd((e + 1) % N, e);
      this.tu([p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1], [nc[e][0], nc[e][1], 0], (o.mCanh && o.mCanh[e]) || m, {n4: [np, nq, nq, np], ao: o.ao});
    }
    if (!o.khongDau) for (const [z, nz] of [[z0, z0 < z1 ? -1 : 1], [z1, z0 < z1 ? 1 : -1]]) this.daGiac(pts, z, nz, o.mDau || m, o);
  }
  // Đa giác phẳng trong mặt phẳng x–y tại z, quay mặt về phía nz (+1 hoặc −1): cửa kính bên hông xe, mặt đầu khối đùn
  daGiac(pts, z, nz, m, o){
    o = o || {};
    const col = TP3.mau(m), k = o.ao === undefined ? 1 : o.ao, V2 = pts.map(p => new T.Vector2(p[0], p[1]));
    const tg = T.ShapeUtils.triangulateShape(V2.slice(), []), i0 = this.so;
    for (const p of pts) this.dinh(p[0], p[1], z, 0, 0, nz, col[0]*k, col[1]*k, col[2]*k, TP3.TRANG[0], TP3.TRANG[1]);
    for (const f of tg){
      const a = pts[f[0]], b = pts[f[1]], c = pts[f[2]], cz = (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]);   // thành phần z của pháp tuyến tam giác
      // khung đặt có thể quay nhưng không lật gương, nên chiều quay trong hệ trục riêng vẫn đúng ngoài bản đồ
      if (cz * nz * TP3.CHIEU >= 0) this.i.push(i0 + f[0], i0 + f[1], i0 + f[2]); else this.i.push(i0 + f[0], i0 + f[2], i0 + f[1]);
    }
  }
  // Chép cả một Gom khác vào, đặt theo khung hiện hành (dat). mauNhan: nhân màu (ví dụ màu sơn riêng của từng xe dựng vỉa hè)
  chen(g, mauNhan){
    const c = this.kc, s = this.ks, k = this.kp, i0 = this.so, mn = mauNhan ? TP3.mau(mauNhan) : null;
    for (let j = 0; j < g.so; j++){
      const x = g.p[j*3], y = g.p[j*3+1], z = g.p[j*3+2], nx = g.n[j*3], nz = g.n[j*3+2];
      this.p.push(this.kx + (x*c - z*s)*k, this.ky + y*k, this.kz + (x*s + z*c)*k);
      this.n.push(nx*c - nz*s, g.n[j*3+1], nx*s + nz*c);
      if (mn) this.c.push(g.c[j*3]*mn[0], g.c[j*3+1]*mn[1], g.c[j*3+2]*mn[2]); else this.c.push(g.c[j*3], g.c[j*3+1], g.c[j*3+2]);
      this.uv.push(g.uv[j*2], g.uv[j*2+1]);
    }
    for (const q of g.i) this.i.push(i0 + q);
    this.so += g.so;
  }
  hinh(){
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(this.p), 3));
    g.setAttribute('normal', new T.BufferAttribute(new Float32Array(this.n), 3));
    g.setAttribute('color', new T.BufferAttribute(new Float32Array(this.c), 3));
    g.setAttribute('uv', new T.BufferAttribute(new Float32Array(this.uv), 2));
    g.setIndex(new T.BufferAttribute(this.so > 65535 ? new Uint32Array(this.i) : new Uint16Array(this.i), 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  get tamGiacSo(){ return this.i.length / 3; }
}
// Chiều quay của tam giác: với trục (X, Y lên, Z = y bản đồ), tam giác a→b→c trong mặt phẳng x–y có "z dương" khi nhìn từ phía +z là ngược chiều kim đồng hồ.
TP3.CHIEU = 1;
TP3.Gom = Gom;

/* ---------------------------------------------------------
   4. BẢNG ẢNH GHÉP: nhiều ảnh nhỏ vẽ bằng canvas xếp vào một ảnh lớn, để cả một ô bản đồ chỉ cần một lệnh vẽ.
   Ô trắng 16 × 16 ở góc trên trái dành cho hình không có ảnh (TP3.TRANG).
   --------------------------------------------------------- */
class BangAnh {
  constructor(rong, trongSuot){ this.rong = rong; this.ds = []; this.o = {}; this.trongSuot = !!trongSuot; }
  them(ten, w, h, ve){ if (!this.o[ten]){ this.o[ten] = {}; this.ds.push({ten, w, h, ve}); } return ten; }
  xep(){
    const R = this.rong, le = 2; let x = 20, y = 0, hHang = 20;
    const ds = this.ds.slice().sort((a, b) => b.h - a.h);
    for (const q of ds){ if (x + q.w + le > R){ x = 0; y += hHang + le; hHang = 0; } q.x = x; q.y = y; x += q.w + le; hHang = Math.max(hHang, q.h); }
    let C = 256; while (C < y + hHang) C *= 2;
    const c = TP3.taoCanvas(R, C), g = c.getContext('2d');
    if (!this.trongSuot){ g.fillStyle = '#808080'; g.fillRect(0, 0, R, C); }
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 18, 18);
    for (const q of ds){
      g.save(); g.translate(q.x, q.y); g.beginPath(); g.rect(0, 0, q.w, q.h); g.clip(); q.ve(g, q.w, q.h); g.restore();
      const l = 0.75;   // lùi vào một chút để khi ảnh thu nhỏ không lem sang ô bên cạnh
      Object.assign(this.o[q.ten], {u0: (q.x + l) / R, u1: (q.x + q.w - l) / R, v0: 1 - (q.y + q.h - l) / C, v1: 1 - (q.y + l) / C, w: q.w, h: q.h});
    }
    this.canvas = c; this.cao = C;
    return this;
  }
}
TP3.BangAnh = BangAnh;
// cắt một phần của ô ảnh: (a, b) theo chiều ngang, (c, d) theo chiều đứng, mỗi số từ 0 đến 1 (0, 0 = góc dưới trái)
TP3.catO = (o, a, b, c, d) => ({u0: o.u0 + (o.u1 - o.u0)*a, u1: o.u0 + (o.u1 - o.u0)*b, v0: o.v0 + (o.v1 - o.v0)*c, v1: o.v0 + (o.v1 - o.v0)*d});

/* ---------------------------------------------------------
   5. CÁC "LỚP" DỰNG CẢNH: mỗi file (duong, nha, bien, trang-tri) đăng ký một hàm dựng phần của mình cho MỘT Ô bản đồ.
   chinh.js gọi lần lượt các hàm này cho từng ô (dựng dần, ô gần xe trước), rồi gộp kết quả thành vài lưới của ô đó.
   ham(o, G): o = {i, j, x0, y0, x1, y1}; G = {duc: Gom hình đặc, trong: Gom hình có lỗ thủng (lan can, biển tròn),
              bong: Gom các tấm bóng mờ, day: [] toạ độ các đoạn dây điện, them: [] lưới riêng (mặt đất)}
   --------------------------------------------------------- */
TP3.lop = [];
TP3.themLop = (ten, ham) => TP3.lop.push({ten, ham});
TP3.khoiDong = [];   // các hàm chạy một lần trước khi dựng ô (tạo ảnh chất liệu, tính chỗ đặt cây, cột...)
// Tấm bóng mờ dán sát mặt đất dưới chân vật (cây, cột, xe dựng): tâm (x, z), nửa dài a theo góc g, nửa rộng b, độ đậm k
TP3.bongMo = (G, x, y, z, a, b, g, k) => {
  const c = Math.cos(g || 0), s = Math.sin(g || 0), P = (i, j) => [x + i*a*c - j*b*s, y, z + i*a*s + j*b*c], kk = k === undefined ? 1 : k;
  G.tu(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), [0, 1, 0], [kk, kk, kk], {uv: [[0, 0], [1, 0], [1, 1], [0, 1]]});
};
})();
