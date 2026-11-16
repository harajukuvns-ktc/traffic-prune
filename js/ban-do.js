/* =========================================================
   Traffic Prune · ban-do.js: BẢN ĐỒ, ĐƯỜNG, ĐÈN, Ô ĐỖ, ĐIỂM GIAO, LỘ TRÌNH NPC
   Toạ độ tính theo "đơn vị bản đồ": 4 đơn vị = 1 mét trong game.
   ========================================================= */
'use strict';

/* =========================================================
   2. HẰNG SỐ CHUNG CỦA BẢN ĐỒ
   (Bộ máy bản đồ cũ viết tay theo 2 đường ngang, 2 đường dọc đã xoá ở bản 1.1 bước 7; mọi thứ nay tự sinh từ NODES / ROADS bên dưới.)
   ========================================================= */
const W = 3200, H = 2400, HALF = 40;     // bản 1.2: bản đồ gấp 4 (rộng 3200, cao 2400 đơn vị; khu phố cũ ở góc trên trái); nửa bề rộng một đường thường
const CYCLE = 22;                        // chu kỳ đèn tín hiệu (giây)
const CURB = 18;                         // bán kính bo cong vỉa hè ở góc giao lộ
// Thứ tự khi xe tiến vào ngã tư: vạch dừng, vạch người đi bộ, rồi tới cột đèn ở góc giao lộ
const CW_NEAR = HALF + CURB + 4, CW_FAR = CW_NEAR + 12;   // vạch người đi bộ cách tâm ngã tư
const STOPG = CW_FAR + 6 - HALF;                         // vạch dừng cách mép ngã tư (đơn vị bản đồ)
const SPEED_LIMIT = 40;                  // tốc độ tối đa đường thường (biển P.127)
const SOLID_LEN = 90;                    // vạch vàng liền dài 90 đơn vị gần ngã tư và vòng xuyến
const EXT = 600;                         // đường kéo dài ra ngoài khu phố cho đẹp mắt
const SIDE = 22;                         // bề rộng vỉa hè quanh khối nhà

// Đèn tín hiệu: mỗi đèn chạy theo chu kỳ riêng (L.cycle, mặc định CYCLE = 22 giây, hai pha 'NS' và 'EW').
// Ngã năm (bản 1.2) có thêm pha thứ ba 'X' cho nhánh chéo, chu kỳ 33 giây. Mỗi pha: 8 giây xanh, 2 giây vàng.
const PHA_DEN = {NS: 0, EW: 11, X: 22};   // giây bắt đầu xanh của từng pha trong chu kỳ
function lightOf(L, axis, t){
  const cyc = L.cycle || CYCLE, c = ((t + L.off) % cyc + cyc) % cyc, g0 = PHA_DEN[axis] || 0;
  if (c >= g0 && c < g0 + 8) return 'green'; if (c >= g0 + 8 && c < g0 + 10) return 'yellow'; return 'red';
}
// số giây còn lại tới khi hết đèn vàng của pha (âm hoặc lớn nếu đang đỏ; chỉ dùng khi đèn đang xanh hoặc vàng)
function lightRemain(L, axis, t){
  const cyc = L.cycle || CYCLE, c = ((t + L.off) % cyc + cyc) % cyc;
  return (PHA_DEN[axis] || 0) + 10 - c;
}

/* =========================================================
   2b. BỘ MÁY BẢN ĐỒ DẠNG DỮ LIỆU (bản 1.1, xem mục 10.3 của docs/THIET-KE.md)
   Bản đồ khai báo bằng hai bảng: NODES (điểm nút) và ROADS (đoạn đường giữa hai nút).
   Mọi thứ còn lại tự sinh: vùng ngã tư, vỉa hè bo cong, vạch giữa, đoạn tốc độ, đồ thị chỉ đường, đèn.
   Đường đi theo góc bất kỳ, có thể cong (điểm uốn `via`). Từ bản 1.1 bước 7 đây là bộ máy duy nhất; kết quả trên khu hiện tại
   được so với bản mẫu tests/ban-mau-1.1.json (tests mục 21).
   ========================================================= */
