/* =========================================================
   Traffic Prune · thu-3d/ve-3d.js: BẢN THỬ 3D NẤC 2 (hình khối đơn giản) CHO KHU PHỐ CŨ
   Xem mục 10.1 của docs/THIET-KE.md. File này nạp SAU ../js/game.js và lib/three.r187.js.

   Nguyên tắc: "bộ não" của game (luật, bắt lỗi, xe NPC, chỉ đường, trợ lái, giao hàng, âm thanh, bảng thông tin)
   giữ nguyên từng dòng; file này chỉ thay phần vẽ ra màn hình bằng cách gán lại vài hàm toàn cục của game.js:
     render()  → góc 'nav' và 'bike' vẽ bằng 3D; góc 'map' gọi lại hàm vẽ 2D gốc
     resize()  → gọi hàm gốc rồi chỉnh thêm khung vẽ 3D
     newTrip() → chỉ nhận đơn ở các điểm giao trong khu phố cũ
     step()    → chỉ bọc lại để đo thời gian
   Những chỗ bộ não dính vào phần vẽ 2D được ghi ở mục "CHỖ DÍNH" gần cuối file.

   Toạ độ: bản đồ (x, y) với y hướng xuống → 3D là (X = x, Y = độ cao, Z = y). 4 đơn vị = 1 mét.
   Xe trong game vẽ to gấp đôi thật (xe máy dài 18 đơn vị) nên chiều cao người, xe, biển ở đây cũng lấy gấp đôi cho cân.
   ========================================================= */
'use strict';
(function(){
const T = window.THREE;
const baoLoi = chu => { const d = document.createElement('div'); d.id = 'loi3d'; d.textContent = chu; document.body.appendChild(d); };
if (!T){ baoLoi('Không nạp được thư viện 3D (lib/three.r187.js). Bản thử 3D không chạy được.'); return; }

/* ---------------------------------------------------------
   1. THAM SỐ
   --------------------------------------------------------- */
const thamSo = new URLSearchParams(location.search);
// ?q=thap|vua|cao: pr = tỉ lệ điểm ảnh tối đa; nen = số điểm ảnh của ảnh mặt đất cho mỗi đơn vị bản đồ; xa = tầm nhìn xa;
// rangCua = khử răng cưa; cay = có trồng cây; nhaXa = dựng cả nhà ngoài khu cũ (mờ trong sương)
const MUC = {
  thap: {pr: 1,   nen: 1,   xa: 800,  rangCua: false, cay: false, nhaXa: false},
  vua:  {pr: 1.5, nen: 1.5, xa: 1300, rangCua: true,  cay: true,  nhaXa: true},
  cao:  {pr: 2,   nen: 2,   xa: 2200, rangCua: true,  cay: true,  nhaXa: true}
};
const mucTen = MUC[thamSo.get('q')] ? thamSo.get('q') : 'vua';
const Q = MUC[mucTen];
const HIEN_DO = thamSo.get('do') !== '0';          // ô số đo: mặc định bật ở bản thử, ?do=0 để tắt
const KHU = {x0: 0, y0: 0, x1: 1600, y1: 1200};     // khu phố cũ (đơn giao hàng chỉ ở trong này)
const VUNG = {x0: -224, y0: -168, x1: 1824, y1: 1368};   // vùng dựng 3D đầy đủ: khu cũ cộng một dải viền (2048 × 1536)
const CAO_VIA = 1.2;                                // vỉa hè nhô cao 1,2 đơn vị (0,3 m)
const TANG = 13;                                    // chiều cao một tầng nhà
const MAU = {troi: '#8ec5fb', chanTroi: '#dcebf2', co: NEN_MAU.co, duong: NEN_MAU.duong, bo: '#b9b2a3', cot: '#6a6d75'};
const trongVung = (x, y, le) => x >= VUNG.x0 - (le || 0) && x <= VUNG.x1 + (le || 0) && y >= VUNG.y0 - (le || 0) && y <= VUNG.y1 + (le || 0);
const trongKhu = (x, y) => x >= KHU.x0 && x <= KHU.x1 && y >= KHU.y0 && y <= KHU.y1;
const tDung0 = performance.now();

/* ---------------------------------------------------------
   2. CÔNG CỤ GỘP HÌNH (three.js bản gom không kèm BufferGeometryUtils nên tự viết)
   Mọi hình tĩnh gộp vào vài lưới lớn; độ sáng tối của từng mặt tính sẵn vào màu đỉnh, nên không cần đèn, không cần bóng đổ.
   --------------------------------------------------------- */
const khoMau = new Map();
function mau(m){   // màu dạng '#rrggbb' / 'rgb()' → [r, g, b] trong không gian màu tuyến tính của three.js
  let v = khoMau.get(m);
  if (!v){ const c = new T.Color(m); v = [c.r, c.g, c.b]; khoMau.set(m, v); }
  return v;
}
const NANG = (() => { const l = Math.hypot(0.45, 0.8, 0.3); return [0.45 / l, 0.8 / l, 0.3 / l]; })();   // hướng nắng
const doSang = (nx, ny, nz) => 0.6 + 0.4 * Math.max(0, Math.min(1, (nx*NANG[0] + ny*NANG[1] + nz*NANG[2]) * 0.75 + 0.3));

class Gom {
  constructor(coUV){ this.p = []; this.c = []; this.uv = coUV ? [] : null; this.i = []; this.n = 0; }
  dinh(x, y, z, r, g, b, u, v){ this.p.push(x, y, z); this.c.push(r, g, b); if (this.uv) this.uv.push(u || 0, v || 0); return this.n++; }
  // Tứ giác a, b, c, d (mỗi điểm [x, y, z]); n: pháp tuyến mặt (để chọn chiều quay và độ sáng); m: màu; uv: toạ độ ảnh của 4 đỉnh
  tu(a, b, c, d, n, m, uv, khongSang){
    const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
    const thuan = (uy*vz - uz*vy)*n[0] + (uz*vx - ux*vz)*n[1] + (ux*vy - uy*vx)*n[2] >= 0;
    const k = khongSang ? 1 : doSang(n[0], n[1], n[2]), col = mau(m), r = col[0]*k, g = col[1]*k, bl = col[2]*k;
    const q = [a, b, c, d].map((p, j) => this.dinh(p[0], p[1], p[2], r, g, bl, uv ? uv[j][0] : 0, uv ? uv[j][1] : 0));
    if (thuan) this.i.push(q[0], q[1], q[2], q[0], q[2], q[3]); else this.i.push(q[0], q[2], q[1], q[0], q[3], q[2]);
  }
  tamGiac(a, b, c, n, m){
    const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
    const thuan = (uy*vz - uz*vy)*n[0] + (uz*vx - ux*vz)*n[1] + (ux*vy - uy*vx)*n[2] >= 0;
    const k = doSang(n[0], n[1], n[2]), col = mau(m);
    const q = [a, b, c].map(p => this.dinh(p[0], p[1], p[2], col[0]*k, col[1]*k, col[2]*k));
    if (thuan) this.i.push(q[0], q[1], q[2]); else this.i.push(q[0], q[2], q[1]);
  }
  // Khối hộp: tâm đáy (x, z), đáy ở độ cao y0; dai theo hướng a (góc trên bản đồ), rong theo hướng vuông góc, cao lên trên
  // o.tren: màu mặt trên; o.truoc / o.sau: màu mặt đầu / đuôi; o.khongNoc: bỏ mặt trên
  hop(x, y0, z, dai, cao, rong, a, m, o){
    o = o || {};
    const c = Math.cos(a || 0), s = Math.sin(a || 0), hx = dai / 2, hz = rong / 2, y1 = y0 + cao;
    const P = (lx, y, lz) => [x + lx*c - lz*s, y, z + lx*s + lz*c];
    this.tu(P(hx, y0, -hz), P(hx, y0, hz), P(hx, y1, hz), P(hx, y1, -hz), [c, 0, s], o.truoc || m);
    this.tu(P(-hx, y0, hz), P(-hx, y0, -hz), P(-hx, y1, -hz), P(-hx, y1, hz), [-c, 0, -s], o.sau || m);
    this.tu(P(hx, y0, hz), P(-hx, y0, hz), P(-hx, y1, hz), P(hx, y1, hz), [-s, 0, c], o.ben || m);
    this.tu(P(-hx, y0, -hz), P(hx, y0, -hz), P(hx, y1, -hz), P(-hx, y1, -hz), [s, 0, -c], o.ben || m);
    if (!o.khongNoc) this.tu(P(-hx, y1, -hz), P(hx, y1, -hz), P(hx, y1, hz), P(-hx, y1, hz), [0, 1, 0], o.tren || m);
  }
  // Khối trụ / nón cụt đứng: bán kính đáy r0, bán kính đỉnh r1, n cạnh; có nắp trên nếu r1 > 0
  tru(x, y0, z, r0, r1, cao, n, m, mTren){
    for (let i = 0; i < n; i++){
      const a0 = i / n * Math.PI*2, a1 = (i + 1) / n * Math.PI*2, am = (a0 + a1) / 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), nn = [Math.cos(am), 0.25, Math.sin(am)];
      if (r1 > 0) this.tu([x + c0*r0, y0, z + s0*r0], [x + c1*r0, y0, z + s1*r0], [x + c1*r1, y0 + cao, z + s1*r1], [x + c0*r1, y0 + cao, z + s0*r1], nn, m);
      else this.tamGiac([x + c0*r0, y0, z + s0*r0], [x + c1*r0, y0, z + s1*r0], [x, y0 + cao, z], nn, m);
      if (r1 > 0) this.tamGiac([x, y0 + cao, z], [x + c0*r1, y0 + cao, z + s0*r1], [x + c1*r1, y0 + cao, z + s1*r1], [0, 1, 0], mTren || m);
    }
  }
  hinh(){
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(this.p), 3));
    g.setAttribute('color', new T.BufferAttribute(new Float32Array(this.c), 3));
    if (this.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(this.uv), 2));
    g.setIndex(new T.BufferAttribute(this.n > 65535 ? new Uint32Array(this.i) : new Uint16Array(this.i), 1));
    g.computeBoundingSphere();
    return g;
  }
  get tamGiacSo(){ return this.i.length / 3; }
}
const anhTuCanvas = (c, lap) => {
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  if (lap){ t.wrapS = t.wrapT = T.RepeatWrapping; }
  return t;
};
const taoCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const bam = (x, y, k) => { const v = Math.sin(x*12.9898 + y*78.233 + k*37.719) * 43758.5453; return v - Math.floor(v); };   // số "ngẫu nhiên" cố định theo vị trí

/* ---------------------------------------------------------
   3. KHUNG VẼ
   --------------------------------------------------------- */
const glCanvas = document.createElement('canvas'); glCanvas.id = 'gl3d';
const nhanCanvas = document.createElement('canvas'); nhanCanvas.id = 'nhan3d';
stage.appendChild(glCanvas); stage.appendChild(nhanCanvas);
const nctx = nhanCanvas.getContext('2d');
let renderer;
try { renderer = new T.WebGLRenderer({canvas: glCanvas, antialias: Q.rangCua, alpha: false, powerPreference: 'high-performance', stencil: false}); }
catch (e){ baoLoi('Máy này không bật được đồ họa 3D (WebGL). Bấm nút đổi góc nhìn để dùng kiểu bản đồ từ trên xuống.'); glCanvas.remove(); nhanCanvas.remove(); return; }
renderer.shadowMap.enabled = false;
const scene = new T.Scene();
scene.background = new T.Color(MAU.chanTroi);
scene.fog = new T.Fog(new T.Color(MAU.chanTroi), Q.xa * 0.42, Q.xa * 0.96);
const camera = new T.PerspectiveCamera(55, 1.6, 1, Q.xa);
const TT = {muc: mucTen};   // thông tin dựng cảnh, để báo cáo qua __T3D.thongTin

