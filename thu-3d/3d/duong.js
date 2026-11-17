/* =========================================================
   Traffic Prune · thu-3d/3d/duong.js: MẶT ĐẤT, VỈA HÈ, BÓ VỈA (từng ô bản đồ)
   Mặt đất của mỗi ô là một ảnh do chính veNen() của game vẽ (vạch kẻ, ô đỗ, vạch người đi bộ đúng y bản 2D), rồi
   "làm thật" thêm: nhựa đường có hạt và vết vá, nắp cống, vỉa hè lát gạch, sân bê tông quanh nhà, cỏ loang màu.
   Vỉa hè nhô cao: dò đường viền lòng đường bằng MAP.classify() của game nên dùng được cho đường chéo, đường cong.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, CAO = TP3.CAO_VIA;
const MAU_BO = '#b4aea2';
// loại mặt đất tại một điểm (ngoài mép bản đồ coi như đường kéo dài thẳng ra, giống veNen)
TP3.loaiDat = (x, y) => MAP.classify(clamp(x, 0.5, W - 0.5), clamp(y, 0.5, H - 0.5)).t;
TP3.laVia = t => t === 'off' || t === 'island' || t === 'ped';   // chỗ nhô cao: vỉa hè, cỏ, đảo vòng xuyến, phố đi bộ
TP3.caoDat = (x, y) => TP3.laVia(TP3.loaiDat(x, y)) ? CAO : 0;

/* ---------- ảnh mặt đất của một ô ---------- */
const RGB = {duong: [91, 97, 112], via: [233, 225, 211], co: [207, 230, 196], gach: [227, 210, 173], san: [214, 207, 193]};
function anhMatDat(o){
  const ngoai = o.x1 <= 0 || o.y1 <= 0 || o.x0 >= W || o.y0 >= H;   // ô nằm ngoài bản đồ (chỉ có đoạn đường kéo dài): ảnh nét bằng một nửa cho đỡ tốn bộ nhớ
  const k = TP3.Q.nen * (ngoai ? 0.5 : 1), le = 2 / k, R = TP3.O_RONG, n = Math.round((R + 2*le) * k), c = TP3.taoCanvas(n, n), g = c.getContext('2d');
  const X0 = o.x0 - le, Y0 = o.y0 - le;
  g.setTransform(k, 0, 0, k, -X0 * k, -Y0 * k);
  veNen(g, MAP, {W, H, EXT, SIDE, box: {x0: X0, y0: Y0, x1: o.x1 + le, y1: o.y1 + le}});
  // sân bê tông quanh mỗi nhà (thay dải cỏ hẹp của bản 2D), có viền sẫm ở chân tường
  for (const h of MAP.houses || []){
    if (h.x > o.x1 + 12 || h.x + h.w < o.x0 - 12 || h.y > o.y1 + 12 || h.y + h.h < o.y0 - 12) continue;
    g.fillStyle = 'rgb(' + RGB.san + ')'; g.fillRect(h.x - 7, h.y - 7, h.w + 14, h.h + 14);
  }
  for (const h of MAP.houses || []){
    if (h.x > o.x1 + 12 || h.x + h.w < o.x0 - 12 || h.y > o.y1 + 12 || h.y + h.h < o.y0 - 12) continue;
    g.strokeStyle = 'rgba(40,34,26,.10)'; g.lineWidth = 7; g.strokeRect(h.x, h.y, h.w, h.h);
    g.strokeStyle = 'rgba(40,34,26,.16)'; g.lineWidth = 3; g.strokeRect(h.x, h.y, h.w, h.h);
  }
  // vạch kiểm tra màu cam ở chốt CSGT (bản 2D vẽ trong drawCSGT)
  g.strokeStyle = 'rgba(255,140,0,.85)'; g.lineWidth = 2.2; g.setLineDash([7, 6]); g.beginPath();
  for (const p of CSGT){ if (p.off) continue; g.moveTo(p.x - p.n.x*p.half, p.y - p.n.y*p.half); g.lineTo(p.x + p.n.x*p.half, p.y + p.n.y*p.half); }
  g.stroke(); g.setLineDash([]);
  // vết vá nhựa và nắp cống rải trên lòng đường (chỗ cố định theo ô)
  const r = TP3.rng(o.i * 131 + o.j * 977 + 5);
  for (let i = 0; i < 16; i++){
    const x = o.x0 + r() * R, y = o.y0 + r() * R, cl = MAP.classify(clamp(x, 1, W - 1), clamp(y, 1, H - 1));
    if (!cl.road || !cl.road.veh || cl.t === 'bay' || Math.abs(cl.lat) > cl.road.half - 9) continue;
    g.save(); g.translate(x, y); g.rotate(Math.atan2(cl.dir.y, cl.dir.x));
    if (i % 4 === 0){ g.fillStyle = 'rgba(30,31,34,.5)'; g.beginPath(); g.arc(0, 0, 3.2, 0, Math.PI*2); g.fill(); g.strokeStyle = 'rgba(150,152,158,.45)'; g.lineWidth = 0.7; g.beginPath(); g.arc(0, 0, 2.4, 0, Math.PI*2); g.stroke(); }
    else { g.fillStyle = 'rgba(' + (r() < 0.5 ? '20,21,24' : '150,152,160') + ',' + (0.10 + r()*0.08) + ')'; g.fillRect(-8 - r()*16, -3 - r()*5, 16 + r()*30, 6 + r()*9); }
    g.restore();
  }
  // tô lại từng điểm ảnh theo loại mặt đất (nhận ra qua màu veNen đã tô)
  g.setTransform(1, 0, 0, 1, 0, 0);
  const d = g.getImageData(0, 0, n, n), a = d.data, NH = TP3.nhieu, gan = (i, m, s) => Math.abs(a[i] - m[0]) + Math.abs(a[i+1] - m[1]) + Math.abs(a[i+2] - m[2]) < s;
  for (let iy = 0; iy < n; iy++){
    const wy = Y0 + iy / k;
    for (let ix = 0; ix < n; ix++){
      const i = (iy * n + ix) * 4, wx = X0 + ix / k;
      const n1 = NH.lay(Math.floor(wx * 2.2), Math.floor(wy * 2.2)), n2 = NH.lay(Math.floor(wx * 0.45) + 91, Math.floor(wy * 0.45) + 37);
      if (gan(i, RGB.duong, 30)){            // nhựa đường: xám trung tính, loang mảng lớn và hạt nhỏ
        const m = 0.8 + 0.22 * n2 + 0.16 * n1; a[i] = 84 * m; a[i+1] = 86 * m; a[i+2] = 91 * m;
      } else if (gan(i, RGB.via, 26)){       // vỉa hè lát gạch 8 × 8, hai tông màu so le, mạch gạch sẫm
        const tx = Math.floor(wx / 8), ty = Math.floor(wy / 8), fx = wx - tx * 8, fy = wy - ty * 8, mach = fx < 0.7 || fy < 0.7;
        const so = ((tx + ty) & 1) ? 1 : 0.93, m = (mach ? 0.8 : so) * (0.93 + 0.12 * n1);
        a[i] = 190 * m; a[i+1] = 180 * m; a[i+2] = 167 * m;
      } else if (gan(i, RGB.san, 14)){       // sân bê tông: tấm lớn 24 × 24, loang bẩn
        const fx = ((wx % 24) + 24) % 24, fy = ((wy % 24) + 24) % 24, m = (fx < 0.6 || fy < 0.6 ? 0.84 : 1) * (0.86 + 0.2 * n2);
        a[i] = 190 * m; a[i+1] = 185 * m; a[i+2] = 175 * m;
      } else if (gan(i, RGB.co, 34)){        // cỏ: hai tông xanh loang
        const m = 0.78 + 0.32 * n1, t = n2;
        a[i] = (96 + 44 * t) * m; a[i+1] = (150 + 30 * t) * m; a[i+2] = (74 + 20 * t) * m;
      } else if (gan(i, RGB.gach, 26)){      // phố đi bộ lát gạch
        const m = 0.9 + 0.14 * n1; a[i] *= m; a[i+1] *= m * 0.98; a[i+2] *= m * 0.95;
      } else { const m = 0.9 + 0.12 * n1; a[i] *= m; a[i+1] *= m; a[i+2] *= m; }   // vạch sơn: hơi mòn
    }
  }
  g.putImageData(d, 0, 0);
  const anh = TP3.anhTuCanvas(c, {net: TP3.mucTen === 'thap' ? 2 : 4});
  anh.onUpdate = () => { c.width = c.height = 1; anh.onUpdate = null; };   // đưa lên card đồ họa xong thì bỏ bản trên bộ nhớ thường (mất ngữ cảnh WebGL thì dựng lại ô)
  TP3.khoAnh.push({w: n, h: n, o: o.khoa});
  const u0 = le * k / n;
  return {anh, uv: (x, y) => [u0 + (x - o.x0) / R * (1 - 2*u0), 1 - u0 - (y - o.y0) / R * (1 - 2*u0)]};
}