// kind: 'light' (có đèn) | 'priority' (biển ưu tiên) | 'plain' (không biển) | 'ring' (vòng xuyến) | 'end' (mép bản đồ)
// light: {off: lệch giờ, cycle: chu kỳ (mặc định 22), phase: {mã đường: 'NS' | 'EW' | 'X'} pha riêng của nhánh (không ghi thì theo hướng nhánh)}
// tam: true = giao lộ sẽ thành KHÔNG ĐÈN ở đợt 1.2b (biển ưu tiên / STOP / không biển); đợt 1.2a tạm có đèn vì xe NPC chưa biết nhường.
const NODES = [
  // --- khu phố cũ (góc trên trái) ---
  {id:'A', x:400,  y:300, kind:'light', light:{off:0}},
  {id:'B', x:800,  y:300, kind:'plain'},
  {id:'C', x:1200, y:300, kind:'light', light:{off:7}},
  {id:'D', x:400,  y:900, kind:'light', light:{off:14}},
  {id:'E', x:800,  y:900, kind:'plain'},
  {id:'F', x:1200, y:900, kind:'ring', ring:{rOut:100, rIn:48, rLane:76}},
  // --- khu đại lộ (trên phải): ngã năm G (đại lộ chéo chạm ngã tư), ngã ba lệch L ---
  {id:'G', x:2000, y:300, kind:'light', light:{off:3, cycle:33, phase:{cb:'X'}}},
  {id:'H', x:2800, y:300, kind:'light', light:{off:9}, tam:true},
  {id:'I', x:2000, y:900, kind:'light', light:{off:17}},
  {id:'L', x:2500, y:900, kind:'light', light:{off:5, phase:{cb:'NS'}}},
  {id:'M', x:2800, y:900, kind:'light', light:{off:12}, tam:true},
  // --- khu chợ và hẻm (dưới trái) ---
  {id:'R', x:400,  y:1500, kind:'light', light:{off:4}, tam:true},
  {id:'T', x:800,  y:1500, kind:'plain'},
  {id:'U', x:1200, y:1500, kind:'light', light:{off:10}},
  {id:'Z', x:400,  y:1800, kind:'plain'},
  {id:'ZZ', x:800, y:1800, kind:'plain'},
  {id:'V', x:400,  y:2100, kind:'light', light:{off:16}, tam:true},
  {id:'X', x:800,  y:2100, kind:'plain'},
  {id:'Y', x:1200, y:2100, kind:'light', light:{off:1}, tam:true},
  // --- khu trường học (dưới phải): vòng xuyến K ---
  {id:'J', x:2000, y:1500, kind:'light', light:{off:19}},
  {id:'K', x:2000, y:2100, kind:'ring', ring:{rOut:124, rIn:62, rLane:94}},
  {id:'O', x:2800, y:1500, kind:'light', light:{off:6}, tam:true},
  {id:'Q', x:2800, y:2100, kind:'light', light:{off:13}, tam:true},
  // --- đầu đường ở mép bản đồ ---
  {id:'W1', x:0, y:300, kind:'end'}, {id:'W2', x:0, y:900, kind:'end'}, {id:'W3', x:0, y:1500, kind:'end'}, {id:'W4', x:0, y:2340, kind:'end'},
  {id:'E1', x:3200, y:300, kind:'end'}, {id:'E2', x:3200, y:900, kind:'end'}, {id:'E3', x:3200, y:1500, kind:'end'}, {id:'E4', x:3200, y:2100, kind:'end'},
  {id:'N1', x:400, y:0, kind:'end'}, {id:'N2', x:1200, y:0, kind:'end'}, {id:'N3', x:2000, y:0, kind:'end'},
  {id:'S2', x:1200, y:2400, kind:'end'}, {id:'S3', x:2000, y:2400, kind:'end'}, {id:'S4', x:2800, y:2400, kind:'end'}
];
// cap: 'big' (đường lớn) | 'normal' (đường thường) | 'alley' (hẻm) | 'ped' (phố đi bộ)
// half: nửa bề rộng mặt đường; lanes: số làn mỗi chiều; limit: tốc độ tối đa (km/h)
// noCar / noBike: biển cấm ô tô / xe máy; oneway: chỉ được đi từ a sang b; via: điểm uốn nếu đường cong
const RD = (id, a, b, name, more) => Object.assign({id, a, b, name, cap:'normal', half:HALF, lanes:1, limit:SPEED_LIMIT}, more || {});
const HEM = {cap:'alley', half:24, limit:30, noCar:true};   // hẻm: hẹp, không vạch giữa, cấm ô tô
const ROADS = [
  RD('hs0','W1','A','Đường Hoa Sữa'), RD('hs1','A','B','Đường Hoa Sữa'), RD('hs2','B','C','Đường Hoa Sữa'), RD('hs3','C','G','Đường Hoa Sữa'),
  RD('hs4','G','H','Đường Hoa Sữa'), RD('hs5','H','E1','Đường Hoa Sữa'),
  RD('mc0','W2','D','Đường Me Chua'), RD('mc1','D','E','Đường Me Chua'), RD('mc2','E','F','Đường Me Chua'), RD('mc3','F','I','Đường Me Chua'),
  RD('mc4','I','L','Đường Me Chua'), RD('mc5','L','M','Đường Me Chua'), RD('mc6','M','E2','Đường Me Chua'),
  RD('bm0','N1','A','Phố Bánh Mì'), RD('bm1','A','D','Phố Bánh Mì', {limit:30, child:true}), RD('bm2','D','R','Phố Bánh Mì'),
  RD('bm3','R','Z','Phố Bánh Mì'), RD('bm4','Z','V','Phố Bánh Mì'),
  RD('cv0','N2','C','Đường Cầu Vồng'), RD('cv1','C','F','Đường Cầu Vồng'), RD('cv2','F','U','Đường Cầu Vồng'),
  RD('cv3','U','Y','Đường Cầu Vồng'), RD('cv4','Y','S2','Đường Cầu Vồng'),
  RD('pc', 'B','E','Phố Chợ', {cap:'ped', half:22, lanes:0, noCar:true, noBike:true}),
  // khu đại lộ
  RD('pv0','N3','G','Đường Phượng Vĩ'), RD('pv1','G','I','Đường Phượng Vĩ'), RD('pv2','I','J','Đường Phượng Vĩ'),
  RD('cb','G','L','Đại lộ Cây Bàng'),
  RD('bl1','H','M','Đường Bằng Lăng'), RD('bl2','M','O','Đường Bằng Lăng'), RD('bl3','O','Q','Đường Bằng Lăng'), RD('bl4','Q','S4','Đường Bằng Lăng'),
  // khu chợ và hẻm
  RD('hg0','W3','R','Đường Hoa Giấy'), RD('hg1','R','T','Đường Hoa Giấy'), RD('hg2','T','U','Đường Hoa Giấy'), RD('hg3','U','J','Đường Hoa Giấy'),
  RD('hg4','J','O','Đường Hoa Giấy'), RD('hg5','O','E3','Đường Hoa Giấy'),
  RD('sm0','V','X','Đường Sao Mai'), RD('sm1','X','Y','Đường Sao Mai'), RD('sm2','Y','K','Đường Sao Mai'), RD('sm3','K','Q','Đường Sao Mai'), RD('sm4','Q','E4','Đường Sao Mai'),
  RD('hx1','T','ZZ','Hẻm Xôi', HEM), RD('hx2','ZZ','X','Hẻm Xôi', HEM), RD('hc','Z','ZZ','Hẻm Chè', HEM),
  RD('bk','V','W4','Đường Bờ Kè', {via:{x:400, y:2340}}),
  // khu trường học: đoạn Phượng Vĩ trước trường tiểu học Bình Minh giới hạn 30 km/h
  RD('pv3','J','K','Đường Phượng Vĩ', {limit:30, child:true}), RD('pv4','K','S3','Đường Phượng Vĩ')
];