/* ---------------------------------------------------------
   4. MẶT ĐẤT: dùng lại veNen() của game vẽ nền khu cũ ra một ảnh, dán lên mặt phẳng.
   Vạch kẻ, ô đỗ, vạch người đi bộ, vòng xuyến vì thế đúng y bản 2D.
   --------------------------------------------------------- */
function taoAnhMatDat(){
  const toiDa = Math.min(4096, renderer.capabilities.maxTextureSize || 2048);
  const vw = VUNG.x1 - VUNG.x0, vh = VUNG.y1 - VUNG.y0, k = Math.min(Q.nen, toiDa / vw, toiDa / vh);
  const c = taoCanvas(Math.round(vw * k), Math.round(vh * k)), g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, -VUNG.x0 * k, -VUNG.y0 * k);
  veNen(g, MAP, {W, H, EXT, SIDE, box: {x0: VUNG.x0, y0: VUNG.y0, x1: VUNG.x1, y1: VUNG.y1}});
  // vạch kiểm tra màu cam ở chốt CSGT (bản 2D vẽ trong drawCSGT)
  g.strokeStyle = 'rgba(255,140,0,.8)'; g.lineWidth = 2.2; g.setLineDash([7, 6]); g.beginPath();
  for (const p of CSGT){ if (p.off) continue; g.moveTo(p.x - p.n.x*p.half, p.y - p.n.y*p.half); g.lineTo(p.x + p.n.x*p.half, p.y + p.n.y*p.half); }
  g.stroke(); g.setLineDash([]);
  const t = anhTuCanvas(c);
  t.anisotropy = Math.min(mucTen === 'thap' ? 2 : 4, renderer.capabilities.getMaxAnisotropy());
  TT.anhNen = c.width + '×' + c.height;
  return t;
}

/* Vỉa hè nhô cao: dò đường viền giữa "lòng đường" và "không phải lòng đường" bằng chính hàm MAP.classify() của game
   (lưới ô 8 đơn vị, chỗ đổi trạng thái thì chia đôi để tìm đúng mép), nối thành các vòng khép kín, rồi dựng mặt trên và thành bó vỉa.
   Cách này không cần biết đường thẳng hay cong, nên dùng được cho cả bản đồ sau này. */
function doVien(){
  const g = 8, nx = Math.round((VUNG.x1 - VUNG.x0) / g), ny = Math.round((VUNG.y1 - VUNG.y0) / g), rong = nx + 1;
  const cao = (x, y) => {   // true: chỗ nhô cao (vỉa hè, cỏ, đảo vòng xuyến, phố đi bộ)
    if (x <= VUNG.x0 + 0.01 || x >= VUNG.x1 - 0.01 || y <= VUNG.y0 + 0.01 || y >= VUNG.y1 - 0.01) return false;
    const t = MAP.classify(clamp(x, 0.5, W - 0.5), clamp(y, 0.5, H - 0.5)).t;   // ngoài mép bản đồ: coi như đường kéo dài thẳng ra
    return t === 'off' || t === 'island' || t === 'ped';
  };
  const o = new Uint8Array(rong * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) o[j*rong + i] = cao(VUNG.x0 + i*g, VUNG.y0 + j*g) ? 1 : 0;
  const diem = [], khoa = new Map();
  // điểm cắt trên cạnh lưới nối hai nút (i0, j0)-(i1, j1): chia đôi 10 lần
  const cat = (i0, j0, i1, j1) => {
    const kk = (j0*rong + i0) * 2 + (i0 === i1 ? 1 : 0);
    let id = khoa.get(kk); if (id !== undefined) return id;
    let ax = VUNG.x0 + i0*g, ay = VUNG.y0 + j0*g, bx = VUNG.x0 + i1*g, by = VUNG.y0 + j1*g;
    if (!o[j0*rong + i0]){ [ax, bx] = [bx, ax]; [ay, by] = [by, ay]; }   // a: phía cao, b: phía lòng đường
    for (let t = 0; t < 10; t++){ const mx = (ax + bx) / 2, my = (ay + by) / 2; if (cao(mx, my)){ ax = mx; ay = my; } else { bx = mx; by = my; } }
    id = diem.length; diem.push({x: (ax + bx) / 2, y: (ay + by) / 2}); khoa.set(kk, id); return id;
  };
  const ke = [];   // ke[id] = các điểm nối với điểm id
  const noi = (a, b) => { (ke[a] = ke[a] || []).push(b); (ke[b] = ke[b] || []).push(a); };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
    const a = o[j*rong + i], b = o[j*rong + i + 1], c = o[(j+1)*rong + i + 1], d = o[(j+1)*rong + i], ma = a | b << 1 | c << 2 | d << 3;
    if (ma === 0 || ma === 15) continue;
    const Tr = () => cat(i, j, i + 1, j), Ph = () => cat(i + 1, j, i + 1, j + 1), Du = () => cat(i, j + 1, i + 1, j + 1), Tr_ = () => cat(i, j, i, j + 1);
    switch (ma){
      case 1: case 14: noi(Tr_(), Tr()); break;
      case 2: case 13: noi(Tr(), Ph()); break;
      case 3: case 12: noi(Tr_(), Ph()); break;
      case 4: case 11: noi(Ph(), Du()); break;
      case 6: case 9: noi(Tr(), Du()); break;
      case 7: case 8: noi(Tr_(), Du()); break;
      case 5: noi(Tr_(), Tr()); noi(Ph(), Du()); break;
      case 10: noi(Tr(), Ph()); noi(Du(), Tr_()); break;
    }
  }
  // nối thành vòng
  const da = new Uint8Array(diem.length), vong = [];
  for (let s = 0; s < diem.length; s++){
    if (da[s] || !ke[s]) continue;
    const v = []; let truoc = -1, cur = s;
    while (cur !== undefined && !da[cur]){ da[cur] = 1; v.push(diem[cur]); const nxt = ke[cur][0] !== truoc ? ke[cur][0] : ke[cur][1]; truoc = cur; cur = nxt; }
    if (v.length >= 3) vong.push(v);
  }
  // bỏ các điểm thẳng hàng (mép đường thẳng chỉ cần hai đầu), giữ các điểm trên cung tròn
  const gon = v => {
    let doi = true;
    while (doi && v.length > 3){ doi = false;
      for (let i = 0; i < v.length && v.length > 3; i++){
        const p0 = v[(i + v.length - 1) % v.length], p1 = v[i], p2 = v[(i + 1) % v.length];
        const L = Math.hypot(p2.x - p0.x, p2.y - p0.y) || 1, lech = Math.abs((p1.x - p0.x)*(p2.y - p0.y) - (p1.y - p0.y)*(p2.x - p0.x)) / L;
        if (lech < 0.05){ v.splice(i, 1); i--; doi = true; }
      }
    }
    return v;
  };
  return {vong: vong.map(gon), cao};
}
function trongDaGiac(p, v){
  let trong = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++)
    if ((v[i].y > p.y) !== (v[j].y > p.y) && p.x < (v[j].x - v[i].x) * (p.y - v[i].y) / (v[j].y - v[i].y) + v[i].x) trong = !trong;
  return trong;
}

function dungMatDat(tinh){
  const anh = taoAnhMatDat();
  const P = [], UV = [], I = [];
  const uvCua = (x, y) => [(x - VUNG.x0) / (VUNG.x1 - VUNG.x0), 1 - (y - VUNG.y0) / (VUNG.y1 - VUNG.y0)];
  const dinh = (x, h, y) => { P.push(x, h, y); const u = uvCua(x, y); UV.push(u[0], u[1]); return P.length / 3 - 1; };
  // mặt phẳng lòng đường (độ cao 0), phủ cả vùng
  { const a = dinh(VUNG.x0, 0, VUNG.y0), b = dinh(VUNG.x1, 0, VUNG.y0), c = dinh(VUNG.x1, 0, VUNG.y1), d = dinh(VUNG.x0, 0, VUNG.y1); I.push(a, d, c, a, c, b); }
  // vỉa hè: mặt trên dùng chung ảnh mặt đất, thành bó vỉa màu đá
  const t0 = performance.now(), {vong, cao} = doVien();
  const sau = vong.map(v => vong.reduce((n, w) => n + (w !== v && trongDaGiac(v[0], w) ? 1 : 0), 0));   // vòng nằm trong mấy vòng khác
  let soTamGiac = 0, soThanh = 0;
  vong.forEach((v, iv) => {
    if (sau[iv] % 2 === 0){   // vòng ngoài của một mảng vỉa hè; các vòng nằm ngay bên trong nó là lỗ
      const lo = vong.filter((w, iw) => sau[iw] === sau[iv] + 1 && trongDaGiac(w[0], v));
      const V2 = a => a.map(p => new T.Vector2(p.x, p.y));
      const tatCa = v.concat(...lo), id0 = P.length / 3;
      for (const p of tatCa) dinh(p.x, CAO_VIA, p.y);
      for (const f of T.ShapeUtils.triangulateShape(V2(v), lo.map(V2))){
        const a = tatCa[f[0]], b = tatCa[f[1]], c = tatCa[f[2]];
        const ny = (b.y - a.y)*(c.x - a.x) - (b.x - a.x)*(c.y - a.y);   // thành phần Y của pháp tuyến: phải hướng lên
        if (ny >= 0) I.push(id0 + f[0], id0 + f[1], id0 + f[2]); else I.push(id0 + f[0], id0 + f[2], id0 + f[1]);
        soTamGiac++;
      }
    }
    // thành bó vỉa: mặt đứng quay về phía lòng đường
    for (let i = 0; i < v.length; i++){
      const p = v[i], q = v[(i + 1) % v.length], L = Math.hypot(q.x - p.x, q.y - p.y); if (L < 1e-6) continue;
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      if (mx < VUNG.x0 + 0.5 || mx > VUNG.x1 - 0.5 || my < VUNG.y0 + 0.5 || my > VUNG.y1 - 0.5) continue;   // mép vùng dựng: không cần thành
      let nx = (q.y - p.y) / L, ny = -(q.x - p.x) / L;
      if (cao(mx + nx*0.6, my + ny*0.6)){ nx = -nx; ny = -ny; }
      tinh.tu([p.x, 0, p.y], [q.x, 0, q.y], [q.x, CAO_VIA, q.y], [p.x, CAO_VIA, p.y], [nx, 0, ny], MAU.bo); soThanh++;
    }
  });
  TT.viaHe = {vong: vong.length, tamGiacMat: soTamGiac, thanhBo: soThanh, ms: Math.round(performance.now() - t0)};
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array(P), 3));
  g.setAttribute('uv', new T.BufferAttribute(new Float32Array(UV), 2));
  g.setIndex(I); g.computeBoundingSphere();
  const luoi = new T.Mesh(g, new T.MeshBasicMaterial({map: anh}));
  luoi.matrixAutoUpdate = false; scene.add(luoi);
  // Ngoài vùng dựng: mặt cỏ phẳng và dải đường trơn (không vạch), chìm dần vào sương
  const R = 4000, yCo = -0.6, yDuong = -0.3;
  tinh.tu([-R, yCo, -R], [W + R, yCo, -R], [W + R, yCo, H + R], [-R, yCo, H + R], [0, 1, 0], MAU.co, null, true);
  for (const r of MAP.roads){
    if (!r.veh) continue;
    const pts = r.pts.map(p => ({x: p.x, y: p.y})), n = pts.length;
    if (MAP.nodes[r.a].kind === 'end'){ pts[0].x -= r.dirA.x*EXT; pts[0].y -= r.dirA.y*EXT; }
    if (MAP.nodes[r.b].kind === 'end'){ pts[n-1].x -= r.dirB.x*EXT; pts[n-1].y -= r.dirB.y*EXT; }
    for (let i = 0; i + 1 < n; i++){
      const p = pts[i], q = pts[i+1], L = Math.hypot(q.x - p.x, q.y - p.y) || 1, vx = -(q.y - p.y) / L * r.half, vy = (q.x - p.x) / L * r.half;
      tinh.tu([p.x - vx, yDuong, p.y - vy], [q.x - vx, yDuong, q.y - vy], [q.x + vx, yDuong, q.y + vy], [p.x + vx, yDuong, p.y + vy], [0, 1, 0], MAU.duong, null, true);
    }
  }
  for (const rg of MAP.rings) if (!trongVung(rg.x, rg.y)) tinh.tru(rg.x, yDuong - 0.1, rg.y, rg.rOut, rg.rOut, 0.1, 20, MAU.duong);
}