/* ---------- dò viền vỉa hè trong một ô ---------- */
function doVien(o){
  const g = 8, nx = Math.round((o.x1 - o.x0) / g), ny = Math.round((o.y1 - o.y0) / g), rong = nx + 1, e = 0.004;
  const cao = (x, y) => x > o.x0 + e && x < o.x1 - e && y > o.y0 + e && y < o.y1 - e && TP3.laVia(TP3.loaiDat(x, y));
  const luoi = new Uint8Array(rong * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) luoi[j*rong + i] = cao(o.x0 + i*g, o.y0 + j*g) ? 1 : 0;
  const diem = [], khoa = new Map();
  const cat = (i0, j0, i1, j1) => {   // điểm đổi trạng thái trên cạnh lưới: chia đôi 10 lần
    const kk = (j0*rong + i0) * 2 + (i0 === i1 ? 1 : 0); let id = khoa.get(kk); if (id !== undefined) return id;
    let ax = o.x0 + i0*g, ay = o.y0 + j0*g, bx = o.x0 + i1*g, by = o.y0 + j1*g;
    if (!luoi[j0*rong + i0]){ [ax, bx] = [bx, ax]; [ay, by] = [by, ay]; }
    for (let t = 0; t < 10; t++){ const mx = (ax + bx) / 2, my = (ay + by) / 2; if (cao(mx, my)){ ax = mx; ay = my; } else { bx = mx; by = my; } }
    id = diem.length; diem.push({x: (ax + bx) / 2, y: (ay + by) / 2}); khoa.set(kk, id); return id;
  };
  const ke = [], noi = (a, b) => { (ke[a] = ke[a] || []).push(b); (ke[b] = ke[b] || []).push(a); };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
    const ma = luoi[j*rong + i] | luoi[j*rong + i + 1] << 1 | luoi[(j+1)*rong + i + 1] << 2 | luoi[(j+1)*rong + i] << 3;
    if (ma === 0 || ma === 15) continue;
    const Tr = () => cat(i, j, i + 1, j), Ph = () => cat(i + 1, j, i + 1, j + 1), Du = () => cat(i, j + 1, i + 1, j + 1), Ta = () => cat(i, j, i, j + 1);
    switch (ma){
      case 1: case 14: noi(Ta(), Tr()); break;  case 2: case 13: noi(Tr(), Ph()); break;  case 3: case 12: noi(Ta(), Ph()); break;
      case 4: case 11: noi(Ph(), Du()); break;  case 6: case 9: noi(Tr(), Du()); break;   case 7: case 8: noi(Ta(), Du()); break;
      case 5: noi(Ta(), Tr()); noi(Ph(), Du()); break;  case 10: noi(Tr(), Ph()); noi(Du(), Ta()); break;
    }
  }
  const da = new Uint8Array(diem.length), vong = [];
  for (let s = 0; s < diem.length; s++){
    if (da[s] || !ke[s]) continue;
    const v = []; let truoc = -1, cur = s;
    while (cur !== undefined && !da[cur]){ da[cur] = 1; v.push(diem[cur]); const nxt = ke[cur][0] !== truoc ? ke[cur][0] : ke[cur][1]; truoc = cur; cur = nxt; }
    if (v.length >= 3) vong.push(v);
  }
  const gon = v => {   // bỏ điểm thẳng hàng, giữ điểm trên cung tròn
    let doi = true;
    while (doi && v.length > 3){ doi = false;
      for (let i = 0; i < v.length && v.length > 3; i++){
        const p0 = v[(i + v.length - 1) % v.length], p1 = v[i], p2 = v[(i + 1) % v.length], L = Math.hypot(p2.x - p0.x, p2.y - p0.y) || 1;
        if (Math.abs((p1.x - p0.x)*(p2.y - p0.y) - (p1.y - p0.y)*(p2.x - p0.x)) / L < 0.05){ v.splice(i, 1); i--; doi = true; }
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

TP3.themLop('duong', (o, G) => {
  const {anh, uv} = anhMatDat(o), P = [], N = [], UV = [], I = [];
  const dinh = (x, h, y) => { P.push(x, h, y); N.push(0, 1, 0); const u = uv(x, y); UV.push(u[0], u[1]); return P.length / 3 - 1; };
  { const a = dinh(o.x0, 0, o.y0), b = dinh(o.x1, 0, o.y0), c = dinh(o.x1, 0, o.y1), d = dinh(o.x0, 0, o.y1); I.push(a, d, c, a, c, b); }   // lòng đường
  const {vong, cao} = doVien(o), sau = vong.map(v => vong.reduce((n, w) => n + (w !== v && trongDaGiac(v[0], w) ? 1 : 0), 0));
  vong.forEach((v, iv) => {
    if (sau[iv] % 2 === 0){   // vòng ngoài của một mảng vỉa hè; vòng nằm ngay trong nó là lỗ
      const lo = vong.filter((w, iw) => sau[iw] === sau[iv] + 1 && trongDaGiac(w[0], v)), V2 = a => a.map(p => new T.Vector2(p.x, p.y));
      const tatCa = v.concat(...lo), id0 = P.length / 3;
      for (const p of tatCa) dinh(p.x, CAO, p.y);
      for (const f of T.ShapeUtils.triangulateShape(V2(v), lo.map(V2))){
        const a = tatCa[f[0]], b = tatCa[f[1]], c = tatCa[f[2]];
        if ((b.y - a.y)*(c.x - a.x) - (b.x - a.x)*(c.y - a.y) >= 0) I.push(id0 + f[0], id0 + f[1], id0 + f[2]); else I.push(id0 + f[0], id0 + f[2], id0 + f[1]);
      }
    }
    for (let i = 0; i < v.length; i++){   // thành bó vỉa quay về phía lòng đường; chân bó vỉa sẫm hơn (bụi bẩn đọng)
      const p = v[i], q = v[(i + 1) % v.length], L = Math.hypot(q.x - p.x, q.y - p.y); if (L < 1e-6) continue;
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      if (mx < o.x0 + 0.3 || mx > o.x1 - 0.3 || my < o.y0 + 0.3 || my > o.y1 - 0.3) continue;   // mép ô: không cần thành
      let nx = (q.y - p.y) / L, ny = -(q.x - p.x) / L;
      if (cao(mx + nx*0.6, my + ny*0.6)){ nx = -nx; ny = -ny; }
      G.duc.tu([p.x, 0, p.y], [q.x, 0, q.y], [q.x, CAO, q.y], [p.x, CAO, p.y], [nx, 0, ny], MAU_BO, {ao: [0.62, 0.62, 1, 1]});
    }
  });
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array(P), 3));
  g.setAttribute('normal', new T.BufferAttribute(new Float32Array(N), 3));
  g.setAttribute('uv', new T.BufferAttribute(new Float32Array(UV), 2));
  g.setIndex(I); g.computeBoundingSphere();
  const luoi = new T.Mesh(g, TP3.vl.matDat(anh)); luoi.receiveShadow = true; luoi.userData.anh = anh;
  G.them.push(luoi);
});

// Nền xa: mặt cỏ phẳng và dải đường trơn cho cả bản đồ, nằm dưới các ô một chút. Ô chưa dựng (hoặc ngoài vùng dựng) thì thấy lớp này.
TP3.dungNenXa = function(){
  const G = new TP3.Gom(), R = 4000, yCo = -0.6, yDuong = -0.3;
  G.tu([-R, yCo, -R], [W + R, yCo, -R], [W + R, yCo, H + R], [-R, yCo, H + R], [0, 1, 0], '#8fb47a');
  for (const r of MAP.roads){
    if (!r.veh) continue;
    const pts = r.pts.map(p => ({x: p.x, y: p.y})), n = pts.length;
    if (MAP.nodes[r.a].kind === 'end'){ pts[0].x -= r.dirA.x*EXT; pts[0].y -= r.dirA.y*EXT; }
    if (MAP.nodes[r.b].kind === 'end'){ pts[n-1].x -= r.dirB.x*EXT; pts[n-1].y -= r.dirB.y*EXT; }
    for (let i = 0; i + 1 < n; i++){
      const p = pts[i], q = pts[i+1], L = Math.hypot(q.x - p.x, q.y - p.y) || 1, vx = -(q.y - p.y) / L * r.half, vy = (q.x - p.x) / L * r.half, k = (r.half + SIDE) / r.half;
      // dải vỉa hè phẳng hai bên (ô xa chưa dựng vẫn thấy vỉa hè sáng màu), rồi mặt đường
      G.tu([p.x - vx*k, yDuong - 0.15, p.y - vy*k], [q.x - vx*k, yDuong - 0.15, q.y - vy*k], [q.x + vx*k, yDuong - 0.15, q.y + vy*k], [p.x + vx*k, yDuong - 0.15, p.y + vy*k], [0, 1, 0], '#b3aa9b');
      G.tu([p.x - vx, yDuong, p.y - vy], [q.x - vx, yDuong, q.y - vy], [q.x + vx, yDuong, q.y + vy], [p.x + vx, yDuong, p.y + vy], [0, 1, 0], '#585a60');
    }
  }
  for (const rg of MAP.rings) G.tru(rg.x, yDuong - 0.1, rg.y, rg.rOut, rg.rOut, 0.1, 20, '#585a60', {nap: true});
  const luoi = new T.Mesh(G.hinh(), TP3.vl.duc); luoi.frustumCulled = false; luoi.matrixAutoUpdate = false; luoi.receiveShadow = true;
  return luoi;
};
})();