function dungBanDo(nodeList, roadList, opt){
  opt = opt || {};
  const M = {nodes: {}, roads: [], bays: opt.bays || [], W: opt.W || W, H: opt.H || H, curb: opt.curb == null ? CURB : opt.curb, solidLen: opt.solidLen == null ? SOLID_LEN : opt.solidLen};
  for (const n of nodeList) M.nodes[n.id] = Object.assign({arms: []}, n);
  const unit = (x, y) => { const l = Math.hypot(x, y) || 1; return {x: x/l, y: y/l}; };
  const crossU = (u, v) => u.x*v.y - u.y*v.x;
  for (const r0 of roadList){
    const r = Object.assign({}, r0), A = M.nodes[r.a], B = M.nodes[r.b];
    r.veh = r.cap !== 'ped';
    // đường cong: lấy mẫu đường Bézier bậc hai thành chuỗi điểm
    if (r.via){ r.pts = []; for (let i = 0; i <= 16; i++){ const t = i/16, u = 1 - t;
        r.pts.push({x: u*u*A.x + 2*u*t*r.via.x + t*t*B.x, y: u*u*A.y + 2*u*t*r.via.y + t*t*B.y}); } }
    else r.pts = [{x: A.x, y: A.y}, {x: B.x, y: B.y}];
    r.seg = []; let L = 0;
    for (let i = 0; i + 1 < r.pts.length; i++){ const p = r.pts[i], q = r.pts[i+1], l = Math.hypot(q.x - p.x, q.y - p.y);
      r.seg.push({p, s0: L, l, d: unit(q.x - p.x, q.y - p.y)}); L += l; }
    r.len = L;
    // đường cong: ở mép ngoài chỗ hai đoạn gấp khúc nối nhau có khe hẹp; cho phép chiếu lố đầu đoạn một chút (tol) để khỏi sót
    let turn = 0; for (let i = 1; i < r.seg.length; i++) turn = Math.max(turn, Math.abs(Math.atan2(crossU(r.seg[i-1].d, r.seg[i].d), r.seg[i-1].d.x*r.seg[i].d.x + r.seg[i-1].d.y*r.seg[i].d.y)));
    r.tol = r.seg.length > 1 ? r.half * Math.tan(turn / 2) + 0.5 : 0;
    const n = r.pts.length;
    r.dirA = unit(r.pts[1].x - r.pts[0].x, r.pts[1].y - r.pts[0].y);        // hướng ra khỏi nút a
    r.dirB = unit(r.pts[n-2].x - r.pts[n-1].x, r.pts[n-2].y - r.pts[n-1].y); // hướng ra khỏi nút b
    // kiểu đường: 'h' (ngang), 'v' (dọc), 'road' (góc bất kỳ hoặc cong); giữ dạng của bộ cũ để các phần dùng c.t không phải đổi
    r.kieu = r.via ? {t:'road'} : Math.abs(r.dirA.y) < 1e-9 ? {t:'h', Y: A.y} : Math.abs(r.dirA.x) < 1e-9 ? {t:'v', X: A.x} : {t:'road'};
    M.roads.push(r);
    A.arms.push({road: r, end: 'a', out: r.dirA, half: r.half});
    B.arms.push({road: r, end: 'b', out: r.dirB, half: r.half});
  }
  M.road = id => M.roads.find(r => r.id === id);
  const parallel = (u, v) => Math.abs(crossU(u, v)) < 0.1;
  for (const id in M.nodes){
    const nd = M.nodes[id];
    nd.arms.sort((p, q) => Math.atan2(p.out.y, p.out.x) - Math.atan2(q.out.y, q.out.x));
    const veh = nd.arms.filter(a => a.road.veh);
    // ngã tư = nút có ít nhất 3 nhánh cho xe, hoặc 2 nhánh lệch hướng (không thẳng hàng)
    nd.junction = nd.kind !== 'ring' && nd.kind !== 'end' &&
      (veh.length >= 3 || (veh.length === 2 && !parallel(veh[0].out, {x: -veh[1].out.x, y: -veh[1].out.y})));
  }

  // Chiếu điểm lên các đoạn đường: trả về mọi đường mà điểm nằm trên mặt đường
  // s: quãng đường dọc theo đường tính từ nút a; lat: lệch ngang có dấu (dương là bên phải theo chiều a→b); dir: hướng a→b tại đó
  M.hits = (x, y) => {
    const out = [];
    for (const r of M.roads){
      let best = null;
      for (let i = 0; i < r.seg.length; i++){ const g = r.seg[i];
        const t = (x - g.p.x)*g.d.x + (y - g.p.y)*g.d.y;
        if (t < -1e-9 - (i > 0 ? r.tol : 0) || t > g.l + 1e-9 + (i < r.seg.length - 1 ? r.tol : 0)) continue;
        const lat = -(x - g.p.x)*g.d.y + (y - g.p.y)*g.d.x;
        if (Math.abs(lat) <= r.half + 1e-9 && (!best || Math.abs(lat) < Math.abs(best.lat))) best = {road: r, s: g.s0 + t, lat, dir: g.d};
      }
      if (best) out.push(best);
    }
    return out;
  };
  // Đường gần nhất (kể cả khi điểm nằm ngoài mặt đường), để trợ lái và chỉ đường dùng sau này
  M.project = (x, y) => {
    let best = null;
    for (const r of M.roads) for (const g of r.seg){
      const t = Math.max(0, Math.min(g.l, (x - g.p.x)*g.d.x + (y - g.p.y)*g.d.y));
      const px = g.p.x + g.d.x*t, py = g.p.y + g.d.y*t, dist = Math.hypot(x - px, y - py);
      if (!best || dist < best.dist) best = {road: r, s: g.s0 + t, dist, lat: -(x - g.p.x)*g.d.y + (y - g.p.y)*g.d.x, dir: g.d};
    }
    return best;
  };
  M.pointAt = (r, s) => {
    for (const g of r.seg) if (s <= g.s0 + g.l || g === r.seg[r.seg.length-1]){ const t = s - g.s0; return {x: g.p.x + g.d.x*t, y: g.p.y + g.d.y*t, dir: g.d}; }
  };

  // Vỉa hè bo cong ở góc giữa hai nhánh kề nhau của mỗi nút (không làm ở vòng xuyến và mép bản đồ)
  M.corners = [];
  for (const id in M.nodes){
    const nd = M.nodes[id];
    if (nd.kind === 'ring' || nd.kind === 'end' || nd.arms.length < 2) continue;
    const k = nd.arms.length;
    for (let i = 0; i < k; i++){
      const p = nd.arms[i], q = nd.arms[(i + 1) % k];
      let g = Math.atan2(q.out.y, q.out.x) - Math.atan2(p.out.y, p.out.x); if (g <= 0) g += 2*Math.PI;
      if (g >= Math.PI - 0.17) continue;                          // hai nhánh gần thẳng hàng hoặc góc tù lớn: không có góc vỉa hè
      const sn = Math.sin(g), tn = M.curb / Math.tan(g/2);
      const ex = nd.x + p.out.x*q.half/sn + q.out.x*p.half/sn, ey = nd.y + p.out.y*q.half/sn + q.out.y*p.half/sn;  // góc mép đường
      const bis = unit(p.out.x + q.out.x, p.out.y + q.out.y), bd = M.curb / Math.sin(g/2);
      const vehArm = p.road.veh ? p : q;
      M.corners.push({node: id, u: p.out, v: q.out, sn, tn, ex, ey, cx: ex + bis.x*bd, cy: ey + bis.y*bd,
                      t: nd.junction ? {t:'junction', X: nd.x, Y: nd.y, node: id} : Object.assign({}, vehArm.road.kieu, {road: vehArm.road})});
    }
  }
  M.inCurb = (x, y) => {
    for (const c of M.corners){
      // toạ độ xiên theo hai nhánh: (x,y) - góc = a*u + b*v
      const dx = x - c.ex, dy = y - c.ey;
      const a = (dx*c.v.y - dy*c.v.x) / (c.u.x*c.v.y - c.u.y*c.v.x), b = (c.u.x*dy - c.u.y*dx) / (c.u.x*c.v.y - c.u.y*c.v.x);
      if (a >= -1e-9 && a <= c.tn + 1e-9 && b >= -1e-9 && b <= c.tn + 1e-9 && Math.hypot(x - c.cx, y - c.cy) > M.curb) return c.t;
    }
    return null;
  };

  // Phân loại một điểm trên bản đồ. Đường ngang / dọc trả kiểu {t:'h', Y} / {t:'v', X} (giữ từ bộ cũ), đường góc bất kỳ {t:'road'};
  // kèm road, s, lat, dir khi điểm nằm trên đường.
  M.classify = (x, y) => {
    for (const b of M.bays){ const dx = x - b.cx, dy = y - b.cy;   // ô đỗ là hình chữ nhật xoay theo hướng đường (bản 1.2)
      if (Math.abs(dx*b.dir.x + dy*b.dir.y) <= b.L/2 && Math.abs(dy*b.dir.x - dx*b.dir.y) <= b.D/2) return {t:'bay', bay:b}; }
    for (const id in M.nodes){ const nd = M.nodes[id]; if (nd.kind !== 'ring') continue;
      const dr = Math.hypot(x - nd.x, y - nd.y);
      if (dr <= nd.ring.rOut) return dr < nd.ring.rIn ? {t:'island', node: id} : {t:'ring', node: id}; }
    const hs = M.hits(x, y), vh = hs.filter(h => h.road.veh);
    const ped = hs.find(h => !h.road.veh && h.s >= h.road.gapA.gap - 1e-9 && h.s <= h.road.len - h.road.gapB.gap + 1e-9);
    for (let i = 0; i < vh.length; i++) for (let j = i + 1; j < vh.length; j++){
      const r1 = vh[i].road, r2 = vh[j].road;
      if (parallel(vh[i].dir, vh[j].dir)) continue;
      for (const nid of [r1.a, r1.b]) if ((nid === r2.a || nid === r2.b) && M.nodes[nid].junction)
        return {t:'junction', X: M.nodes[nid].x, Y: M.nodes[nid].y, node: nid};
    }
    if (ped) return {t:'ped', road: ped.road, s: ped.s, lat: ped.lat, dir: ped.dir};
    if (vh.length){ const h = vh.reduce((p, q) => Math.abs(q.lat) < Math.abs(p.lat) ? q : p, vh[0]);
      return Object.assign({}, h.road.kieu, {road: h.road, s: h.s, lat: h.lat, dir: h.dir}); }
    return M.inCurb(x, y) || {t:'off'};
  };

  // Vạch giữa đường tại quãng s trên đường r: 'none' trong nút giao, 'solid' (liền) gần ngã tư và vòng xuyến, 'broken' (đứt) ở giữa đoạn
  const endGap = (r, end) => {
    const nd = M.nodes[end === 'a' ? r.a : r.b], me = end === 'a' ? r.dirA : r.dirB;
    if (nd.kind === 'ring') return {gap: nd.ring.rOut, solid: true};
    if (nd.kind === 'end') return {gap: -Infinity, solid: false};   // mép bản đồ: đường chạy tiếp ra ngoài
    let gap = 0;
    for (const a of nd.arms){ if (a.road === r) continue;
      const sn = Math.abs(crossU(a.out, me)); if (sn < 0.1) continue;   // nhánh thẳng hàng thì không chắn vạch
      gap = Math.max(gap, a.half / sn); }
    return {gap, solid: nd.junction};
  };
  for (const r of M.roads){ r.gapA = endGap(r, 'a'); r.gapB = endGap(r, 'b'); }
  M.lineAt = (r, s) => {
    if (!r.veh || r.cap === 'alley') return 'none';   // hẻm không kẻ vạch giữa
    let solid = false;
    for (const [d, e] of [[s, r.gapA], [r.len - s, r.gapB]]){
      if (d <= e.gap + 1e-9) return 'none';
      if (e.solid && d <= e.gap + M.solidLen + 1e-9) solid = true;
    }
    return solid ? 'solid' : 'broken';
  };

  // Đoạn tốc độ: các đường nối liền qua nút không phải ngã tư (ví dụ đầu phố đi bộ) gộp thành một đoạn
  const par = {}; const find = id => par[id] === id ? id : (par[id] = find(par[id]));
  for (const r of M.roads) if (r.veh) par[r.id] = r.id;
  for (const id in M.nodes){ const nd = M.nodes[id]; if (nd.junction || nd.kind === 'ring' || nd.kind === 'end') continue;
    const veh = nd.arms.filter(a => a.road.veh); for (let i = 1; i < veh.length; i++) par[find(veh[i].road.id)] = find(veh[0].road.id); }
  for (const r of M.roads) if (r.veh) r.section = find(r.id);
  M.speedInfo = c => c && c.road && c.road.veh ? {id: c.road.section, limit: c.road.limit, child: !!c.road.child} : null;

  // Đồ thị chỉ đường (chỉ đường cho xe) và đèn tín hiệu
  M.graph = {N: {}, DEAD: {}, SEGS: []};
  for (const id in M.nodes){ const nd = M.nodes[id];
    if (nd.arms.some(a => a.road.veh)){ M.graph.N[id] = {x: nd.x, y: nd.y}; if (nd.kind === 'end') M.graph.DEAD[id] = 1; } }
  for (const r of M.roads) if (r.veh) M.graph.SEGS.push({a: r.a, b: r.b, name: r.name, road: r});
  M.lights = [];
  for (const id in M.nodes){ const nd = M.nodes[id]; if (nd.kind === 'light') M.lights.push({x: nd.x, y: nd.y, off: nd.light.off, cycle: nd.light.cycle || CYCLE, node: id}); }
  // pha đèn của một nhánh: nhánh gần trục dọc màn hình là 'NS', còn lại 'EW'; nút khai báo light.phase[mã đường] thì theo khai báo (ngã năm, nhánh chéo)
  M.armPhase = out => Math.abs(out.y) > Math.abs(out.x) ? 'NS' : 'EW';
  // Vạch dừng của từng nhánh xe ở mỗi nút có đèn (bản 1.1 bước 5): cách tâm nút gap + STOPG theo hướng nhánh.
  // d: hướng xe đi tới nút (ngược với hướng nhánh); sx, sy: điểm giữa vạch dừng trên tim đường; phase: pha đèn của nhánh
  M.stopLines = [];
  for (const L of M.lights){ const nd = M.nodes[L.node];
    for (const a of nd.arms){ if (!a.road.veh) continue;
      const g = (a.end === 'a' ? a.road.gapA : a.road.gapB).gap + STOPG;
      M.stopLines.push({L, node: L.node, road: a.road, half: a.half, d: {x: -a.out.x, y: -a.out.y}, sx: nd.x + a.out.x*g, sy: nd.y + a.out.y*g, phase: (nd.light.phase && nd.light.phase[a.road.id]) || M.armPhase(a.out)}); } }
  // Vòng xuyến (để bắt lỗi không nhường, đi ngược vòng; ringBusy nhận một phần tử của danh sách này)
  M.rings = [];
  for (const id in M.nodes){ const nd = M.nodes[id]; if (nd.kind === 'ring') M.rings.push({node: id, x: nd.x, y: nd.y, rOut: nd.ring.rOut, rIn: nd.ring.rIn, rLane: nd.ring.rLane}); }
  M.ringOf = id => M.rings.find(g => g.node === id) || null;
  return M;
}
let MAP = dungBanDo(NODES, ROADS, {});