/* ---------------------------------------------------------
   5. NHÀ: khối hộp có tường (ảnh ô cửa sổ lặp lại), màu theo màu nhà của bản 2D, cao 2–4 tầng
   --------------------------------------------------------- */
function dungNha(){
  const c = taoCanvas(64, 64), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#93a6ba'; g.fillRect(17, 13, 30, 33);                 // khung cửa
  g.fillStyle = '#5c7187'; g.fillRect(19, 15, 12, 29); g.fillRect(33, 15, 12, 29);   // hai cánh kính
  g.fillStyle = '#e9e4da'; g.fillRect(14, 46, 36, 4);                  // bệ cửa
  const anh = anhTuCanvas(c, true); anh.anisotropy = 2;
  const G = new Gom(true), TR = [0.04, 0.04];   // TR: điểm trắng trong ảnh, dùng cho mái
  let so = 0;
  for (const h of MAP.houses || []){
    const cx = h.x + h.w / 2, cy = h.y + h.h / 2, gan = trongVung(cx, cy, 40);
    if (!gan && !Q.nhaXa) continue;
    so++;
    const x0 = h.x, x1 = h.x + h.w, z0 = h.y, z1 = h.y + h.h, y0 = 0;
    if (h.stall){   // sạp chợ: thấp, mái bạt màu
      const y1 = CAO_VIA + 9, mai = ['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c'][h.awn];
      const uv0 = [TR, TR, TR, TR];
      G.tu([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], '#b9b2a6', uv0);
      G.tu([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], '#b9b2a6', uv0);
      G.tu([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], '#b9b2a6', uv0);
      G.tu([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], '#b9b2a6', uv0);
      for (let i = 0; i < 6; i++){ const a = x0 - 2 + i * (h.w + 4) / 6, b = a + (h.w + 4) / 6;   // mái bạt sọc màu / trắng
        G.tu([a, y1, z0 - 2], [b, y1, z0 - 2], [b, y1, z1 + 2], [a, y1, z1 + 2], [0, 1, 0], i % 2 ? '#ffffff' : mai, uv0); }
      continue;
    }
    const tang = gan ? 2 + Math.floor(bam(h.x, h.y, 5) * 3) : 2 + Math.floor(bam(h.x, h.y, 5) * 2), y1 = CAO_VIA + tang * TANG;
    const nu = Math.max(1, Math.round(h.w / 15)), nv = Math.max(1, Math.round(h.h / 15));
    const uvT = n => [[0, 0], [n, 0], [n, tang], [0, tang]];
    G.tu([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], h.color, uvT(nu));
    G.tu([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], h.color, uvT(nv));
    G.tu([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], h.color, uvT(nu));
    G.tu([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], h.color, uvT(nv));
    G.tu([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], h.dark, [TR, TR, TR, TR]);
    // gờ mái sáng màu cho nhìn từ trên bớt phẳng
    G.tu([x0 + 5, y1 + 0.05, z0 + 5], [x1 - 5, y1 + 0.05, z0 + 5], [x1 - 5, y1 + 0.05, z1 - 5], [x0 + 5, y1 + 0.05, z1 - 5], [0, 1, 0], h.color, [TR, TR, TR, TR]);
  }
  const luoi = new T.Mesh(G.hinh(), new T.MeshBasicMaterial({map: anh, vertexColors: true}));
  luoi.matrixAutoUpdate = false; scene.add(luoi);
  TT.nha = so;
}

/* ---------------------------------------------------------
   6. BIỂN BÁO: mặt biển vẽ bằng canvas, gom vào một ảnh chung; mỗi biển là một tấm phẳng đứng trên cột
   --------------------------------------------------------- */
const FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MUI_TEN = {trai: '←', thang: '↑', phai: '→'};
function taoAnhBien(ds){   // ds: [{ten, w, h, ve(g, w, h)}] → xếp vào một ảnh, trả về bảng toạ độ ảnh của từng biển
  const RONG = 1024; let x = 0, y = 0, hHang = 0;
  for (const o of ds){ if (x + o.w > RONG){ x = 0; y += hHang; hHang = 0; } o.x = x; o.y = y; x += o.w; hHang = Math.max(hHang, o.h); }
  let CAO = 256; while (CAO < y + hHang) CAO *= 2;
  const c = taoCanvas(RONG, CAO), g = c.getContext('2d'), o_ = {};
  for (const o of ds){
    g.save(); g.translate(o.x, o.y); g.beginPath(); g.rect(0, 0, o.w, o.h); g.clip(); o.ve(g, o.w, o.h); g.restore();
    const le = 1.5;   // lùi vào một chút để ảnh thu nhỏ không lem sang ô bên cạnh
    o_[o.ten] = {u0: (o.x + le) / RONG, u1: (o.x + o.w - le) / RONG, v0: 1 - (o.y + o.h - le) / CAO, v1: 1 - (o.y + le) / CAO};
  }
  const t = anhTuCanvas(c); t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  TT.anhBien = RONG + '×' + CAO;
  return {anh: t, o: o_};
}
const veTron = (g, r, m) => { g.fillStyle = m; g.beginPath(); g.arc(64, 64, r, 0, Math.PI*2); g.fill(); };
const MAT_BIEN = {
  // P.127 hạn chế tốc độ: viền đỏ, nền trắng, số đen
  tocDo: v => g => { veTron(g, 61, '#fff'); veTron(g, 57, '#e5484d'); veTron(g, 43, '#fff');
    g.fillStyle = '#111'; g.font = '800 54px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(v), 64, 67); },
  // W.225 trẻ em: tam giác vàng viền đỏ
  treEm: g => {
    const tg = (cx, top, r, m) => { g.fillStyle = m; g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + r, top + r*1.72); g.lineTo(cx - r, top + r*1.72); g.closePath(); g.fill(); };
    tg(64, 4, 62, '#e5484d'); tg(64, 24, 45, '#ffd43b'); g.fillStyle = '#222';
    for (const dx of [-15, 15]){ g.beginPath(); g.arc(64 + dx, 62, 7, 0, Math.PI*2); g.fill();
      g.beginPath(); g.moveTo(64 + dx, 68); g.lineTo(64 + dx - 10, 96); g.lineTo(64 + dx + 10, 96); g.closePath(); g.fill(); } },
  // R.303 nơi giao nhau chạy theo vòng xuyến: nền xanh, ba mũi tên vòng ngược chiều kim đồng hồ
  vongXuyen: g => { veTron(g, 61, '#fff'); veTron(g, 57, '#2f6fde'); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'butt';
    for (let i = 0; i < 3; i++){ const a0 = i * 2.094 + 0.5, a1 = a0 - 1.45;
      g.beginPath(); g.arc(64, 64, 30, a0, a1, true); g.stroke();
      const ex = 64 + Math.cos(a1)*30, ey = 64 + Math.sin(a1)*30, tx = Math.sin(a1), ty = -Math.cos(a1);   // đầu mũi tên, hướng ngược chiều kim đồng hồ
      g.beginPath(); g.moveTo(ex + tx*15, ey + ty*15); g.lineTo(ex + Math.cos(a1)*11, ey + Math.sin(a1)*11); g.lineTo(ex - Math.cos(a1)*11, ey - Math.sin(a1)*11); g.closePath(); g.fill(); } },
  // biển chỗ đỗ xe P
  doXe: g => { g.fillStyle = '#fff'; rr(g, 4, 4, 120, 120, 18); g.fill(); g.fillStyle = '#2f6fde'; rr(g, 10, 10, 108, 108, 14); g.fill();
    g.fillStyle = '#fff'; g.font = '700 86px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 64, 69); },
  // P.104 cấm xe máy, P.103a cấm ô tô: viền đỏ, nền trắng, hình đen, gạch chéo đỏ
  cam: loai => g => { veTron(g, 61, '#fff'); veTron(g, 57, '#e5484d'); veTron(g, 43, '#fff'); g.fillStyle = '#222'; g.strokeStyle = '#222';
    if (loai === 'xe-may'){
      g.beginPath(); g.arc(68, 40, 8, 0, Math.PI*2); g.fill();
      g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(66, 50); g.lineTo(58, 68); g.moveTo(66, 54); g.lineTo(82, 64); g.stroke();
      g.lineWidth = 6; g.beginPath(); g.arc(42, 82, 11, 0, Math.PI*2); g.moveTo(97, 82); g.arc(86, 82, 11, 0, Math.PI*2); g.stroke();
      g.beginPath(); g.moveTo(42, 82); g.lineTo(56, 68); g.lineTo(82, 68); g.lineTo(86, 82); g.stroke();
    } else {
      rr(g, 30, 60, 68, 26, 8); g.fill(); rr(g, 44, 42, 38, 24, 8); g.fill();
      g.beginPath(); g.arc(46, 88, 9, 0, Math.PI*2); g.arc(82, 88, 9, 0, Math.PI*2); g.fill();
    }
    g.strokeStyle = '#e5484d'; g.lineWidth = 10; g.lineCap = 'butt'; g.beginPath(); g.moveTo(32, 32); g.lineTo(96, 96); g.stroke(); },
  lungTron: g => { veTron(g, 61, '#8d9199'); },
  lungTamGiac: g => { g.fillStyle = '#8d9199'; g.beginPath(); g.moveTo(64, 4); g.lineTo(126, 111); g.lineTo(2, 111); g.closePath(); g.fill(); },
  lungVuong: g => { g.fillStyle = '#8d9199'; g.fillRect(0, 0, 128, 128); },
  // biển chỉ dẫn hướng đi: nền xanh, mũi tên và tên đường
  chiDan: rows => (g, w, h) => {
    g.fillStyle = '#fff'; rr(g, 2, 2, w - 4, h - 4, 12); g.fill(); g.fillStyle = '#1b6fb8'; rr(g, 6, 6, w - 12, h - 12, 9); g.fill();
    g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left';
    rows.forEach((r, i) => { const y = 12 + 38 * (i + 0.5);
      g.font = '700 30px ' + FONT; g.fillText(MUI_TEN[r.k], 14, y);
      let co = 25; g.font = '700 ' + co + 'px ' + FONT;
      while (co > 12 && g.measureText(r.name).width > w - 66){ co--; g.font = '700 ' + co + 'px ' + FONT; }
      g.fillText(r.name, 52, y + 1); });
  }
};
// chiều xe đi của làn đường sát một điểm trên vỉa hè (biển đặt bên phải theo chiều đi nên suy ra được mặt biển quay về đâu)
function chieuDiGan(x, y){
  let tot = null;
  for (const r of MAP.roads){ if (!r.veh) continue;
    for (const g of r.seg){
      const t = Math.max(0, Math.min(g.l, (x - g.p.x)*g.d.x + (y - g.p.y)*g.d.y)), d = Math.hypot(x - g.p.x - g.d.x*t, y - g.p.y - g.d.y*t);
      if (!tot || d < tot.d) tot = {d, dir: g.d, lat: -(x - g.p.x)*g.d.y + (y - g.p.y)*g.d.x};
    } }
  const k = tot.lat > 0 ? 1 : -1;
  return {x: tot.dir.x * k, y: tot.dir.y * k};
}
function dungBienBao(tinh){
  const dsAnh = [], daCo = {}, can = (ten, w, h, ve) => { if (!daCo[ten]){ daCo[ten] = 1; dsAnh.push({ten, w, h, ve}); } return ten; };
  const tam = [];   // các tấm biển: {x, y, cao (tâm), w, h, n (hướng mặt), ten, lung}
  const y0 = CAO_VIA;
  const cot = (x, y, cao) => tinh.hop(x, y0, y, 0.7, cao, 0.7, 0, MAU.cot);
  // biển tốc độ và biển trẻ em
  for (const sp of SPEED_SIGNS){ if (!trongVung(sp.x, sp.y)) continue;
    const d = chieuDiGan(sp.x, sp.y), n = {x: -d.x, y: -d.y};
    if (sp.kind === 'limit'){ cot(sp.x, sp.y, 13); tam.push({x: sp.x, y: sp.y, cao: y0 + 15, w: 8, h: 8, n, ten: can('td' + sp.v, 128, 128, MAT_BIEN.tocDo(sp.v)), lung: can('lungTron', 128, 128, MAT_BIEN.lungTron)}); }
    else { cot(sp.x, sp.y, 12); tam.push({x: sp.x, y: sp.y, cao: y0 + 15, w: 9.6, h: 9.6, n, ten: can('treEm', 128, 128, MAT_BIEN.treEm), lung: can('lungTamGiac', 128, 128, MAT_BIEN.lungTamGiac)}); }
  }
  // biển chỉ dẫn hướng đi
  for (const sb of SIGNBOARDS){ if (!trongVung(sb.x, sb.y)) continue;
    const d = chieuDiGan(sb.x, sb.y), n = {x: -d.x, y: -d.y}, hpx = sb.rows.length * 38 + 24, w = 23, h = w * hpx / 256;
    const ten = can('cd:' + sb.rows.map(r => r.k + r.name).join('|'), 256, hpx, MAT_BIEN.chiDan(sb.rows));
    cot(sb.x, sb.y, 13); tam.push({x: sb.x, y: sb.y, cao: y0 + 13 + h / 2, w, h, n, ten, lung: can('lungVuong', 128, 128, MAT_BIEN.lungVuong)});
  }
  // biển vòng xuyến trước mỗi cửa vào
  for (const p of trangTri.bienVong){ if (!trongVung(p.x, p.y)) continue;
    const d = chieuDiGan(p.x, p.y);
    cot(p.x, p.y, 13); tam.push({x: p.x, y: p.y, cao: y0 + 15, w: 8, h: 8, n: {x: -d.x, y: -d.y}, ten: can('vong', 128, 128, MAT_BIEN.vongXuyen), lung: can('lungTron', 128, 128, MAT_BIEN.lungTron)});
  }
  // biển P ở đầu mỗi ô đỗ, quay về phía xe đang tới trên làn đó
  BAYS.forEach((b, i) => { const p = trangTri.bienP[i]; if (!p || !trongVung(p.x, p.y)) return;
    cot(p.x, p.y, 10); tam.push({x: p.x, y: p.y, cao: y0 + 12, w: 5.8, h: 5.8, n: {x: -b.dir.x, y: -b.dir.y}, ten: can('P', 128, 128, MAT_BIEN.doXe), lung: can('lungVuong', 128, 128, MAT_BIEN.lungVuong)});
  });
  // biển cấm xe máy, cấm ô tô ở hai đầu phố đi bộ: quay dọc theo đường xe chạy ngang qua, xem được từ cả hai chiều
  for (const b of trangTri.bienDiBo){ if (!trongVung(b.x, b.y)) continue;
    let nut = null;
    for (const id in MAP.nodes){ const nd = MAP.nodes[id]; if (!nd.arms.some(a => !a.road.veh)) continue;
      if (!nut || Math.hypot(nd.x - b.x, nd.y - b.y) < Math.hypot(nut.x - b.x, nut.y - b.y)) nut = nd; }
    const va = nut && nut.arms.find(a => a.road.veh), u = va ? va.out : {x: 1, y: 0}, ten = can('cam-' + b.icon, 128, 128, MAT_BIEN.cam(b.icon));
    cot(b.x, b.y, 13); tam.push({x: b.x, y: b.y, cao: y0 + 15, w: 8, h: 8, n: {x: u.x, y: u.y}, ten, lung: ten});
  }
  // gom ảnh và dựng các tấm
  const {anh, o} = taoAnhBien(dsAnh), G = new Gom(true);
  for (const t of tam){
    const N = [t.n.x, 0, t.n.y], Rx = t.n.y, Rz = -t.n.x, hw = t.w / 2, hh = t.h / 2;   // R: bên phải của người đứng trước mặt biển
    for (const mat of [1, -1]){
      const q = o[mat > 0 ? t.ten : t.lung], k = mat, e = 0.42 * mat;   // mặt sau lệch ra sau cột một chút
      const cx = t.x + N[0]*e, cz = t.y + N[2]*e;
      G.tu([cx - Rx*hw*k, t.cao - hh, cz - Rz*hw*k], [cx + Rx*hw*k, t.cao - hh, cz + Rz*hw*k], [cx + Rx*hw*k, t.cao + hh, cz + Rz*hw*k], [cx - Rx*hw*k, t.cao + hh, cz - Rz*hw*k],
        [N[0]*k, 0, N[2]*k], '#ffffff', [[q.u0, q.v0], [q.u1, q.v0], [q.u1, q.v1], [q.u0, q.v1]], true);
    }
  }
  const luoi = new T.Mesh(G.hinh(), new T.MeshBasicMaterial({map: anh, vertexColors: true, alphaTest: 0.5, transparent: false}));
  luoi.matrixAutoUpdate = false; scene.add(luoi);
  TT.bien = tam.length;
  return tam;
}

/* ---------------------------------------------------------
   7. ĐÈN TÍN HIỆU: cột ở góc bên phải mỗi nhánh (vị trí của game: trangTri.cotDen), hộp đèn quay về phía xe đang tới;
   thêm một hộp đèn nhắc lại cho nhánh đi tới từ bên trái cột (với họ, cột này nằm ở góc XA bên phải), để xe đứng ở vạch dừng
   nhìn thẳng vẫn thấy đèn của mình. Màu đèn lấy từ lightOf() thật của game.
   --------------------------------------------------------- */
const DEN = {ds: [], mauBat: {red: mau('#ff3b30'), yellow: mau('#ffc53d'), green: mau('#3ddc5a')}, mauTat: mau('#3b3b45'), luoi: null};
function dungDen(tinh){
  const P = [], C = [], I = [];
  const bongDen = (cx, cy, cz, N, r) => {   // hình tám cạnh quay mặt về hướng N
    const Rx = N.y, Rz = -N.x, i0 = P.length / 3;
    P.push(cx, cy, cz); C.push(0, 0, 0);
    for (let k = 0; k < 8; k++){ const a = k / 8 * Math.PI*2, u = Math.cos(a)*r, v = Math.sin(a)*r; P.push(cx + Rx*u, cy + v, cz + Rz*u); C.push(0, 0, 0); }
    for (let k = 0; k < 8; k++) I.push(i0, i0 + 1 + k, i0 + 1 + (k + 1) % 8);
    return i0;
  };
  const hopDen = (x, y, N, L, phase) => {
    const a = Math.atan2(N.y, N.x), bx = x + N.x*1.5, by = y + N.y*1.5, yDay = CAO_VIA + 15;
    tinh.hop(bx, yDay, by, 2.6, 10.4, 4, a, '#2b2a33');
    const d = {L, phase, tt: '', i: []};
    ['red', 'yellow', 'green'].forEach((m, k) => d.i.push(bongDen(bx + N.x*1.36, yDay + 8.6 - k*3.4, by + N.y*1.36, N, 1.35)));
    DEN.ds.push(d);
  };
  MAP.stopLines.forEach((sl, i) => {
    const p = trangTri.cotDen[i]; if (!p || !trongVung(p.x, p.y)) return;
    tinh.hop(p.x, CAO_VIA, p.y, 0.9, 15, 0.9, 0, MAU.cot);
    tinh.hop(p.x, CAO_VIA + 25.4, p.y, 3.4, 1.8, 2.4, Math.atan2(-sl.d.y, -sl.d.x), '#3a4a5c');   // camera phạt nguội trên đỉnh cột
    hopDen(p.x, p.y, {x: -sl.d.x, y: -sl.d.y}, sl.L, sl.phase);
    // đèn nhắc lại cho nhánh có chiều đi vuông góc bên phải (với nhánh đó, cột này ở góc xa bên phải)
    const dx = -sl.d.y, dy = sl.d.x, kia = MAP.stopLines.find(o => o.node === sl.node && o.d.x*dx + o.d.y*dy > 0.9);
    if (kia) hopDen(p.x, p.y, {x: -kia.d.x, y: -kia.d.y}, kia.L, kia.phase);
  });
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array(P), 3));
  const mauDinh = new T.BufferAttribute(new Float32Array(C), 3); mauDinh.setUsage(T.DynamicDrawUsage);
  g.setAttribute('color', mauDinh); g.setIndex(I); g.computeBoundingSphere();
  DEN.luoi = new T.Mesh(g, new T.MeshBasicMaterial({vertexColors: true, fog: false}));
  DEN.luoi.matrixAutoUpdate = false; scene.add(DEN.luoi);
  TT.hopDen = DEN.ds.length;
}
function capNhatDen(){
  const arr = DEN.luoi.geometry.attributes.color.array; let doi = false;
  for (const d of DEN.ds){
    const tt = lightOf(d.L, d.phase, S.now); if (tt === d.tt) continue;
    d.tt = tt; doi = true;
    ['red', 'yellow', 'green'].forEach((m, k) => { const c = tt === m ? DEN.mauBat[m] : DEN.mauTat;
      for (let j = 0; j < 9; j++){ const q = (d.i[k] + j) * 3, s = j === 0 || tt !== m ? 1 : 0.8; arr[q] = c[0]*s; arr[q+1] = c[1]*s; arr[q+2] = c[2]*s; } });
  }
  if (doi) DEN.luoi.geometry.attributes.color.needsUpdate = true;
}

