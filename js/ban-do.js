/* =========================================================
   Traffic Prune · ban-do.js: BẢN ĐỒ, ĐƯỜNG, ĐÈN, Ô ĐỖ, ĐIỂM GIAO, LỘ TRÌNH NPC
   Toạ độ tính theo "đơn vị bản đồ": 4 đơn vị = 1 mét trong game.
   ========================================================= */
'use strict';

/* =========================================================
   2. HẰNG SỐ CHUNG CỦA BẢN ĐỒ
   (Bộ máy bản đồ cũ viết tay theo 2 đường ngang, 2 đường dọc đã xoá ở bản 1.1 bước 7; mọi thứ nay tự sinh từ NODES / ROADS bên dưới.)
   ========================================================= */
const W = 1600, H = 1200, HALF = 40;     // khu phố hiện tại: rộng 1600, cao 1200 đơn vị; nửa bề rộng một đường thường
const CYCLE = 22;                        // chu kỳ đèn tín hiệu (giây)
const CURB = 18;                         // bán kính bo cong vỉa hè ở góc giao lộ
// Thứ tự khi xe tiến vào ngã tư: vạch dừng, vạch người đi bộ, rồi tới cột đèn ở góc giao lộ
const CW_NEAR = HALF + CURB + 4, CW_FAR = CW_NEAR + 12;   // vạch người đi bộ cách tâm ngã tư
const STOPG = CW_FAR + 6 - HALF;                         // vạch dừng cách mép ngã tư (đơn vị bản đồ)
const SPEED_LIMIT = 40;                  // tốc độ tối đa đường thường (biển P.127)
const SOLID_LEN = 90;                    // vạch vàng liền dài 90 đơn vị gần ngã tư và vòng xuyến
const EXT = 600;                         // đường kéo dài ra ngoài khu phố cho đẹp mắt
const SIDE = 22;                         // bề rộng vỉa hè quanh khối nhà

function lightOf(L, axis, t){
  const c = ((t + L.off) % CYCLE + CYCLE) % CYCLE;
  if (axis === 'NS'){ if (c < 8) return 'green'; if (c < 10) return 'yellow'; return 'red'; }
  if (c >= 11 && c < 19) return 'green'; if (c >= 19 && c < 21) return 'yellow'; return 'red';
}

/* =========================================================
   2b. BỘ MÁY BẢN ĐỒ DẠNG DỮ LIỆU (bản 1.1, xem mục 10.3 của docs/THIET-KE.md)
   Bản đồ khai báo bằng hai bảng: NODES (điểm nút) và ROADS (đoạn đường giữa hai nút).
   Mọi thứ còn lại tự sinh: vùng ngã tư, vỉa hè bo cong, vạch giữa, đoạn tốc độ, đồ thị chỉ đường, đèn.
   Đường đi theo góc bất kỳ, có thể cong (điểm uốn `via`). Từ bản 1.1 bước 7 đây là bộ máy duy nhất; kết quả trên khu hiện tại
   được so với bản mẫu tests/ban-mau-1.1.json (tests mục 21).
   ========================================================= */