/* =========================================================
   2c. Ô ĐỖ VÀ ĐIỂM GIAO (bản 1.1 bước 7: khai báo theo đường)
   Ô đỗ kẻ vạch NGAY TRÊN LÒNG ĐƯỜNG, sát mép vỉa hè bên phải theo chiều xe chạy của làn đó
   (khoản 6 Điều 18 Luật TTATGTĐB 2024: trên đường phố chỉ được dừng, đỗ sát lề đường, vỉa hè phía bên phải theo chiều đi).
   Khai báo {road, s, ben}: đường nào, cách nút a của đường s đơn vị, lề 'phai' / 'trai' theo chiều a→b.
   Xe đỗ trong ô phải hướng theo chiều đi của làn sát lề đó (dir).
   ========================================================= */
const BAY_L = 70, BAY_D = 16;
// Đặt một ô đỗ khai báo {road, s, ben} lên bản đồ M. Từ bản 1.2 ô là hình chữ nhật xoay theo hướng đường nên đặt được cả trên
// đường chéo: cx, cy tâm ô; dir chiều xe đỗ (chiều đi của làn sát lề đó); n hướng ra vỉa hè; L dài, D rộng; proj điểm trên tim đường.
// Ô trên đường ngang / dọc có thêm x, y, w, h (khung thẳng trục) và side ('S' mép nam, 'N' bắc, 'E' đông, 'W' tây) như trước.
// Đường cong chưa đặt được ô.
function datODo(M, o){
  const r = M.road(o.road); if (!r) throw new Error('Ô đỗ: không có đường ' + o.road);
  if (r.via) throw new Error('Ô đỗ trên đường cong chưa làm: ' + o.road);
  const p = M.pointAt(r, o.s), d = p.dir, k = o.ben === 'trai' ? -1 : 1, n = {x: -d.y*k, y: d.x*k};   // n: hướng ra lề có ô
  const e = r.half - BAY_D/2, b = {cx: p.x + n.x*e, cy: p.y + n.y*e, dir: {x: d.x*k, y: d.y*k}, n, L: BAY_L, D: BAY_D, proj: {x: p.x, y: p.y},
    road: o.road, s: o.s, ben: o.ben};
  if (Math.abs(d.y) < 1e-9){ Object.assign(b, {x: b.cx - BAY_L/2, y: b.cy - BAY_D/2, w: BAY_L, h: BAY_D, side: n.y > 0 ? 'S' : 'N'}); }
  else if (Math.abs(d.x) < 1e-9){ Object.assign(b, {x: b.cx - BAY_D/2, y: b.cy - BAY_L/2, w: BAY_D, h: BAY_L, side: n.x > 0 ? 'E' : 'W'}); }
  for (const kk of ['cx', 'cy']) b[kk] = Math.round(b[kk] * 1e6) / 1e6;
  b.dir = {x: Math.round(b.dir.x * 1e9) / 1e9 + 0, y: Math.round(b.dir.y * 1e9) / 1e9 + 0};
  return b;
}
const DESTS = [
  {name:'Tiệm bánh mì Cô Ba', icon:'🥖', road:'hs1', s:200, ben:'phai'},
  {name:'Quán trà đá Chú Tèo', icon:'🍵', road:'hs0', s:180, ben:'trai'},
  {name:'Bưu cục Phố Mới', icon:'📮', road:'hs3', s:220, ben:'phai'},
  {name:'Chợ Hoa Sữa (bãi đỗ xe cổng chợ)', icon:'🛒', road:'mc2', s:75, ben:'trai'},
  {name:'Trường mầm non Sơn Ca', icon:'🏫', road:'bm1', s:320, ben:'trai'},
  {name:'Tiệm hoa Bà Tư', icon:'🌸', road:'cv1', s:300, ben:'trai'},
  {name:'Cà phê Hẻm Nhỏ', icon:'☕', road:'mc2', s:150, ben:'trai'},
  {name:'Tiệm sửa xe Út Lành', icon:'🔧', road:'bm2', s:180, ben:'phai'},
  {name:'Tiệm thuốc Cô Hạnh', icon:'💊', road:'mc3', s:260, ben:'phai'},
  // khu đại lộ (bản 1.2)
  {name:'Siêu thị Cây Bàng', icon:'🏬', road:'cb', s:390, ben:'phai'},
  {name:'Nhà sách Phượng Vĩ', icon:'📚', road:'pv1', s:300, ben:'trai'},
  {name:'Quán phở Bằng Lăng', icon:'🍜', road:'bl1', s:300, ben:'phai'},
  {name:'Trạm xăng Hoa Sữa', icon:'⛽', road:'hs4', s:400, ben:'phai'},
  // khu chợ và hẻm (hẻm cấm ô tô nên không đặt điểm giao trong hẻm)
  {name:'Tạp hóa Dì Sáu', icon:'🧺', road:'hg1', s:200, ben:'phai'},
  {name:'Vựa trái cây Chú Bảy', icon:'🍉', road:'hg0', s:200, ben:'trai'},
  {name:'Lò bánh Sao Mai', icon:'🥐', road:'sm1', s:200, ben:'trai'},
  {name:'Tiệm may Cô Lụa', icon:'🧵', road:'cv3', s:300, ben:'phai'},
  // khu trường học
  {name:'Trường tiểu học Bình Minh', icon:'🎒', road:'pv3', s:200, ben:'phai'},
  {name:'Phòng khám Bằng Lăng', icon:'🏥', road:'bl3', s:300, ben:'trai'},
  {name:'Công viên Sao Mai', icon:'🌳', road:'sm3', s:430, ben:'phai'},
  {name:'Tiệm kem Hoa Giấy', icon:'🍦', road:'hg4', s:400, ben:'trai'}
];
// Ô đỗ không gắn điểm giao (chỗ tấp vào nghe điện thoại, nghỉ)
const O_DO_THEM = [{road:'hs2', s:200, ben:'trai'}, {road:'cv0', s:120, ben:'phai'}, {road:'mc4', s:250, ben:'phai'}, {road:'pv2', s:300, ben:'trai'}, {road:'hg3', s:400, ben:'phai'}];
for (const d of DESTS) d.bay = datODo(MAP, d);
const BAYS = DESTS.map(d => d.bay).concat(O_DO_THEM.map(o => datODo(MAP, o)));
MAP.bays = BAYS;
for (const d of DESTS){   // chỗ ghi tên điểm giao: ngay ngoài ô đỗ, phía vỉa hè
  const b = d.bay, k = b.side === 'E' || b.side === 'W' ? 16 : 14;
  d.lx = b.cx + b.n.x*(b.D/2 + k); d.ly = b.cy + b.n.y*(b.D/2 + k);
}
// vị trí cột biển P của một ô đỗ: sát mép vỉa hè, ở đầu ô (ô thẳng trục giữ đúng chỗ cũ: đầu bên trái / bên trên)
function bienPCua(b){
  if (b.side) return {x: b.w > b.h ? b.x + 6 : (b.side === 'E' ? b.x + b.w + 3 : b.x - 3), y: b.w > b.h ? (b.side === 'S' ? b.y + b.h + 3 : b.y - 3) : b.y + 6};
  return {x: b.cx + b.n.x*(b.D/2 + 3) - b.dir.x*(b.L/2 - 6), y: b.cy + b.n.y*(b.D/2 + 3) - b.dir.y*(b.L/2 - 6)};
}
// (để biển chỉ dẫn, biển tốc độ không chồng lên)
const P_SIGNS = BAYS.map(bienPCua);