/* ---------------------------------------------------------
   8. CHỐT CSGT, ĐẢO VÒNG XUYẾN, CÂY
   --------------------------------------------------------- */
function dungChotVaDao(tinh){
  for (const p of CSGT){ if (p.off || !trongVung(p.x, p.y)) continue;
    const a = Math.atan2(p.d.y, p.d.x), c = p.cabinPt;
    tinh.hop(c.x, CAO_VIA, c.y, 10, 11, 10, a, '#2f6fde');
    tinh.hop(c.x, CAO_VIA + 6, c.y, 10.3, 1.6, 10.3, a, '#ffffff');
    tinh.hop(c.x, CAO_VIA + 11, c.y, 12.5, 1.4, 12.5, a, '#ffd43b');
    // chú CSGT áo vàng đứng giữa chòi và mép đường
    const ox = c.x - p.n.x*8 + p.d.x*3, oy = c.y - p.n.y*8 + p.d.y*3;
    tinh.hop(ox, CAO_VIA, oy, 2.4, 3.2, 3, a, '#4a5568'); tinh.hop(ox, CAO_VIA + 3.2, oy, 2.4, 3.4, 3.4, a, '#d9d36a');
    tinh.hop(ox, CAO_VIA + 6.7, oy, 2.2, 2.2, 2.2, a, '#f1c9a5'); tinh.hop(ox, CAO_VIA + 8.9, oy, 2.8, 0.7, 2.8, a, '#d9d36a');
    // cọc tiêu dọc vạch kiểm tra, sát mép đường phía chòi
    for (const k of [6, 16, 26]){ const x = p.x + p.n.x*(p.half - k), y = p.y + p.n.y*(p.half - k);
      tinh.hop(x, 0, y, 3.4, 0.4, 3.4, a, '#ff7a1a'); tinh.tru(x, 0.4, y, 1.4, 0.35, 2.2, 6, '#ff7a1a'); tinh.tru(x, 2.6, y, 0.95, 0.6, 1.1, 6, '#ffffff'); tinh.tru(x, 3.7, y, 0.6, 0, 1.6, 6, '#ff7a1a'); }
  }
  // đảo giữa vòng xuyến: bệ đá và cột trang trí (mặt cỏ, hoa đã có trong ảnh mặt đất)
  for (const g of MAP.rings){ if (!trongVung(g.x, g.y)) continue;
    tinh.tru(g.x, CAO_VIA, g.y, 14, 12, 2.2, 12, '#d8d2c4', '#2f9e6b');
    tinh.tru(g.x, CAO_VIA + 2.2, g.y, 2.4, 1.8, 15, 8, '#efe9dc'); tinh.tru(g.x, CAO_VIA + 17.2, g.y, 4, 0, 6, 8, '#ffb020');
  }
}
let CAY = null;
function dungCay(tranh){
  if (!Q.cay) return;
  const vt = [], gan = (x, y, ds, r) => ds.some(o => Math.hypot(o.x - x, o.y - y) < r);
  for (const r of MAP.roads){
    if (r.via || !r.veh) continue;
    const le = r.half + 13;
    for (let s = 46; s < r.len - 30; s += 62) for (const k of [-1, 1]){
      const p = MAP.pointAt(r, s + (k > 0 ? 0 : 27)), x = p.x - p.dir.y*le*k, y = p.y + p.dir.x*le*k;
      if (!trongVung(x, y, -6) || x < 4 || y < 4 || x > W - 4 || y > H - 4) continue;
      // cây phải đứng hẳn trên vỉa hè: chỗ đó và bốn phía cách 5 đơn vị đều không phải lòng đường, không chạm nhà, xa biển báo
      if ([[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5]].some(([dx, dy]) => MAP.classify(x + dx, y + dy).t !== 'off')) continue;
      if (hitsHouse(x, y, 5) || gan(x, y, tranh, 30) || gan(x, y, vt, 30)) continue;
      vt.push({x, y});
    }
  }
  const G = new Gom(false);
  G.tru(0, 0, 0, 0.9, 0.7, 13, 5, '#8a6a4a');
  G.tru(0, 11.5, 0, 5.2, 7, 5, 7, '#ffffff'); G.tru(0, 16.5, 0, 7, 5.6, 4.5, 7, '#ffffff'); G.tru(0, 21, 0, 5.6, 0, 5.5, 7, '#ffffff');
  // thân cây giữ màu nâu: màu từng cây chỉ nhân vào tán (đỉnh trắng), nên chỉnh thân cho sẫm sẵn
  CAY = new T.InstancedMesh(G.hinh(), new T.MeshBasicMaterial({vertexColors: true}), vt.length);
  const m = new T.Matrix4(), c = new T.Color(), XANH = ['#5fae5a', '#4f9f58', '#74b860', '#3f9a6a', '#86c06a'];
  vt.forEach((p, i) => { const s = 0.85 + bam(p.x, p.y, 3) * 0.4;
    m.makeScale(s, s, s); m.setPosition(p.x, CAO_VIA, p.y); CAY.setMatrixAt(i, m);
    CAY.setColorAt(i, c.set(XANH[Math.floor(bam(p.x, p.y, 4) * XANH.length)])); });
  CAY.instanceMatrix.needsUpdate = true; CAY.matrixAutoUpdate = false; CAY.computeBoundingSphere();
  scene.add(CAY);
  TT.cay = vt.length;
}

/* ---------------------------------------------------------
   9. XE VÀ NGƯỜI (vật động): mỗi loại một InstancedMesh, mỗi khung hình chỉ đổi vị trí, hướng, màu
   Hình mẫu dựng trong hệ trục riêng: x hướng tới trước, z sang phải, y lên trên.
   --------------------------------------------------------- */
const BONG = '#454a57';   // "bóng" giả: một tấm sẫm dán sát mặt đường dưới gầm xe (không phải bóng đổ thật)
function hinhXeMay(G, coThung, m){
  m = m || {than: '#ffffff', ao: '#d9dde6'};   // xe NPC: thân trắng để nhận màu riêng của từng xe
  G.tu([-8, 0.12, -3.4], [8, 0.12, -3.4], [8, 0.12, 3.4], [-8, 0.12, 3.4], [0, 1, 0], BONG, null, true);
  G.hop(5.6, 0, 0, 4.4, 4.2, 1.3, 0, '#22222a'); G.hop(-5.6, 0, 0, 4.4, 4.2, 1.3, 0, '#22222a');   // hai bánh
  G.hop(0, 2.2, 0, 10.5, 2.6, 2.8, 0, m.than);                                                   // thân xe (nhận màu từng xe)
  G.hop(4.6, 4.8, 0, 1.6, 2.4, 2.2, 0, m.than, {truoc: '#fff6cc'});                              // đầu xe và đèn pha
  G.hop(4.4, 7.2, 0, 0.8, 0.7, 5.6, 0, '#22222a');                                                  // ghi đông
  G.hop(-1.6, 4.8, 0, 4.4, 1, 2.6, 0, '#33333d');                                                   // yên
  G.hop(-1.2, 5.8, 0, 2.6, 5, 3.6, 0, m.ao);                                                   // thân người lái
  G.hop(1.2, 4.2, 1.9, 3.4, 1.5, 1.1, 0, '#4a5568'); G.hop(1.2, 4.2, -1.9, 3.4, 1.5, 1.1, 0, '#4a5568');   // hai chân
  if (coThung) G.hop(-6.4, 4.8, 0, 4.2, 4.2, 4.6, 0, '#c0703a');                                    // thùng giao hàng của shipper
}
function hinhMu(G){ G.hop(-0.9, 10.8, 0, 3, 2.6, 3, 0, '#ffffff'); }
function hinhXeBuyt(G){
  G.tu([-24, 0.12, -9], [24, 0.12, -9], [24, 0.12, 9], [-24, 0.12, 9], [0, 1, 0], BONG, null, true);
  G.hop(0, 1.6, 0, 46, 12.4, 16, 0, '#ffffff', {truoc: '#ffffff'});
  const kinh = '#5f7f9c';
  for (const z of [8.06, -8.06]) for (let i = 0; i < 5; i++){ const x = -18 + i*8.2 + 2.5;   // cửa kính hai bên
    G.tu([x - 3, 7, z], [x + 3, 7, z], [x + 3, 12, z], [x - 3, 12, z], [0, 0, z > 0 ? 1 : -1], kinh); }
  G.tu([23.06, 6.6, -7], [23.06, 6.6, 7], [23.06, 12.4, 7], [23.06, 12.4, -7], [1, 0, 0], kinh);      // kính trước
  G.tu([23.08, 3, -7], [23.08, 3, -4.6], [23.08, 5, -4.6], [23.08, 5, -7], [1, 0, 0], '#fff6cc', null, true);
  G.tu([23.08, 3, 4.6], [23.08, 3, 7], [23.08, 5, 7], [23.08, 5, 4.6], [1, 0, 0], '#fff6cc', null, true);
  G.tu([-23.06, 7, -7], [-23.06, 7, 7], [-23.06, 12, 7], [-23.06, 12, -7], [-1, 0, 0], kinh);
  for (const x of [15, -14]) for (const z of [7.4, -7.4]) G.hop(x, 0, z, 5.6, 4.6, 1.6, 0, '#22222a');
}
function hinhNguoi(G){ G.hop(0, 0, 0, 2, 3.6, 2.8, 0, '#56617a'); G.hop(0, 3.6, 0, 2.2, 3.6, 3.4, 0, '#ffffff'); }
function hinhDauNguoi(G){ G.hop(0, 7.4, 0, 2.2, 2.2, 2.2, 0, '#f1c9a5'); G.hop(-0.2, 9.6, 0, 2.5, 0.7, 2.5, 0, '#3a2e2a'); }