// kind: 'light' (có đèn) | 'priority' (biển ưu tiên) | 'plain' (không biển) | 'ring' (vòng xuyến) | 'end' (mép bản đồ)
const NODES = [
  {id:'A', x:400,  y:300, kind:'light', light:{off:0}},
  {id:'B', x:800,  y:300, kind:'plain'},
  {id:'C', x:1200, y:300, kind:'light', light:{off:7}},
  {id:'D', x:400,  y:900, kind:'light', light:{off:14}},
  {id:'E', x:800,  y:900, kind:'plain'},
  {id:'F', x:1200, y:900, kind:'ring', ring:{rOut:100, rIn:48, rLane:76}},
  {id:'W1', x:0, y:300, kind:'end'}, {id:'E1', x:1600, y:300, kind:'end'},
  {id:'W2', x:0, y:900, kind:'end'}, {id:'E2', x:1600, y:900, kind:'end'},
  {id:'N1', x:400, y:0, kind:'end'}, {id:'S1', x:400, y:1200, kind:'end'},
  {id:'N2', x:1200, y:0, kind:'end'}, {id:'S2', x:1200, y:1200, kind:'end'}
];
// cap: 'big' (đường lớn) | 'normal' (đường thường) | 'alley' (hẻm) | 'ped' (phố đi bộ)
// half: nửa bề rộng mặt đường; lanes: số làn mỗi chiều; limit: tốc độ tối đa (km/h)
// noCar / noBike: biển cấm ô tô / xe máy; oneway: chỉ được đi từ a sang b; via: điểm uốn nếu đường cong
const RD = (id, a, b, name, more) => Object.assign({id, a, b, name, cap:'normal', half:HALF, lanes:1, limit:SPEED_LIMIT}, more || {});
const ROADS = [
  RD('hs0','W1','A','Đường Hoa Sữa'), RD('hs1','A','B','Đường Hoa Sữa'), RD('hs2','B','C','Đường Hoa Sữa'), RD('hs3','C','E1','Đường Hoa Sữa'),
  RD('mc0','W2','D','Đường Me Chua'), RD('mc1','D','E','Đường Me Chua'), RD('mc2','E','F','Đường Me Chua'), RD('mc3','F','E2','Đường Me Chua'),
  RD('bm0','N1','A','Phố Bánh Mì'), RD('bm1','A','D','Phố Bánh Mì', {limit:30, child:true}), RD('bm2','D','S1','Phố Bánh Mì'),
  RD('cv0','N2','C','Đường Cầu Vồng'), RD('cv1','C','F','Đường Cầu Vồng'), RD('cv2','F','S2','Đường Cầu Vồng'),
  RD('pc', 'B','E','Phố Chợ', {cap:'ped', half:22, lanes:0, noCar:true, noBike:true})
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
    for (const b of M.bays) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return {t:'bay', bay:b};
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
    if (!r.veh) return 'none';
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
  for (const id in M.nodes){ const nd = M.nodes[id]; if (nd.kind === 'light') M.lights.push({x: nd.x, y: nd.y, off: nd.light.off, node: id}); }
  // pha đèn của một nhánh: nhánh gần trục dọc màn hình là 'NS', còn lại 'EW' (đủ cho khu cũ; bản 1.2 khai báo pha riêng từng nhánh)
  M.armPhase = out => Math.abs(out.y) > Math.abs(out.x) ? 'NS' : 'EW';
  // Vạch dừng của từng nhánh xe ở mỗi nút có đèn (bản 1.1 bước 5): cách tâm nút gap + STOPG theo hướng nhánh.
  // d: hướng xe đi tới nút (ngược với hướng nhánh); sx, sy: điểm giữa vạch dừng trên tim đường; phase: pha đèn của nhánh
  M.stopLines = [];
  for (const L of M.lights){ const nd = M.nodes[L.node];
    for (const a of nd.arms){ if (!a.road.veh) continue;
      const g = (a.end === 'a' ? a.road.gapA : a.road.gapB).gap + STOPG;
      M.stopLines.push({L, node: L.node, road: a.road, half: a.half, d: {x: -a.out.x, y: -a.out.y}, sx: nd.x + a.out.x*g, sy: nd.y + a.out.y*g, phase: M.armPhase(a.out)}); } }
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
// Ô đỗ trên đường nằm ngang ('S': mép nam, xe hướng đông · 'N': mép bắc, hướng tây) hoặc nằm dọc ('E': mép đông, hướng bắc · 'W': mép tây, hướng nam)
function bayH(Y, side, x, half){ half = half || HALF; const y = side === 'S' ? Y + half - BAY_D : Y - half;
  return {x: x - BAY_L/2, y, w: BAY_L, h: BAY_D, cx: x, cy: y + BAY_D/2, side, proj: {x, y: Y},
          dir: side === 'S' ? {x: 1, y: 0} : {x: -1, y: 0}}; }
function bayV(X, side, y, half){ half = half || HALF; const x = side === 'E' ? X + half - BAY_D : X - half;
  return {x, y: y - BAY_L/2, w: BAY_D, h: BAY_L, cx: x + BAY_D/2, cy: y, side, proj: {x: X, y},
          dir: side === 'E' ? {x: 0, y: -1} : {x: 0, y: 1}}; }
// Đặt một ô đỗ khai báo {road, s, ben} lên bản đồ M. Ô vẫn là hình chữ nhật thẳng trục nên chỉ đặt được trên đường ngang / dọc;
// ô đỗ trên đường chéo, đường cong để bản 1.2 (cần ô xoay theo đường).
function datODo(M, o){
  const r = M.road(o.road); if (!r) throw new Error('Ô đỗ: không có đường ' + o.road);
  const p = M.pointAt(r, o.s), d = p.dir, k = o.ben === 'trai' ? -1 : 1, n = {x: -d.y*k, y: d.x*k};   // n: hướng ra lề có ô
  let b;
  if (Math.abs(d.y) < 1e-9) b = bayH(p.y, n.y > 0 ? 'S' : 'N', p.x, r.half);
  else if (Math.abs(d.x) < 1e-9) b = bayV(p.x, n.x > 0 ? 'E' : 'W', p.y, r.half);
  else throw new Error('Ô đỗ trên đường chéo / cong chưa làm (bản 1.2): ' + o.road);
  return Object.assign(b, {road: o.road, s: o.s, ben: o.ben});
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
  {name:'Tiệm thuốc Cô Hạnh', icon:'💊', road:'mc3', s:260, ben:'phai'}
];
// Ô đỗ không gắn điểm giao (chỗ tấp vào nghe điện thoại, nghỉ)
const O_DO_THEM = [{road:'hs2', s:200, ben:'trai'}, {road:'cv0', s:120, ben:'phai'}];
for (const d of DESTS) d.bay = datODo(MAP, d);
const BAYS = DESTS.map(d => d.bay).concat(O_DO_THEM.map(o => datODo(MAP, o)));
MAP.bays = BAYS;
for (const d of DESTS){   // chỗ ghi tên điểm giao: ngay ngoài ô đỗ, phía vỉa hè
  const b = d.bay;
  d.lx = b.side === 'E' ? b.x + b.w + 16 : b.side === 'W' ? b.x - 16 : b.cx;
  d.ly = b.side === 'S' ? b.y + b.h + 14 : b.side === 'N' ? b.y - 14 : b.cy;
}
// vị trí cột biển P của các ô đỗ (để biển chỉ dẫn, biển tốc độ không chồng lên)
const P_SIGNS = BAYS.map(b => ({x: b.w > b.h ? b.x + 6 : (b.side === 'E' ? b.x + b.w + 3 : b.x - 3), y: b.w > b.h ? (b.side === 'S' ? b.y + b.h + 3 : b.y - 3) : b.y + 6}));

/* =========================================================
   2d. BIỂN BÁO TỰ SINH TỪ BẢN ĐỒ (bản 1.1 bước 7)
   ========================================================= */
const otherNode = (M, r, id) => M.nodes[r.a === id ? r.b : r.a];
// Biển chỉ dẫn hướng đi (nền xanh, chữ trắng; dạng chung, không gán số hiệu) trước mỗi nút có từ 3 nhánh (kể cả phố đi bộ),
// trừ vòng xuyến. Đặt bên phải theo chiều đi, cách mép nút SIGN_BACK (thử lần lượt, chọn chỗ đầu tiên không sát cột biển P
// hay biển chỉ dẫn khác); mỗi biển ghi tên đường ở các hướng trái / thẳng / phải. Không đặt trên nhánh đi vào từ mép bản đồ hay từ phố đi bộ.
const SIGN_BACK = [110, 135, 85, 160];   // cách mép nút giao (khu cũ: cách tâm 150, 175, 125, 200)
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
      let pos = null;
      for (const back of SIGN_BACK){
        const q = {x: nd.x - hx*(gap + back) - hy*side, y: nd.y - hy*(gap + back) + hx*side};
        if (!pos) pos = q;
        if (!tranh.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 52) && !list.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 60)){ pos = q; break; }
      }
      list.push({x: pos.x, y: pos.y, rows, node: id});
    }
  }
  return list;
}
const SIGNBOARDS = sinhBienChiDan(MAP, P_SIGNS);
// Biển hạn chế tốc độ P.127 bên phải theo chiều đi, ngay sau mỗi nút (trừ mép bản đồ và vòng xuyến). Đường có trẻ em (child: true,
// khu cũ: khối Phố Bánh Mì có trường mầm non Sơn Ca) đặt biển W.225 "Trẻ em" rồi biển tốc độ của đường.
function sinhBienTocDo(M, tranhP, tranhChiDan){
  const list = [];
  const free = (q, r) => !tranhP.some(o => Math.hypot(o.x - q.x, o.y - q.y) < r) && !tranhChiDan.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 60) && !list.some(o => Math.hypot(o.x - q.x, o.y - q.y) < 40);
  const put = (kind, v, nd, d, base, side, backs) => {   // d: chiều xe đi; base: mép nút
    const rx = -d.y, ry = d.x; let pos = null;
    for (const b of backs){
      const q = {x: nd.x + d.x*(base + b) + rx*side, y: nd.y + d.y*(base + b) + ry*side};
      if (!pos) pos = q;
      if (free(q, 48)){ pos = q; break; }
    }
    list.push({kind, v, x: pos.x, y: pos.y});
  };
  for (const r of M.roads){ if (!r.veh) continue;
    for (const end of ['a', 'b']){
      const nd = M.nodes[r[end]]; if (nd.kind === 'end' || nd.kind === 'ring') continue;
      const d = end === 'a' ? r.dirA : r.dirB, base = Math.max((end === 'a' ? r.gapA : r.gapB).gap, r.half), side = r.half + 8;
      if (r.child){ put('child', 0, nd, d, base, side, [45, 70, 20]); put('limit', r.limit, nd, d, base, side, [100, 125, 150, 80]); }
      else put('limit', r.limit, nd, d, base, side, [70, 95, 120, 150]);
    } }
  return list;
}
const SPEED_SIGNS = sinhBienTocDo(MAP, P_SIGNS, SIGNBOARDS);