/* =========================================================
   2d. BIỂN BÁO TỰ SINH TỪ BẢN ĐỒ (bản 1.1 bước 7)
   ========================================================= */
const otherNode = (M, r, id) => M.nodes[r.a === id ? r.b : r.a];
// Biển chỉ dẫn hướng đi (nền xanh, chữ trắng; dạng chung, không gán số hiệu) trước mỗi nút có từ 3 nhánh (kể cả phố đi bộ),
// trừ vòng xuyến. Đặt bên phải theo chiều đi, cách mép nút SIGN_BACK (thử lần lượt, chọn chỗ đầu tiên không sát cột biển P
// hay biển chỉ dẫn khác); mỗi biển ghi tên đường ở các hướng trái / thẳng / phải. Không đặt trên nhánh đi vào từ mép bản đồ hay từ phố đi bộ.
const SIGN_BACK = [110, 135, 85, 160, 190, 220];   // cách mép nút giao (khu cũ: cách tâm 150, 175, 125, 200)
function sinhBienChiDan(M, tranh){
  const list = [];
  for (const id in M.nodes){
    const nd = M.nodes[id];
    if (nd.kind === 'ring' || nd.kind === 'end' || nd.arms.length < 3) continue;
    const nb = M.roads.filter(r => r.a === id || r.b === id).map(r => ({r, out: r.a === id ? r.dirA : r.dirB, end: r.a === id ? 'a' : 'b'}));   // theo thứ tự khai báo đường
    for (const from of nb){
      if (otherNode(M, from.r, id).kind === 'end' || !from.r.veh) continue;
      const hx = -from.out.x, hy = -from.out.y, rows = [];
      for (const to of nb){
        if (to === from) continue;
        const cross = hx*to.out.y - hy*to.out.x, dot = hx*to.out.x + hy*to.out.y;   // trục y hướng xuống: cross > 0 là rẽ phải
        rows.push({k: (Math.abs(cross) < 0.5 && dot > 0) ? 'thang' : (cross > 0 ? 'phai' : 'trai'), name: to.r.name + (to.r.veh ? '' : ' (đi bộ)'), ped: !to.r.veh});
      }
      rows.sort((p, q) => ['trai','thang','phai'].indexOf(p.k) - ['trai','thang','phai'].indexOf(q.k));
      const gap = Math.max((from.end === 'a' ? from.r.gapA : from.r.gapB).gap, from.r.half), side = from.r.half + 8;
      let pos = null, ok = false;
      for (const back of SIGN_BACK){
        const q = {x: nd.x - hx*(gap + back) - hy*side, y: nd.y - hy*(gap + back) + hx*side};
        if (!pos) pos = q;
        if (M.classify(q.x, q.y).t === 'off' && !tranh.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 52) && !list.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 60)){ pos = q; ok = true; break; }
      }
      if (ok || M.classify(pos.x, pos.y).t === 'off') list.push({x: pos.x, y: pos.y, rows, node: id});   // không có chỗ nào trên vỉa hè (góc quá hẹp) thì thôi
    }
  }
  return list;
}
const SIGNBOARDS = sinhBienChiDan(MAP, P_SIGNS);
// Biển hạn chế tốc độ P.127 bên phải theo chiều đi, ngay sau mỗi nút (trừ mép bản đồ và vòng xuyến). Đường có trẻ em (child: true,
// khu cũ: khối Phố Bánh Mì có trường mầm non Sơn Ca) đặt biển W.225 "Trẻ em" rồi biển tốc độ của đường.
function sinhBienTocDo(M, tranhP, tranhChiDan){
  const list = [];
  const free = (q, r) => M.classify(q.x, q.y).t === 'off' && !tranhP.some(o => Math.hypot(o.x - q.x, o.y - q.y) < r) && !tranhChiDan.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 60) && !list.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 40);
  const put = (kind, v, nd, d, base, side, backs) => {   // d: chiều xe đi; base: mép nút
    const rx = -d.y, ry = d.x; let pos = null, ok = false;
    for (const b of backs){
      const q = {x: nd.x + d.x*(base + b) + rx*side, y: nd.y + d.y*(base + b) + ry*side};
      if (!pos) pos = q;
      if (free(q, 48)){ pos = q; ok = true; break; }
    }
    if (ok || M.classify(pos.x, pos.y).t === 'off') list.push({kind, v, x: pos.x, y: pos.y});   // đường cong, góc hẹp: không có chỗ trên vỉa hè thì thôi
  };
  for (const r of M.roads){ if (!r.veh) continue;
    for (const end of ['a', 'b']){
      const nd = M.nodes[r[end]]; if (nd.kind === 'end' || nd.kind === 'ring') continue;
      const d = end === 'a' ? r.dirA : r.dirB, base = Math.max((end === 'a' ? r.gapA : r.gapB).gap, r.half), side = r.half + 8;
      if (r.child){ put('child', 0, nd, d, base, side, [45, 70, 20]); put('limit', r.limit, nd, d, base, side, [100, 125, 150, 80]); }
      else put('limit', r.limit, nd, d, base, side, [70, 95, 120, 150, 180, 210]);
    } }
  return list;
}
const SPEED_SIGNS = sinhBienTocDo(MAP, P_SIGNS, SIGNBOARDS);