const DONG = {};   // các lưới vật động
function taoLuoiLap(ve, so, coMau, coUV){
  const G = new Gom(false); ve(G);
  const l = new T.InstancedMesh(G.hinh(), new T.MeshBasicMaterial({vertexColors: true}), so);
  l.instanceMatrix.setUsage(T.DynamicDrawUsage); l.frustumCulled = false; l.matrixAutoUpdate = false; l.count = 0;
  if (coMau){ l.setColorAt(0, new T.Color(1, 1, 1)); l.instanceColor.setUsage(T.DynamicDrawUsage); }
  scene.add(l); return l;
}
// ghi ma trận "đặt tại (x, y0, z), quay theo góc bản đồ a" vào ô thứ i của một InstancedMesh
function datMaTran(arr, i, x, y0, z, a, k){   // k: phóng to / thu nhỏ theo chiều ngang (mặc định 1)
  k = k || 1;
  const c = Math.cos(a) * k, s = Math.sin(a) * k, o = i * 16;
  arr[o] = c; arr[o+1] = 0; arr[o+2] = s; arr[o+3] = 0;
  arr[o+4] = 0; arr[o+5] = 1; arr[o+6] = 0; arr[o+7] = 0;
  arr[o+8] = -s; arr[o+9] = 0; arr[o+10] = c; arr[o+11] = 0;
  arr[o+12] = x; arr[o+13] = y0; arr[o+14] = z; arr[o+15] = 1;
}
function dungVatDong(){
  DONG.xeMay = taoLuoiLap(G => hinhXeMay(G, false), Math.max(8, npcs.length), true);
  DONG.mu = taoLuoiLap(hinhMu, Math.max(8, npcs.length), true);
  DONG.mu.instanceMatrix = DONG.xeMay.instanceMatrix;   // mũ dùng chung vị trí với xe, chỉ khác màu
  DONG.xeBuyt = taoLuoiLap(hinhXeBuyt, 8, true);
  DONG.nguoi = taoLuoiLap(hinhNguoi, Math.max(8, peds.length), true);
  DONG.dau = taoLuoiLap(hinhDauNguoi, Math.max(8, peds.length), false);
  DONG.dau.instanceMatrix = DONG.nguoi.instanceMatrix;
  // vạch chỉ đường: các mũi tên dẹt màu xanh dán trên mặt đường
  { const g = new T.BufferGeometry(), y = 0.3;
    g.setAttribute('position', new T.BufferAttribute(new Float32Array([3, y, 0, -0.4, y, 2.9, -2.6, y, 2.9, 0.8, y, 0, -2.6, y, -2.9, -0.4, y, -2.9]), 3));
    g.setIndex([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]);
    DONG.chiDuong = new T.InstancedMesh(g, new T.MeshBasicMaterial({color: 0x347df6, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide}), 64);
    DONG.chiDuong.instanceMatrix.setUsage(T.DynamicDrawUsage); DONG.chiDuong.frustumCulled = false; DONG.chiDuong.matrixAutoUpdate = false; DONG.chiDuong.count = 0;
    DONG.chiDuong.renderOrder = 2; scene.add(DONG.chiDuong); }
  // ô đích: tấm xanh nhấp nháy phủ lên ô đỗ và một mốc hình thoi lơ lửng phía trên cho dễ thấy từ xa
  { const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array([-0.5, 0.22, -0.5, 0.5, 0.22, -0.5, 0.5, 0.22, 0.5, -0.5, 0.22, 0.5]), 3));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    DONG.oDich = new T.Mesh(g, new T.MeshBasicMaterial({color: 0x2fc878, transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide}));
    DONG.oDich.frustumCulled = false; DONG.oDich.renderOrder = 1; scene.add(DONG.oDich);
    const G = new Gom(false); G.tru(0, 0, 0, 0.01, 3.4, 5, 4, '#2fc878'); G.tru(0, 5, 0, 3.4, 0, 2.6, 4, '#49e294');
    DONG.moc = new T.Mesh(G.hinh(), new T.MeshBasicMaterial({vertexColors: true, fog: false})); DONG.moc.frustumCulled = false; scene.add(DONG.moc); }
  // xe của người chơi
  { const G = new Gom(false); hinhXeMay(G, true, {than: '#ff8a3d', ao: '#ffb27a'});
    const than = new T.Mesh(G.hinh(), new T.MeshBasicMaterial({vertexColors: true}));
    const Gm = new Gom(false); hinhMu(Gm);
    const mu = new T.Mesh(Gm.hinh(), new T.MeshBasicMaterial({vertexColors: true}));
    const nhom = new T.Group(); nhom.add(than); nhom.add(mu);
    const nhay = [-1, 1].map(k => { const Gx = new Gom(false);
      Gx.hop(4.9, 5.4, k*2.3, 1.2, 1.2, 1.4, 0, '#ffae00'); Gx.hop(-6.6, 5.2, k*2.6, 1.2, 1.2, 1.4, 0, '#ffae00');
      const l = new T.Mesh(Gx.hinh(), new T.MeshBasicMaterial({vertexColors: true, fog: false})); nhom.add(l); return l; });
    scene.add(nhom); DONG.xeToi = {nhom, mu, nhay}; }
  // ô tô của người chơi: thân dưới (có nắp capo), buồng lái (ẩn khi nhìn từ sau vô lăng), mặt táp-lô (chỉ hiện khi nhìn từ sau vô lăng)
  { const cam = '#ff8a3d', G = new Gom(false);
    G.tu([-11, 0.12, -6], [11, 0.12, -6], [11, 0.12, 6], [-11, 0.12, 6], [0, 1, 0], BONG, null, true);
    G.hop(0, 1.3, 0, 20, 2.2, 10, 0, cam, {khongNoc: true});                 // thân dưới
    G.hop(-3.5, 3.5, 0, 13, 1.1, 10, 0, cam, {tren: '#ff9a52'});              // phần thân dưới buồng lái và cốp
    G.tu([3, 4.6, -5], [10, 3.5, -5], [10, 3.5, 5], [3, 4.6, 5], [0.15, 1, 0], '#ff9a52');   // nắp capo dốc xuống phía trước
    G.tamGiac([3, 3.5, 5], [10, 3.5, 5], [3, 4.6, 5], [0, 0, 1], cam); G.tamGiac([3, 3.5, -5], [10, 3.5, -5], [3, 4.6, -5], [0, 0, -1], cam);
    G.hop(4.2, 4.3, 5.4, 0.8, 0.9, 1.4, 0, '#2b2a33'); G.hop(4.2, 4.3, -5.4, 0.8, 0.9, 1.4, 0, '#2b2a33');   // gương
    for (const x of [6.2, -6.2]) for (const z of [4.7, -4.7]) G.hop(x, 0, z, 4.4, 3.4, 1.3, 0, '#22222a');
    for (const z of [3.4, -3.4]){ G.tu([10.04, 2.1, z - 1.2], [10.04, 2.1, z + 1.2], [10.04, 3.2, z + 1.2], [10.04, 3.2, z - 1.2], [1, 0, 0], '#fff6cc', null, true);
      G.tu([-10.04, 2.6, z - 1.2], [-10.04, 2.6, z + 1.2], [-10.04, 4, z + 1.2], [-10.04, 4, z - 1.2], [-1, 0, 0], '#e5484d', null, true); }
    const than = new T.Mesh(G.hinh(), new T.MeshBasicMaterial({vertexColors: true}));
    const Gb = new Gom(false);
    Gb.hop(-2, 4.6, 0, 10.4, 3, 8.8, 0, '#8fbfe0', {khongNoc: true}); Gb.hop(-2, 7.6, 0, 10.8, 0.5, 9.2, 0, '#ffb47a');
    const buong = new T.Mesh(Gb.hinh(), new T.MeshBasicMaterial({vertexColors: true}));
    const Gt = new Gom(false); Gt.hop(3.4, 3.5, 0, 0.9, 2.2, 10, 0, '#26252d');   // mặt táp-lô: che phần gần của nắp capo như trong xe thật
    const tapLo = new T.Mesh(Gt.hinh(), new T.MeshBasicMaterial({vertexColors: true}));
    const nhom = new T.Group(); nhom.add(than); nhom.add(buong); nhom.add(tapLo);
    const nhay = [-1, 1].map(k => { const Gx = new Gom(false);
      Gx.hop(9.6, 2.8, k*4.7, 1.2, 1.3, 1.1, 0, '#ffae00'); Gx.hop(-9.6, 2.8, k*4.7, 1.2, 1.3, 1.1, 0, '#ffae00');
      const l = new T.Mesh(Gx.hinh(), new T.MeshBasicMaterial({vertexColors: true, fog: false})); nhom.add(l); return l; });
    scene.add(nhom); DONG.oTo = {nhom, buong, tapLo, nhay}; }
  // vòm trời: nửa cầu đổi màu từ chân trời lên đỉnh, luôn đi theo máy quay
  { const g = new T.SphereGeometry(Q.xa * 0.9, 20, 8, 0, Math.PI*2, 0, Math.PI / 2), p = g.attributes.position, c = new Float32Array(p.count * 3);
    const a = new T.Color(MAU.chanTroi), b = new T.Color(MAU.troi);
    for (let i = 0; i < p.count; i++){ const t = Math.min(1, Math.max(0, p.getY(i) / (Q.xa * 0.9)) * 2.2), k = t * (2 - t);
      c[i*3] = a.r + (b.r - a.r)*k; c[i*3+1] = a.g + (b.g - a.g)*k; c[i*3+2] = a.b + (b.b - a.b)*k; }
    g.setAttribute('color', new T.BufferAttribute(c, 3));
    DONG.troi = new T.Mesh(g, new T.MeshBasicMaterial({vertexColors: true, side: T.BackSide, fog: false, depthWrite: false}));
    DONG.troi.frustumCulled = false; DONG.troi.renderOrder = -1; scene.add(DONG.troi); }
}