// Chốt CSGT (bản 0.11): hai chốt cố định. Xe đi qua "vạch kiểm tra" (cả hai chiều) mà đầu trần hoặc đang cầm điện thoại là bị thổi còi.
// Từ bản 1.1 bước 5: khai báo theo đường và quãng s (tính từ nút a của đường); vị trí, hướng vạch kiểm tra và chỗ đặt chòi
// tự tính từ MAP (hàm datTheoDuong). cabin: chòi cách tim đường bao nhiêu đơn vị, về phía bên phải theo chiều a→b.
const CSGT = [
  {id: 'hoasua',  road: 'hs2', s: 190, cabin: 52, name: 'Đường Hoa Sữa'},
  {id: 'cauvong', road: 'cv1', s: 400, cabin: 50, name: 'Đường Cầu Vồng'}
];
// Vạch qua đường cho người đi bộ ở hai đầu Phố Chợ (bản 1.0b), khai báo theo đường và quãng s như CSGT
const CROSSWALKS = [{road: 'hs1', s: 400}, {road: 'mc1', s: 400}];
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
  {road:'pc', s:180, lech:38}
];
// Các vật trang trí đứng trên bản đồ, tự sinh từ M (vẽ ở drawUprights trong game.js, bản đồ nhỏ ở drawMini)
function sinhTrangTri(M, bays){
  const t = {bienP: [], cotDen: [], bienVong: [], bienDiBo: [], nhanDiBo: [], nhanDuong: [], nhanMep: []};
  const phai = d => ({x: -d.y, y: d.x});
  // biển P ở mỗi ô đỗ
  for (const b of bays) t.bienP.push({x: b.w > b.h ? b.x + 6 : (b.side === 'E' ? b.x + b.w + 3 : b.x - 3), y: b.w > b.h ? (b.side === 'S' ? b.y + b.h + 3 : b.y - 3) : b.y + 6});
  // cột đèn: mỗi nhánh đi vào nút có đèn một cột, ở góc bên tay phải người lái, ngay sau mép nút (có camera phạt nguội trên đỉnh)
  for (const sl of M.stopLines){
    const nd = M.nodes[sl.node], g = (sl.road.a === sl.node ? sl.road.gapA : sl.road.gapB).gap, rt = phai(sl.d);
    t.cotDen.push({x: nd.x - sl.d.x*(g + 10) + rt.x*(sl.half + 10), y: nd.y - sl.d.y*(g + 10) + rt.y*(sl.half + 10), L: sl.L, phase: sl.phase});
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
   2e. NHÀ CỬA (khối nhà chữ nhật của khu hiện tại; bản 1.2 tự sinh khối nhà nhiều cạnh giữa các đường)
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
const BLOCKS = [];
{
  const bx = [[0,360],[440,1160],[1240,1600]], by = [[0,260],[340,860],[940,1200]];
  for (const [x1,x2] of bx) for (const [y1,y2] of by){
    if (x1 === 440 && y1 === 340){ BLOCKS.push({x1:440,x2:778,y1,y2}); BLOCKS.push({x1:822,x2:1160,y1,y2}); }
    else BLOCKS.push({x1,x2,y1,y2});
  }
}
const HOUSES = [];
const HOUSE_COLORS = ['#f6c89f','#f4a6a6','#a8d5e2','#cdb4db','#ffd6a5','#b9e4c9','#fbe7a1','#c9d6ff','#f2b5d4'];
for (const b of BLOCKS){
  const ax = b.x1 + SIDE, ay = b.y1 + SIDE, aw = b.x2 - b.x1 - 2*SIDE, ah = b.y2 - b.y1 - 2*SIDE;
  if (aw < 30 || ah < 30) continue;
  const nx = Math.max(1, Math.round(aw / 120)), ny = Math.max(1, Math.round(ah / 110));
  const market = (b.x1 === 822 && b.y1 === 340);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++){
    const r = {x: ax + i*aw/nx + 5, y: ay + j*ah/ny + 5, w: aw/nx - 10, h: ah/ny - 10};
    if (MAP.rings.some(g => rectCircleDist(r, g.x, g.y) < g.rOut + 18)) continue;   // chừa chỗ cho vòng xuyến
    const stall = market && r.x < 1010 && r.y > 380 && r.y < 760;
    const color = HOUSE_COLORS[Math.floor(rnd()*HOUSE_COLORS.length)];
    HOUSES.push({...r, stall, color, dark: darken(color, 0.72), awn: Math.floor(rnd()*4)});
  }
}
function hitsHouse(x, y, rad){
  for (const h of HOUSES)
    if (x > h.x - rad && x < h.x + h.w + rad && y > h.y - rad && y < h.y + h.h + rad) return true;
  return false;
}

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