// Chốt CSGT (bản 0.11): hai chốt cố định. Xe đi qua "vạch kiểm tra" (cả hai chiều) mà đầu trần hoặc đang cầm điện thoại là bị thổi còi.
// Từ bản 1.1 bước 5: khai báo theo đường và quãng s (tính từ nút a của đường); vị trí, hướng vạch kiểm tra và chỗ đặt chòi
// tự tính từ MAP (hàm datTheoDuong). cabin: chòi cách tim đường bao nhiêu đơn vị, về phía bên phải theo chiều a→b.
const CSGT = [
  {id: 'hoasua',  road: 'hs2', s: 190, cabin: 52, name: 'Đường Hoa Sữa'},
  {id: 'cauvong', road: 'cv1', s: 400, cabin: 50, name: 'Đường Cầu Vồng'},
  {id: 'banglang', road: 'bl2', s: 300, cabin: 52, name: 'Đường Bằng Lăng'}   // bản 1.2
];
// Vạch qua đường cho người đi bộ ở hai đầu Phố Chợ (bản 1.0b), khai báo theo đường và quãng s như CSGT
const CROSSWALKS = [{road: 'hs1', s: 400}, {road: 'mc1', s: 400}, {road: 'pv3', s: 300}];   // thêm vạch trước trường tiểu học (bản 1.2)
// Đặt các vật khai báo theo {road, s} (chốt CSGT, vạch qua đường) lên bản đồ M: tính toạ độ, hướng đường d (a→b),
// pháp tuyến n (bên phải theo chiều a→b) và nửa bề rộng đường. Đường không có trên M thì đánh dấu off.
function datTheoDuong(M, list){
  for (const o of list){
    const r = M.road(o.road); o.off = !r; if (!r) continue;
    const p = M.pointAt(r, o.s);
    o.x = p.x; o.y = p.y; o.d = {x: p.dir.x, y: p.dir.y}; o.n = {x: -p.dir.y, y: p.dir.x}; o.half = r.half;
  }
  return list;
}
datTheoDuong(MAP, CSGT); datTheoDuong(MAP, CROSSWALKS);
for (const p of CSGT) p.cabinPt = {x: p.x + p.n.x*p.cabin, y: p.y + p.n.y*p.cabin};

