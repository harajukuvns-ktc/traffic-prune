/* =========================================================
   Traffic Prune · ve-nen.js: VẼ NỀN TĨNH TỪ DỮ LIỆU BẢN ĐỒ (bản 1.1, bước 2, xem mục 10.3 của docs/THIET-KE.md)
   veNen(g, M, o) vẽ toàn bộ phần nền không đổi (đường, vỉa hè, vạch, phố đi bộ, ô đỗ, vòng xuyến) chỉ từ MAP
   do dungBanDo() dựng, không dùng HR / VR / OW / RB cũ. Phần quản lý mảnh 512 × 512 nằm ở mục "nền" trong game.js.
   ========================================================= */
'use strict';

const NEN_MAU = {co: '#cfe6c4', via: '#e9e1d3', duong: '#5b6170', gach: '#e3d2ad', vang: '#f5c542'};

function veNen(g, M, o){
  o = o || {};
  const W_ = o.W, H_ = o.H, EXT_ = o.EXT;
  const sub = (a, b) => ({x: a.x - b.x, y: a.y - b.y});
  // Một hình chữ nhật có tâm (cx, cy), dài len theo hướng u, rộng wid theo hướng vuông góc, thêm vào đường dẫn hiện tại
  const quad = (cx, cy, u, len, wid) => {
    const vx = -u.y, vy = u.x, a = len / 2, b = wid / 2;
    g.moveTo(cx - u.x*a - vx*b, cy - u.y*a - vy*b); g.lineTo(cx + u.x*a - vx*b, cy + u.y*a - vy*b);
    g.lineTo(cx + u.x*a + vx*b, cy + u.y*a + vy*b); g.lineTo(cx - u.x*a + vx*b, cy - u.y*a + vy*b); g.closePath();
  };
  const polyline = pts => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); };
  const gapOf = (arm) => arm.end === 'a' ? arm.road.gapA.gap : arm.road.gapB.gap;
  // (bản 1.2) o.box = {x0, y0, x1, y1}: chỉ vẽ những đường, nút, ô đỗ chạm vùng này (mỗi mảnh nền chỉ vẽ phần của mình, bản đồ gấp 4 vẫn nhẹ)
  const bx = o.box, cham = (x0, y0, x1, y1) => !bx || !(x1 < bx.x0 || x0 > bx.x1 || y1 < bx.y0 || y0 > bx.y1);
  const ganDiem = (x, y, r) => cham(x - r, y - r, x + r, y + r);
  const allNodes = Object.keys(M.nodes).map(id => M.nodes[id]);
  const nodes = allNodes.filter(nd => ganDiem(nd.x, nd.y, (nd.kind === 'ring' ? nd.ring.rOut : 110) + 60));
  const roads = M.roads.filter(r => {
    if (!r.hop){ let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of r.pts){ x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
      const m = r.half + (o.SIDE || 0) + 4 + (M.nodes[r.a].kind === 'end' || M.nodes[r.b].kind === 'end' ? EXT_ : 0); r.hop = {x0: x0 - m, y0: y0 - m, x1: x1 + m, y1: y1 + m}; }
    return cham(r.hop.x0, r.hop.y0, r.hop.x1, r.hop.y1); });
  const corners = M.corners.filter(c => ganDiem(c.ex, c.ey, 120));
  const bays = M.bays.filter(b => ganDiem(b.cx, b.cy, 60));

  // 1. nền cỏ bên ngoài, vỉa hè trong khu, các khối nhà (mặt cỏ)
  g.fillStyle = NEN_MAU.co; g.fillRect(-EXT_, -EXT_, W_ + 2*EXT_, H_ + 2*EXT_);
  g.fillStyle = NEN_MAU.via; g.fillRect(0, 0, W_, H_);
  // (bản 1.2) cỏ phủ cả khu, chừa một vỉa hè quanh mép; rồi mỗi đường có một dải vỉa hè rộng SIDE hai bên, theo đúng hình đường
  // (chéo, cong, hẻm). Với đường ngang / dọc kết quả y như cách cũ (khối nhà chữ nhật lùi vào một vỉa hè).
  g.fillStyle = NEN_MAU.co; g.fillRect(o.SIDE, o.SIDE, W_ - 2*o.SIDE, H_ - 2*o.SIDE);
  g.strokeStyle = NEN_MAU.via; g.lineCap = 'butt'; g.lineJoin = 'round';
  for (const r of roads){
    let pts = r.pts.map(p => ({x: p.x, y: p.y})); const n = pts.length;
    if (!r.veh){ if (r.len - r.gapB.gap <= r.gapA.gap) continue; pts = [M.pointAt(r, r.gapA.gap), M.pointAt(r, r.len - r.gapB.gap)]; }
    else {
      if (M.nodes[r.a].kind === 'end'){ pts[0].x -= r.dirA.x*EXT_; pts[0].y -= r.dirA.y*EXT_; }
      if (M.nodes[r.b].kind === 'end'){ pts[n-1].x -= r.dirB.x*EXT_; pts[n-1].y -= r.dirB.y*EXT_; }
    }
    g.lineWidth = (r.half + o.SIDE)*2; polyline(pts); g.stroke();
  }
  // cỏ ngoài khu: phần vỉa hè của đường kéo dài ra ngoài mép bản đồ vẫn giữ (như đường), không cần xoá

  // 2. mặt đường: mỗi đường cho xe là một dải rộng 2·half dọc theo đường; đầu đường ở mép bản đồ kéo dài thêm EXT
  g.fillStyle = NEN_MAU.duong; g.strokeStyle = NEN_MAU.duong; g.lineCap = 'butt'; g.lineJoin = 'round';
  for (const r of roads){
    if (!r.veh) continue;
    const pts = r.pts.map(p => ({x: p.x, y: p.y})), n = pts.length;
    if (M.nodes[r.a].kind === 'end'){ pts[0].x -= r.dirA.x*EXT_; pts[0].y -= r.dirA.y*EXT_; }
    if (M.nodes[r.b].kind === 'end'){ pts[n-1].x -= r.dirB.x*EXT_; pts[n-1].y -= r.dirB.y*EXT_; }
    g.lineWidth = r.half*2; polyline(pts); g.stroke();
  }
  // vòng xuyến: hình tròn mặt đường
  for (const nd of nodes) if (nd.kind === 'ring'){ g.beginPath(); g.arc(nd.x, nd.y, nd.ring.rOut, 0, Math.PI*2); g.fill(); }
  // ngã tư lệch: lấp khoảng hở giữa các nhánh (với ngã tư vuông góc thì đã nằm trong mặt đường, không đổi gì)
  for (const c of corners){
    const nd = M.nodes[c.node]; if (!nd.junction) continue;
    const p = nd.arms.find(a => a.out === c.u), q = nd.arms.find(a => a.out === c.v);
    g.beginPath(); g.moveTo(nd.x, nd.y);
    g.lineTo(nd.x - p.out.y*p.half, nd.y + p.out.x*p.half); g.lineTo(c.ex, c.ey); g.lineTo(nd.x + q.out.y*q.half, nd.y - q.out.x*q.half);
    g.closePath(); g.fill();
  }
  // bo cong góc vỉa hè: phủ màu đường vào chỗ góc nhọn rồi vẽ lại cung vỉa hè
  for (const c of corners){
    g.fillStyle = NEN_MAU.duong; g.beginPath(); g.moveTo(c.ex, c.ey);
    g.lineTo(c.ex + c.u.x*c.tn, c.ey + c.u.y*c.tn); g.lineTo(c.cx, c.cy); g.lineTo(c.ex + c.v.x*c.tn, c.ey + c.v.y*c.tn); g.closePath(); g.fill();
    g.fillStyle = NEN_MAU.via; g.beginPath(); g.arc(c.cx, c.cy, M.curb, 0, Math.PI*2); g.fill();
  }

  // 3. phố đi bộ lát gạch (đường cap 'ped'): nằm giữa mép hai đường mà nó nối vào
  for (const r of roads){
    if (r.veh) continue;
    const s0 = r.gapA.gap, s1 = r.len - r.gapB.gap, d = r.seg[0].d, a = M.pointAt(r, s0), b = M.pointAt(r, s1), L = s1 - s0;
    if (L <= 0) continue;
    const mid = {x: (a.x + b.x)/2, y: (a.y + b.y)/2}, v = {x: -d.y, y: d.x};
    g.fillStyle = NEN_MAU.gach; g.beginPath(); quad(mid.x, mid.y, d, L, r.half*2); g.fill();
    g.strokeStyle = 'rgba(160,130,90,.45)'; g.lineWidth = 1; g.beginPath();
    for (let s = 0; s <= L + 1e-9; s += 14){ const p = {x: a.x + d.x*s, y: a.y + d.y*s};
      g.moveTo(p.x - v.x*r.half, p.y - v.y*r.half); g.lineTo(p.x + v.x*r.half, p.y + v.y*r.half); }
    for (let t = -r.half + 11; t < r.half; t += 11){
      g.moveTo(a.x + v.x*t, a.y + v.y*t); g.lineTo(b.x + v.x*t, b.y + v.y*t); }
    g.stroke();
    g.strokeStyle = '#e5484d'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath();   // vạch đỏ đứt ở hai đầu phố
    const sg = (v.y < 0 || (v.y === 0 && v.x < 0)) ? -1 : 1;   // luôn vẽ từ phía trái/trên sang phải/dưới cho nét đứt khớp
    for (const p of [a, b]){ g.moveTo(p.x - sg*v.x*r.half, p.y - sg*v.y*r.half); g.lineTo(p.x + sg*v.x*r.half, p.y + sg*v.y*r.half); }
    g.stroke(); g.setLineDash([]);
  }

  // 4. ô đỗ xe kẻ vạch trên lòng đường
  for (const b of bays){
    if (b.side){   // ô thẳng trục: vẽ như cũ
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(b.x, b.y, b.w, b.h);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.5; g.setLineDash([5, 4]);
      g.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2); g.setLineDash([]);
    } else {       // ô trên đường chéo: xoay theo hướng đường
      g.save(); g.translate(b.cx, b.cy); g.rotate(Math.atan2(b.dir.y, b.dir.x));
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(-b.L/2, -b.D/2, b.L, b.D);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.5; g.setLineDash([5, 4]);
      g.strokeRect(-b.L/2 + 1, -b.D/2 + 1, b.L - 2, b.D - 2); g.setLineDash([]); g.restore();
    }
    g.save(); g.translate(b.cx, b.cy); g.rotate(Math.atan2(b.dir.y, b.dir.x) + Math.PI/2);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '700 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('P', 0, 0); g.restore();
  }

  // 5. đảo giữa vòng xuyến
  for (const nd of nodes){
    if (nd.kind !== 'ring') continue;
    g.fillStyle = '#9fd38b'; g.beginPath(); g.arc(nd.x, nd.y, nd.ring.rIn, 0, Math.PI*2); g.fill();
    g.strokeStyle = '#f2efe6'; g.lineWidth = 4; g.beginPath(); g.arc(nd.x, nd.y, nd.ring.rIn, 0, Math.PI*2); g.stroke();
    for (let i = 0; i < 10; i++){ const a = i/10*Math.PI*2; g.fillStyle = ['#ff6b6b','#ffd43b','#ff8fd1'][i % 3];
      g.beginPath(); g.arc(nd.x + Math.cos(a)*28, nd.y + Math.sin(a)*28, 5, 0, Math.PI*2); g.fill(); }
    g.fillStyle = '#2f9e6b'; g.beginPath(); g.arc(nd.x, nd.y, 12, 0, Math.PI*2); g.fill();
  }

  // 6. vạch vàng giữa đường: liền gần nút giao, đứt ở giữa đoạn; dừng ở vạch dừng/ngã tư theo khoảng hở của từng đầu đường
  g.strokeStyle = NEN_MAU.vang; g.lineWidth = 3;
  // vạch dừng ở đầu đường: kéo dài ra ngoài mép bản đồ; sát mép vòng xuyến; dừng ở vạch dừng khi tới ngã tư; xuyên qua chỗ phố đi bộ cắt ngang
  const dungVach = (r, end) => {
    const e = end === 'a' ? r.gapA : r.gapB, nd = M.nodes[end === 'a' ? r.a : r.b];
    if (nd.kind === 'end') return -EXT_;
    if (nd.kind === 'ring') return e.gap;
    return nd.junction ? e.gap + (CW_FAR - HALF) + 6 : 0;
  };
  for (const r of roads){
    if (!r.veh || r.cap === 'alley') continue;   // hẻm không kẻ vạch giữa
    const st = dungVach(r, 'a'), en = r.len - dungVach(r, 'b');
    if (en <= st) continue;
    // liền: từ nút đến cách tâm nút (nửa bề rộng + solidLen), tính từ mép ngã tư như hàm lineAt
    const clamp_ = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const x1 = clamp_(r.gapA.solid ? r.gapA.gap + M.solidLen : -Infinity, st, en);
    const x2 = clamp_(r.gapB.solid ? r.len - r.gapB.gap - M.solidLen : Infinity, x1, en);
    const runs = [];
    if (x1 > st) runs.push({a: st, b: x1, t: 'solid'});
    if (x2 > x1) runs.push({a: x1, b: x2, t: 'broken'});
    if (en > x2) runs.push({a: x2, b: en, t: 'solid'});
    for (const q of runs){
      g.setLineDash(q.t === 'broken' ? [14, 12] : []);
      g.beginPath(); const p0 = M.pointAt(r, q.a); g.moveTo(p0.x, p0.y);
      if (r.via) for (let s = q.a + 10; s < q.b; s += 10){ const p = M.pointAt(r, s); g.lineTo(p.x, p.y); }
      const p1 = M.pointAt(r, q.b); g.lineTo(p1.x, p1.y); g.stroke();
    }
  }
  g.setLineDash([]);

  // 7. ngã tư có đèn: vạch người đi bộ và vạch dừng ở mỗi nhánh (vạch dừng nằm làn bên phải của xe đang tới)
  for (const nd of nodes){
    if (nd.kind !== 'light') continue;
    g.fillStyle = 'rgba(255,255,255,.62)'; g.beginPath();
    for (const arm of nd.arms){ if (!arm.road.veh) continue;
      const gp = gapOf(arm), mid = gp + CURB + 4 + 6, o_ = arm.out;
      for (let i = -3; i <= 3; i++) quad(nd.x + o_.x*mid - o_.y*i*11, nd.y + o_.y*mid + o_.x*i*11, o_, 12, 6);
    }
    g.fill();
    g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.beginPath();
    for (const arm of nd.arms){ if (!arm.road.veh) continue;
      const sd = gapOf(arm) + (CW_FAR - HALF) + 6, o_ = arm.out, rx = o_.y, ry = -o_.x;   // rx, ry: bên phải của xe đang chạy vào nút
      const px = nd.x + o_.x*sd, py = nd.y + o_.y*sd;
      g.moveTo(px + rx, py + ry); g.lineTo(px + rx*arm.half, py + ry*arm.half);
    }
    g.stroke();
  }

  // 8. vạch người đi bộ qua đường ở đầu phố đi bộ (sọc song song chiều xe, dài 28)
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath();
  for (const nd of nodes){
    if (!nd.arms.some(a => !a.road.veh)) continue;
    const va = nd.arms.find(a => a.road.veh); if (!va) continue;
    const u = va.out;
    for (let i = -3; i <= 3; i++) quad(nd.x - u.y*i*11, nd.y + u.x*i*11, u, 28, 6);
  }
  g.fill();

  // 9. vạch nhường đường ở cửa vào vòng xuyến
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath();
  for (const nd of nodes){
    if (nd.kind !== 'ring') continue;
    for (const arm of nd.arms){ if (!arm.road.veh) continue;
      const o_ = arm.out, d = nd.ring.rOut + 2, px = nd.x + o_.x*d, py = nd.y + o_.y*d, rx = o_.y, ry = -o_.x;
      g.moveTo(px + rx*arm.half, py + ry*arm.half); g.lineTo(px, py); }
  }
  g.stroke();

  // 10. ranh giới khu chơi thử: vạch trắng đứt ngang đường ở mép bản đồ
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 4; g.setLineDash([8, 6]); g.beginPath();
  for (const nd of nodes){
    if (nd.kind !== 'end') continue;
    const arm = nd.arms[0]; if (!arm || !arm.road.veh) continue;
    const o_ = arm.out; let px = -o_.y, py = o_.x; if (py < 0 || (py === 0 && px < 0)){ px = -px; py = -py; }
    const cx = nd.x + o_.x*2, cy = nd.y + o_.y*2;
    g.moveTo(cx - px*arm.half, cy - py*arm.half); g.lineTo(cx + px*arm.half, cy + py*arm.half);
  }
  g.stroke(); g.setLineDash([]);
}