const mauNPC = n => n._m3 || (n._m3 = {than: mau(n.color), mu: mau(n.helmet)});
const mauNguoi = p => p._m3 || (p._m3 = mau(p.color));
function capNhatVatDong(dt){
  const tam = S.view === 'bike' ? Q.xa * 0.7 : Q.xa * 0.62, tam2 = tam * tam, px = player.x, py = player.y;
  // xe NPC
  { const mx = DONG.xeMay.instanceMatrix.array, cx = DONG.xeMay.instanceColor.array, cm = DONG.mu.instanceColor.array;
    const mb = DONG.xeBuyt.instanceMatrix.array, cb = DONG.xeBuyt.instanceColor.array;
    let nx = 0, nb = 0;
    for (const n of npcs){
      if (n.hidden) continue;
      const dx = n.x - px, dy = n.y - py; if (dx*dx + dy*dy > tam2) continue;
      const m = mauNPC(n), mo = n.ghostP > 0 || n.ghostT > 0 ? 1.5 : 1;   // xe đang "nhường xuyên qua" (bản 2D vẽ mờ) thì vẽ nhạt màu hơn
      if (n.kind === 'bus'){ if (nb >= 8) continue; datMaTran(mb, nb, n.x, 0, n.y, n.a); cb[nb*3] = m.than[0]*mo; cb[nb*3+1] = m.than[1]*mo; cb[nb*3+2] = m.than[2]*mo; nb++; }
      else { datMaTran(mx, nx, n.x, 0, n.y, n.a); cx[nx*3] = m.than[0]*mo; cx[nx*3+1] = m.than[1]*mo; cx[nx*3+2] = m.than[2]*mo;
        cm[nx*3] = m.mu[0]; cm[nx*3+1] = m.mu[1]; cm[nx*3+2] = m.mu[2]; nx++; }
    }
    DONG.xeMay.count = DONG.mu.count = nx; DONG.xeBuyt.count = nb;
    DONG.xeMay.instanceMatrix.needsUpdate = true; DONG.xeMay.instanceColor.needsUpdate = true; DONG.mu.instanceColor.needsUpdate = true;
    DONG.xeBuyt.instanceMatrix.needsUpdate = true; DONG.xeBuyt.instanceColor.needsUpdate = true;
    TT.xeVe = nx + nb;
  }
  // người đi bộ: hướng mặt suy ra từ chỗ vừa đứng (bộ não không lưu hướng của người đi bộ)
  { const mn = DONG.nguoi.instanceMatrix.array, cn = DONG.nguoi.instanceColor.array; let k = 0;
    for (const p of peds){
      const dx = p.x - px, dy = p.y - py; if (dx*dx + dy*dy > tam2 * 0.5) continue;
      if (p._x3 !== undefined){ const mx = p.x - p._x3, my = p.y - p._y3; if (mx*mx + my*my > 1e-4) p._a3 = Math.atan2(my, mx); }
      p._x3 = p.x; p._y3 = p.y;
      const duoiDuong = p.cross ? crossOnRoad(p) : false, m = mauNguoi(p);
      datMaTran(mn, k, p.x, duoiDuong ? 0 : CAO_VIA, p.y, p._a3 || 0); cn[k*3] = m[0]; cn[k*3+1] = m[1]; cn[k*3+2] = m[2]; k++;
    }
    DONG.nguoi.count = DONG.dau.count = k; DONG.nguoi.instanceMatrix.needsUpdate = true; DONG.nguoi.instanceColor.needsUpdate = true;
  }
  // xe của người chơi và đèn xi-nhan nháy
  { const car = S.veh === 'car', bike = S.view === 'bike', X = DONG.xeToi, O = DONG.oTo;
    X.nhom.visible = !car && !bike; O.nhom.visible = car;
    const nhom = car ? O.nhom : X.nhom;
    nhom.position.set(player.x, 0, player.y); nhom.rotation.y = -player.a;
    if (car){ O.buong.visible = !bike; O.tapLo.visible = bike; }
    else X.mu.material.color.set(S.helmet ? '#ffffff' : '#3a2e2a');   // đầu trần thì thấy tóc sẫm thay vì mũ trắng
    const nhay = (car ? O : X).nhay;
    nhay[0].visible = S.turn < 0 && S.blinkOn; nhay[1].visible = S.turn > 0 && S.blinkOn;
  }
  // vạch chỉ đường (dữ liệu của game: S.route.pts, như drawRoute của bản 2D)
  { const r = S.route, arr = DONG.chiDuong.instanceMatrix.array; let k = 0;
    if (r && r.pts.length > 1){
      const pts = [{x: player.x, y: player.y}].concat(r.pts.slice(1));
      const nho = S.view === 'bike' ? 0.62 : 1;   // nhìn từ sau tay lái mũi tên ở sát mắt nên vẽ nhỏ lại, bắt đầu xa hơn
      let acc = S.view === 'bike' ? 24 : 14, tong = 0;
      for (let i = 1; i < pts.length && k < 64 && tong < 760; i++){
        const a = pts[i-1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 0.01) continue;
        const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, g = Math.atan2(uy, ux);
        while (acc <= L && k < 64){ datMaTran(arr, k++, a.x + ux*acc, 0, a.y + uy*acc, g, nho); acc += 13; }
        acc -= L; tong += L;
      }
    }
    DONG.chiDuong.count = k; DONG.chiDuong.instanceMatrix.needsUpdate = true;
  }
  // ô đích nhấp nháy
  { const t = S.trip;
    DONG.oDich.visible = DONG.moc.visible = !!t;
    if (t){ const b = t.dest.bay, k = 0.5 + 0.5 * Math.sin(S.now * 5), a = Math.atan2(b.dir.y, b.dir.x);
      DONG.oDich.position.set(b.cx, 0, b.cy); DONG.oDich.rotation.y = -a; DONG.oDich.scale.set(b.L, 1, b.D);
      DONG.oDich.material.opacity = 0.3 + 0.35 * k;
      DONG.moc.position.set(b.cx + b.n.x*6, 20 + Math.sin(S.now * 2.4) * 1.6, b.cy + b.n.y*6); DONG.moc.rotation.y = S.now * 1.5; }
  }
}

/* ---------------------------------------------------------
   10. MÁY QUAY: hai góc nhìn 3D
   'nav'  (dẫn đường): sau và trên xe, nhìn theo hướng xe, quay theo xe mượt như bản 2D
   'bike' (sau tay lái / sau vô lăng): đặt ở vị trí mắt người lái; ô tô thấy nắp capo, xe máy thấy ghi đông (lớp #cockpit của game)
   --------------------------------------------------------- */