// Nhãn tên đường ghi trên vỉa hè: {road, s, lech} (lech: cách tim đường, dương là bên phải theo chiều a→b). Phố đi bộ ghi thêm "(đi bộ)".
const NHAN_DUONG = [
  {road:'hs1', s:290, lech:-54}, {road:'hs3', s:190, lech:-54}, {road:'mc1', s:220, lech:54}, {road:'mc3', s:220, lech:-54},
  {road:'bm1', s:340, lech:54}, {road:'bm0', s:140, lech:-54}, {road:'cv1', s:260, lech:54}, {road:'cv2', s:200, lech:-54},
  {road:'pc', s:180, lech:38},
  // bản 1.2
  {road:'hs4', s:560, lech:-54}, {road:'mc4', s:150, lech:54}, {road:'mc6', s:200, lech:-54}, {road:'pv1', s:150, lech:-54}, {road:'pv2', s:150, lech:54},
  {road:'cb', s:230, lech:-56}, {road:'bl1', s:160, lech:54}, {road:'bl3', s:160, lech:54}, {road:'hg0', s:120, lech:-54}, {road:'hg2', s:200, lech:-54},
  {road:'hg3', s:250, lech:-54}, {road:'hg4', s:200, lech:54}, {road:'sm1', s:120, lech:54}, {road:'sm2', s:300, lech:-54}, {road:'sm3', s:260, lech:-54},
  {road:'bm3', s:150, lech:54}, {road:'cv3', s:160, lech:-54}, {road:'pv3', s:150, lech:-54}, {road:'hx1', s:150, lech:-40}, {road:'hc', s:200, lech:-40}, {road:'bk', s:250, lech:-56}
];
// Các vật trang trí đứng trên bản đồ, tự sinh từ M (vẽ ở drawUprights trong game.js, bản đồ nhỏ ở drawMini)
function sinhTrangTri(M, bays){
  const t = {bienP: [], cotDen: [], bienVong: [], bienDiBo: [], nhanDiBo: [], nhanDuong: [], nhanMep: []};
  const phai = d => ({x: -d.y, y: d.x});
  // biển P ở mỗi ô đỗ
  for (const b of bays) t.bienP.push(bienPCua(b));
  // cột đèn: mỗi nhánh đi vào nút có đèn một cột, ở góc bên tay phải người lái, ngay sau mép nút (có camera phạt nguội trên đỉnh)
  for (const sl of M.stopLines){
    const nd = M.nodes[sl.node], g = (sl.road.a === sl.node ? sl.road.gapA : sl.road.gapB).gap, rt = phai(sl.d);
    // góc vỉa hè bên tay phải người lái (giữa nhánh này và nhánh kề): cột đứng sau đỉnh góc 10 đơn vị mỗi chiều theo đường phân giác.
    // Ngã tư vuông cho đúng chỗ cũ; góc nhọn ở ngã năm, ngã ba lệch thì cột vẫn nằm trên vỉa hè. Không có góc (nhánh kề thẳng hàng): công thức cũ.
    const cn = M.corners.find(c => c.node === sl.node && c.v.x === -sl.d.x && c.v.y === -sl.d.y);
    if (cn){ const bl = Math.hypot(cn.u.x + cn.v.x, cn.u.y + cn.v.y) || 1;
      // khoảng từ đỉnh góc tới mép cung vỉa hè bo cong, cộng thêm cho vào hẳn trong vỉa hè (góc vuông: đúng 10·√2 như cũ)
      const k = (Math.hypot(cn.cx - cn.ex, cn.cy - cn.ey) - M.curb + (10 * Math.SQRT2 - (M.curb * Math.SQRT2 - M.curb))) / bl;
      t.cotDen.push({x: cn.ex + (cn.u.x + cn.v.x)*k, y: cn.ey + (cn.u.y + cn.v.y)*k, L: sl.L, phase: sl.phase}); }
    else t.cotDen.push({x: nd.x - sl.d.x*(g + 10) + rt.x*(sl.half + 10), y: nd.y - sl.d.y*(g + 10) + rt.y*(sl.half + 10), L: sl.L, phase: sl.phase});
  }
  // biển vòng xuyến trước mỗi cửa vào, bên phải người lái
  for (const g of M.rings) for (const a of M.nodes[g.node].arms){ if (!a.road.veh) continue;
    const rt = phai({x: -a.out.x, y: -a.out.y});
    t.bienVong.push({x: g.x + a.out.x*(g.rOut + 28) + rt.x*(a.half + 10), y: g.y + a.out.y*(g.rOut + 28) + rt.y*(a.half + 10)}); }
  // phố đi bộ (và đường cấm cả ô tô lẫn xe máy): hai đầu có biển P.104 "Cấm xe máy", P.103a "Cấm ô tô" và bảng "PHỐ ĐI BỘ"
  for (const r of M.roads){ if (r.veh) continue;
    for (const [s, k] of [[r.gapA.gap + 10, 1], [r.len - r.gapB.gap - 10, -1]]){
      const p = M.pointAt(r, s), n = phai(p.dir);
      t.bienDiBo.push({x: p.x + n.x*33, y: p.y + n.y*33, icon: 'xe-may'}, {x: p.x - n.x*33, y: p.y - n.y*33, icon: 'o-to'});
      t.nhanDiBo.push({x: p.x + p.dir.x*22*k, y: p.y + p.dir.y*22*k});
    } }
  // tên đường
  for (const o of NHAN_DUONG){ const r = M.road(o.road); if (!r) continue;
    const p = M.pointAt(r, o.s), n = phai(p.dir);
    t.nhanDuong.push({t: r.name + (r.veh ? '' : ' (đi bộ)'), x: p.x + n.x*o.lech, y: p.y + n.y*o.lech}); }
  // "Hết khu chơi thử" ở mỗi đầu đường ra mép bản đồ (đường ngang cách mép 34, đường dọc 22 cho chữ khỏi tràn)
  for (const id in M.nodes){ const nd = M.nodes[id]; if (nd.kind !== 'end') continue;
    for (const a of nd.arms){ if (!a.road.veh) continue; const k = Math.abs(a.out.x)*34 + Math.abs(a.out.y)*22;
      t.nhanMep.push({x: nd.x + a.out.x*k, y: nd.y + a.out.y*k}); } }
  return t;
}
const trangTri = sinhTrangTri(MAP, BAYS);

/* =========================================================
   2e. NHÀ CỬA TỰ SINH (bản 1.2): chia bản đồ thành các ô theo những đường thẳng ngang / dọc, mỗi ô xếp một lưới nhà cách mép đường
   một vỉa hè SIDE; nhà nào chạm đường chéo, đường cong, hẻm hay vòng xuyến thì bỏ. Nhà vẫn là hình chữ nhật thẳng trục.
   ========================================================= */