let VW3 = 800, VH3 = 600, gocMay = player.a, nghieng = 0, gocTruoc = player.a;
const MAT = {bike: {cao: 9.9, lui: 1.4}, car: {cao: 6.9, lui: -2}};   // lui âm: mắt ở phía trước tâm xe
function datOngKinh(){
  const bike = S.view === 'bike', car = S.veh === 'car';
  // chừa phần dưới màn hình cho hàng nút cảm ứng (và cho bảng đồng hồ ở góc sau tay lái): tâm hình dồn lên trên, không méo hình
  // trên điện thoại còn chừa phần trên cho bảng chỉ đường và các ô thông tin
  const tren = isTouch ? Math.min(150, VH3 * 0.18) : 0, duoi = isTouch ? Math.min(190, VH3 * 0.25) : (bike ? (car ? 150 : 110) : 0);
  const caoThat = Math.max(120, VH3 - tren - duoi), tiLe = VW3 / caoThat;
  const ngang = (bike ? 70 : 60) * Math.PI / 180;   // góc nhìn ngang mong muốn
  camera.fov = clamp(2 * Math.atan(Math.tan(ngang / 2) / tiLe) * 180 / Math.PI, bike ? 56 : 48, 94);
  camera.aspect = tiLe; camera.near = bike ? 0.5 : 4; camera.far = Q.xa;
  if (tren || duoi) camera.setViewOffset(VW3, caoThat, 0, -tren, VW3, VH3); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
const _v = new T.Vector3();
function capNhatMayQuay(dt){
  const bike = S.view === 'bike', car = S.veh === 'car';
  // tốc độ quay đầu xe (để nghiêng máy quay theo xe máy khi ôm cua)
  const om = dt > 0 ? normA(player.a - gocTruoc) / dt : 0; gocTruoc = player.a;
  if (bike){
    gocMay = player.a;
    const m = car ? MAT.car : MAT.bike, c = Math.cos(gocMay), s = Math.sin(gocMay);
    const muon = car ? 0 : clamp(-om * 0.085, -0.16, 0.16) * Math.min(1, Math.abs(player.v) / 50);
    nghieng += (muon - nghieng) * Math.min(1, dt * 6);
    camera.position.set(player.x - c*m.lui, m.cao, player.y - s*m.lui);
    camera.up.set(0, 1, 0);
    camera.lookAt(player.x + c*100, m.cao - (car ? 9 : 11), player.y + s*100);
    if (nghieng) camera.rotateZ(nghieng);
  } else {
    gocMay = normA(gocMay + normA(player.a - gocMay) * Math.min(1, dt * 4.5));
    const c = Math.cos(gocMay), s = Math.sin(gocMay), doc = VW3 < VH3;   // màn hình dọc: lùi xa và cao hơn một chút
    const lui = doc ? 74 : 66, cao = doc ? 50 : 42, truoc = doc ? 44 : 40;
    camera.position.set(player.x - c*lui, cao, player.y - s*lui);
    camera.up.set(0, 1, 0);
    camera.lookAt(player.x + c*truoc, 3, player.y + s*truoc);
  }
  DONG.troi.position.set(camera.position.x, -2, camera.position.z);
}

/* ---------------------------------------------------------
   11. CHỮ NỔI: tên đường, tên điểm giao, tiền bay lên, 😤 💬 (bản 2D vẽ trong drawUprights bằng canvas 2D).
   Ở đây chiếu toạ độ 3D ra màn hình rồi viết lên một lớp canvas trong suốt nằm trên khung 3D.
   --------------------------------------------------------- */
const NHAN_TINH = [];
function gomNhanTinh(){
  for (const q of trangTri.nhanDuong) if (trongVung(q.x, q.y)) NHAN_TINH.push({x: q.x, y: q.y, cao: 9, t: q.t, o: {size: 12, bg: 'rgba(43,42,51,.62)', color: '#fff'}});
  NHAN_TINH.push({x: 925, y: 395, cao: 16, t: '🛒 CHỢ HOA SỮA', o: {size: 14, bold: true, color: '#b5482b'}});   // nhãn này bản 2D ghi cứng trong drawUprights
  for (const q of trangTri.nhanMep) if (trongVung(q.x, q.y)) NHAN_TINH.push({x: q.x, y: q.y, cao: 8, t: 'Hết khu chơi thử', o: {size: 11}});
  for (const q of trangTri.nhanDiBo) if (trongVung(q.x, q.y)) NHAN_TINH.push({x: q.x, y: q.y, cao: 20, t: 'PHỐ ĐI BỘ', o: {size: 12, bold: true, bg: '#1b6fb8', color: '#fff'}});
  for (const p of CSGT) if (!p.off && trongVung(p.x, p.y)) NHAN_TINH.push({x: p.cabinPt.x, y: p.cabinPt.y, cao: 19, t: '👮 CHỐT CSGT', o: {size: 12, bold: true, bg: '#2f6fde', color: '#fff'}});
}
let NPR = 1;
function chieu(x, cao, y){   // toạ độ bản đồ → điểm trên màn hình (null nếu ở sau lưng máy quay hoặc ngoài màn hình)
  _v.set(x, cao, y).project(camera);
  if (_v.z < -1 || _v.z > 1) return null;
  const sx = (_v.x * 0.5 + 0.5) * VW3, sy = (-_v.y * 0.5 + 0.5) * VH3;
  if (sx < -80 || sx > VW3 + 80 || sy < -30 || sy > VH3 + 30) return null;
  return {x: sx, y: sy};
}
function vietNhan(x, cao, y, text, opt, tamXa){
  const d = Math.hypot(x - camera.position.x, y - camera.position.z); if (d > tamXa) return;
  const p = chieu(x, cao, y); if (!p) return;
  const fs = (opt.size || 13) * clamp(170 / d, 0.72, 1.12);
  nctx.font = (opt.bold ? '700 ' : '600 ') + fs + 'px ' + FONT; nctx.textAlign = 'center'; nctx.textBaseline = 'middle';
  const w = nctx.measureText(text).width + fs * 1.1, h = fs * 1.7;
  nctx.globalAlpha = clamp((tamXa - d) / 80, 0, 1);
  if (opt.bg !== false){ nctx.fillStyle = opt.bg || 'rgba(255,250,242,.92)'; rr(nctx, p.x - w/2, p.y - h/2, w, h, h / 2.4); nctx.fill(); }
  nctx.fillStyle = opt.color || '#2b2a33'; nctx.fillText(text, p.x, p.y + fs * 0.06);
  nctx.globalAlpha = 1;
}
function veChuNoi(){
  nctx.setTransform(NPR, 0, 0, NPR, 0, 0); nctx.clearRect(0, 0, VW3, VH3);
  const bike = S.view === 'bike', xa = bike ? 430 : 600;
  for (const q of NHAN_TINH) vietNhan(q.x, q.cao, q.y, q.t, q.o, xa);
  // tên điểm giao (điểm đang giao tô xanh, thấy từ xa hơn)
  const cur = S.trip && S.trip.dest;
  for (const d of DESTS){
    if (d === cur) vietNhan(d.lx, 31, d.ly, '📍 ' + d.icon + ' ' + d.name, {size: 14, bold: true, bg: '#2f9e6b', color: '#fff'}, xa * 1.6);
    else if (trongVung(d.lx, d.ly)) vietNhan(d.lx, 12, d.ly, d.icon + ' ' + d.name, {size: 12}, xa * 0.8);
  }
  // người bị ảnh hưởng, người đang nói
  nctx.textAlign = 'center'; nctx.textBaseline = 'middle';
  for (const n of npcs){ if (n.hidden || n.affEp !== S.epId || S.now >= S.faultUntil + 2) continue;
    const p = chieu(n.x, n.kind === 'bus' ? 18 : 16, n.y); if (p){ nctx.font = '17px sans-serif'; nctx.fillText('😤', p.x, p.y); } }
  const b = S.bubble;
  if (b && b.speaker && b.speaker.x !== undefined && !b.speaker.follow){
    const p = chieu(b.speaker.x, 18, b.speaker.y); if (p){ nctx.font = '20px sans-serif'; nctx.fillText('💬', p.x, p.y); } }
  // số tiền bay lên
  for (const f of S.floats){
    const p = chieu(f.x, 14 + (f.rise || 0) * 0.6, f.y); if (!p) continue;
    nctx.globalAlpha = clamp(f.t, 0, 1); nctx.font = '700 15px ' + FONT;
    nctx.lineWidth = 3; nctx.strokeStyle = '#fff'; nctx.strokeText(f.text, p.x, p.y); nctx.fillStyle = f.color; nctx.fillText(f.text, p.x, p.y);
    nctx.globalAlpha = 1;
  }
}

/* ---------------------------------------------------------
   12. DỰNG CẢNH
   --------------------------------------------------------- */
function dungCanh(){
  const tinh = new Gom(false);
  dungMatDat(tinh);
  dungNha();
  const tam = dungBienBao(tinh);
  dungDen(tinh);
  dungChotVaDao(tinh);
  const luoi = new T.Mesh(tinh.hinh(), new T.MeshBasicMaterial({vertexColors: true}));
  luoi.matrixAutoUpdate = false; luoi.frustumCulled = false; scene.add(luoi);
  TT.tamGiacTinh = tinh.tamGiacSo;
  // cây tránh xa biển báo, cột đèn, chòi CSGT, nhãn điểm giao
  dungCay(tam.concat(trangTri.cotDen, CSGT.filter(p => !p.off).map(p => p.cabinPt), DESTS.map(d => ({x: d.lx, y: d.ly}))));
  dungVatDong();
  gomNhanTinh();
}

/* ---------------------------------------------------------
   13. CHỖ DÍNH GIỮA "BỘ NÃO" VÀ PHẦN VẼ 2D, VÀ CÁCH XỬ LÝ Ở BẢN THỬ (kết quả của bản thử, xem báo cáo)
   (1) render() của game làm ba việc: vẽ canvas 2D, vẽ bản đồ nhỏ (drawMini), cập nhật bảng thông tin (updHUD).
       → render mới tự gọi drawMini() và updHUD() sau khi vẽ 3D.
   (2) resize() của game vừa tính cỡ canvas 2D và phép nghiêng CSS, vừa đổi chữ nút góc nhìn, lớp body.bike (bật #cockpit), cỡ bản đồ nhỏ.
       → resize mới gọi hàm gốc rồi thu nhỏ, ẩn canvas 2D (khỏi tốn bộ nhớ) và đặt cỡ khung 3D.
   (3) Sự kiện đổi cỡ cửa sổ gắn thẳng vào hàm resize GỐC (addEventListener('resize', resize) lúc khởi động)
       → gắn thêm một bộ nghe riêng gọi resize mới.
   (4) Tên đường, tên điểm giao, "CHỢ HOA SỮA", tiền bay lên, 😤 💬 vẽ trong drawUprights bằng canvas 2D → viết lại ở mục 11.
   (5) Biển báo, cột đèn trong dữ liệu chỉ có vị trí, không có hướng mặt biển (bản 2D luôn quay mặt về người xem)
       → suy hướng từ làn đường gần nhất (chieuDiGan) và từ thứ tự MAP.stopLines.
   (6) Hình dáng, kích thước, màu xe và người nằm trong các hàm draw* → dựng lại bằng khối ở mục 9.
   (7) newTrip() chọn thẳng trong DESTS → bọc lại, tạm thu DESTS về các điểm trong khu cũ trong lúc gọi hàm gốc.
   (8) Khoá lưu localStorage dùng chung với bản chơi chính → luu-rieng.js đổi sang khoá riêng.
   --------------------------------------------------------- */
const renderGoc = render, resizeGoc = resize, newTripGoc = newTrip, stepGoc = step;
const DIEM_KHU = DESTS.filter(d => trongKhu(d.bay.cx, d.bay.cy));
newTrip = function(){
  const tatCa = DESTS.slice();
  DESTS.length = 0; DESTS.push(...DIEM_KHU);
  try { newTripGoc(); } finally { DESTS.length = 0; DESTS.push(...tatCa); }
};
const la3D = () => S.view !== 'map';
resize = function(){
  resizeGoc();
  VW3 = window.innerWidth || 800; VH3 = window.innerHeight || 600;
  const ba = la3D();
  glCanvas.style.display = nhanCanvas.style.display = ba ? 'block' : 'none';
  canvas.style.display = ba ? 'none' : 'block';
  if (!ba) return;
  canvas.width = canvas.height = 1;   // canvas 2D không dùng ở góc 3D: thu về 1 điểm ảnh cho đỡ tốn bộ nhớ
  const pr = Math.min(window.devicePixelRatio || 1, Q.pr);
  renderer.setPixelRatio(pr); renderer.setSize(VW3, VH3, false);
  NPR = Math.min(window.devicePixelRatio || 1, 2);
  nhanCanvas.width = Math.round(VW3 * NPR); nhanCanvas.height = Math.round(VH3 * NPR);
  datOngKinh();
  gocMay = player.a;
  TT.diemAnh = Math.round(VW3 * pr) + '×' + Math.round(VH3 * pr);
};
window.addEventListener('resize', () => resize());

/* ---------------------------------------------------------
   14. VẼ MỖI KHUNG HÌNH VÀ SỐ ĐO
   --------------------------------------------------------- */
const DO = {t: 0, n: 0, tong: 0, ve: 0, nao: 0, truoc: 0, fps: 0, ms: 0, msVe: 0, msNao: 0, lenh: 0, tam: 0, ghi: null, msNaoKhung: 0};
const oDo = document.createElement('div'); oDo.id = 'do3d'; if (HIEN_DO) document.body.appendChild(oDo);
step = function(dt){ const t0 = performance.now(); stepGoc(dt); DO.msNaoKhung = performance.now() - t0; };
function ve3D(dt){
  capNhatDen();
  capNhatVatDong(dt);
  capNhatMayQuay(dt);
  renderer.render(scene, camera);
  veChuNoi();
}
let daVe = false;
render = function(dt){
  dt = dt || 0.016;
  const t0 = performance.now(), ba = la3D();
  if (ba){ ve3D(dt); drawMini(); updHUD(); } else renderGoc(dt);
  const t1 = performance.now(), khung = DO.truoc ? t0 - DO.truoc : 0; DO.truoc = t0;
  const lenh = ba ? renderer.info.render.calls : 0, tam = ba ? renderer.info.render.triangles : 0;
  DO.n++; DO.tong += khung; DO.ve += t1 - t0; DO.nao += DO.msNaoKhung; DO.t += khung;
  if (DO.ghi) DO.ghi(khung, t1 - t0, DO.msNaoKhung, lenh, tam);
  if (DO.t >= 500){
    DO.fps = 1000 * DO.n / DO.tong; DO.ms = DO.tong / DO.n; DO.msVe = DO.ve / DO.n; DO.msNao = DO.nao / DO.n; DO.lenh = lenh; DO.tam = tam;
    DO.t = DO.n = DO.tong = DO.ve = DO.nao = 0;
    if (HIEN_DO) oDo.textContent = (ba ? '3D ' + S.view : '2D map') + ' · ' + mucTen + '\n' + DO.fps.toFixed(0) + ' khung/giây · ' + DO.ms.toFixed(1) + ' ms\n' +
      'vẽ ' + DO.msVe.toFixed(1) + ' · não ' + DO.msNao.toFixed(1) + ' ms\n' + (ba ? lenh + ' lệnh vẽ · ' + (tam / 1000).toFixed(1) + ' nghìn tam giác\n' + (TT.diemAnh || '') : '');
  }
  daVe = true;
};

/* ---------------------------------------------------------
   15. KHỞI ĐỘNG VÀ CỬA KIỂM TRA TỰ ĐỘNG (window.__T3D)
   --------------------------------------------------------- */
try { dungCanh(); }
catch (e){ baoLoi('Dựng cảnh 3D bị lỗi: ' + e.message); render = renderGoc; resize = resizeGoc; step = stepGoc; glCanvas.remove(); nhanCanvas.remove(); throw e; }
TT.msDung = Math.round(performance.now() - tDung0);
// game.js đã nhận một đơn lúc khởi động (có thể ở ngoài khu cũ) → nhận lại đơn trong khu cũ; xe xuất phát ở ô đỗ Tiệm bánh mì Cô Ba (trong khu cũ)
if (!S.trip || !DIEM_KHU.includes(S.trip.dest)) newTrip();
resize();

window.__T3D = {
  THREE: T, renderer, scene, camera, thongTin: TT, KHU, VUNG, diemKhu: DIEM_KHU, renderGoc, resizeGoc,
  daVe: () => daVe,
  // đặt xe ở toạ độ bản đồ (x, y), hướng a (rad; 0 = sang phải, π/2 = đi xuống), vận tốc v
  datXe(x, y, a, v){ player.x = x; player.y = y; player.a = a || 0; player.v = v || 0; gocMay = player.a; gocTruoc = player.a; S.route = computeRoute(); },
  gocNhin(v){ if (VIEWS.includes(v)){ S.view = v; hudCache.ck = null; resize(); } return S.view; },
  doiXe(v){ setVehicle(v); resize(); return S.veh; },
  // giữ các phím trong `phim` (ví dụ {up: true}) suốt `giay` giây rồi nhả
  lai(phim, giay){ return new Promise(xong => { Object.assign(keys, phim); setTimeout(() => { for (const k in phim) keys[k] = false; xong(); }, giay * 1000); }); },
  // đo trung bình n khung hình: khung/giây, ms mỗi khung, ms vẽ (CPU), ms bộ não, số lệnh vẽ, số tam giác
  do(n){ n = n || 60; return new Promise(xong => {
    let k = -2, tong = 0, ve = 0, nao = 0, lenh = 0, tam = 0, lonNhat = 0;   // bỏ hai khung đầu
    DO.ghi = (khung, msVe, msNao, l, t) => {
      if (++k <= 0) return;
      tong += khung; ve += msVe; nao += msNao; lenh += l; tam += t; lonNhat = Math.max(lonNhat, khung);
      if (k >= n){ DO.ghi = null; const r = v => Math.round(v * 100) / 100;
        xong({gocNhin: S.view, xe: S.veh, muc: mucTen, khung: n, fps: r(1000 * n / tong), msKhung: r(tong / n), msKhungLonNhat: r(lonNhat), msVe: r(ve / n), msNao: r(nao / n),
          lenhVe: Math.round(lenh / n), tamGiac: Math.round(tam / n), diemAnh: la3D() ? TT.diemAnh : canvas.width + '×' + canvas.height, manHinh: VW3 + '×' + VH3}); }
    }; }); }
};
})();