let seed = 7;
function rnd(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function rectCircleDist(r, cx, cy){
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w)), ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  return Math.hypot(cx - nx, cy - ny);
}
function darken(hex, f){
  const n = parseInt(hex.slice(1), 16), r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
const HOUSE_COLORS = ['#f6c89f','#f4a6a6','#a8d5e2','#cdb4db','#ffd6a5','#b9e4c9','#fbe7a1','#c9d6ff','#f2b5d4'];
function sinhNha(M){
  const out = [], ngang = M.roads.filter(r => !r.via && Math.abs(r.dirA.y) < 1e-9), doc = M.roads.filter(r => !r.via && Math.abs(r.dirA.x) < 1e-9);
  const uniq = a => [...new Set(a)].sort((p, q) => p - q);
  const xs = uniq([0, M.W, ...doc.map(r => M.nodes[r.a].x)]).filter(v => v >= 0 && v <= M.W);
  const ys = uniq([0, M.H, ...ngang.map(r => M.nodes[r.a].y)]).filter(v => v >= 0 && v <= M.H);
  // khoảng lùi ở một cạnh ô: có đường chạy dọc cạnh đó thì lùi nửa bề rộng đường + vỉa hè; mép bản đồ lùi một vỉa hè; không thì 0
  const lui = (list, truc, v, lo, hi, bien) => {
    const mid = (lo + hi) / 2;
    for (const r of list){ const A = M.nodes[r.a], B = M.nodes[r.b];
      if (truc === 'x' ? (A.x === v && mid > Math.min(A.y, B.y) && mid < Math.max(A.y, B.y)) : (A.y === v && mid > Math.min(A.x, B.x) && mid < Math.max(A.x, B.x))) return r.half + SIDE; }
    return bien ? SIDE : 0;
  };
  const bam = (x, y, k) => { const v = Math.sin(x*12.9898 + y*78.233 + k*37.719) * 43758.5453; return v - Math.floor(v); };
  // nhà cách tim mọi đường ít nhất nửa bề rộng + vỉa hè (lấy mẫu dọc đường mỗi 8 đơn vị)
  const mau = [];
  for (const r of M.roads) for (let q = 0; q <= r.len; q += 8){ const p = M.pointAt(r, q); mau.push({x: p.x, y: p.y, d: r.half + SIDE - 1}); }
  const cham = h => M.rings.some(g => rectCircleDist(h, g.x, g.y) < g.rOut + 18) ||
    mau.some(p => p.x > h.x - p.d && p.x < h.x + h.w + p.d && p.y > h.y - p.d && p.y < h.y + h.h + p.d && rectCircleDist(h, p.x, p.y) < p.d);
  for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < ys.length; j++){
    const x1 = xs[i], x2 = xs[i+1], y1 = ys[j], y2 = ys[j+1];
    const ax = x1 + lui(doc, 'x', x1, y1, y2, x1 === 0), bx = x2 - lui(doc, 'x', x2, y1, y2, x2 === M.W);
    const ay = y1 + lui(ngang, 'y', y1, x1, x2, y1 === 0), by = y2 - lui(ngang, 'y', y2, x1, x2, y2 === M.H);
    const aw = bx - ax, ah = by - ay;
    if (aw < 30 || ah < 30) continue;
    const nx = Math.max(1, Math.round(aw / 120)), ny = Math.max(1, Math.round(ah / 110));
    for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++){
      const h = {x: ax + a*aw/nx + 5, y: ay + b*ah/ny + 5, w: aw/nx - 10, h: ah/ny - 10};
      if (cham(h)){   // chạm đường chéo / cong / hẻm: thử chia làm bốn nhà nhỏ, giữ những nhà không chạm (cho đỡ trống dọc đường chéo)
        for (let u = 0; u < 2; u++) for (let v = 0; v < 2; v++){
          const q = {x: h.x + u*(h.w/2 + 2), y: h.y + v*(h.h/2 + 2), w: h.w/2 - 2, h: h.h/2 - 2};
          if (q.w < 24 || q.h < 24 || cham(q)) continue;
          const col = HOUSE_COLORS[Math.floor(bam(q.x, q.y, 1) * HOUSE_COLORS.length)];
          out.push(Object.assign(q, {stall: false, color: col, dark: darken(col, 0.72), awn: Math.floor(bam(q.x, q.y, 2) * 4)}));
        }
        continue;
      }
      const stall = h.x > 822 && h.x < 1010 && h.x + h.w < 1160 && h.y > 380 && h.y < 760;   // sạp chợ Hoa Sữa
      const color = HOUSE_COLORS[Math.floor(bam(h.x, h.y, 1) * HOUSE_COLORS.length)];
      out.push(Object.assign(h, {stall, color, dark: darken(color, 0.72), awn: Math.floor(bam(h.x, h.y, 2) * 4)}));
    }
  }
  return out;
}
const HOUSES = sinhNha(MAP);
MAP.houses = HOUSES;
// va chạm với nhà của bản đồ đang dùng (bản đồ thử của các bài test không có nhà)
function hitsHouse(x, y, rad){
  for (const h of MAP.houses || [])
    if (x > h.x - rad && x < h.x + h.w + rad && y > h.y - rad && y < h.y + h.h + rad) return true;
  return false;
}
// Các khối phố có người đi bộ dạo vòng quanh trên vỉa hè (khung chữ nhật giữa các đường)
const KHOI_DI_BO = [
  {x1:0, x2:360, y1:340, y2:860}, {x1:440, x2:1160, y1:0, y2:260}, {x1:440, x2:778, y1:340, y2:860}, {x1:0, x2:360, y1:0, y2:260}, {x1:1240, x2:1960, y1:0, y2:260},
  {x1:1240, x2:1960, y1:340, y2:860}, {x1:2040, x2:2760, y1:940, y2:1460}, {x1:1240, x2:1960, y1:1540, y2:2060}, {x1:2040, x2:2760, y1:1540, y2:1960}, {x1:440, x2:776, y1:1540, y2:1776}
];

/* =========================================================
   3. HÀM DÙNG CHUNG CHO TUYẾN ĐI (xe NPC, người đi bộ): tuyến là chuỗi điểm {pts, loop}
   ========================================================= */
function P(x, y){ return {x, y}; }
function pathLen(pts, loop){
  let L = 0; const seg = [];
  const m = loop ? pts.length : pts.length - 1;
  for (let i = 0; i < m; i++){
    const a = pts[i], b = pts[(i+1) % pts.length]; const d = Math.hypot(b.x-a.x, b.y-a.y);
    seg.push(d); L += d;
  }
  return {L, seg};
}
function pointAt(route, s){
  const {seg} = pathLen(route.pts, route.loop);
  for (let i = 0; i < seg.length; i++){
    if (s <= seg[i]){ const a = route.pts[i], b = route.pts[(i+1) % route.pts.length], f = s / seg[i];
      return {x: a.x + (b.x-a.x)*f, y: a.y + (b.y-a.y)*f, idx: (i+1) % route.pts.length}; }
    s -= seg[i];
  }
  return {x: route.pts[0].x, y: route.pts[0].y, idx: 1};
}

// Phân loại một điểm trên bản đồ đang dùng; MAP có thể đổi tạm qua useMap (các bài test dựng bản đồ thử)
function classify(x, y){ return MAP.classify(x, y); }
function useMap(M){ const old = MAP; MAP = M; return old; }
