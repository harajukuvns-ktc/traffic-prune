/* Bài kiểm "vật chưa có hình 3D" (chạy bằng Node, không cần trình duyệt):
     cd thu-3d/kiem-tra && node kiem-vat.js            → in "Tất cả đều có hình 3D" khi đủ
     node kiem-vat.js --gia-lap                        → giả lập game có thêm một loại biển mới, để thấy bài kiểm bắt được
   Cách kiểm: nạp "bộ não" của game (../../js theo thứ tự trong ../index.html) cùng 3d/danh-muc.js, rồi
   1. mọi bảng dữ liệu của game (loại biển tốc độ, các bảng trong trangTri, loại đường, loại nút, ô đỗ, chốt...) phải có một mục danh mục lo;
   2. mỗi mục phải có hàm dựng thật: loại 'hinh' cần TP3.hinhVat.<tên> trong 3d/*.js (không có thì đang dùng HÌNH THAY THẾ),
      loại 'lop' cần lớp đã đăng ký bằng TP3.themLop, biển cần nét vẽ mặt biển trong MAT_BIEN;
   3. mỗi vật phải có toạ độ hợp lệ nằm trong vùng dựng; biển phải có hướng mặt. */
'use strict';
const fs = require('fs'), path = require('path');
const GOC = path.resolve(__dirname, '..'), html = fs.readFileSync(path.join(GOC, 'index.html'), 'utf8');
const game = [...html.matchAll(/<script src="(\.\.\/js\/[^"]+)"><\/script>/g)].map(m => fs.readFileSync(path.join(GOC, m[1]), 'utf8')).join('\n;\n');
const ma3d = {}; for (const f of fs.readdirSync(path.join(GOC, '3d'))) if (f.endsWith('.js')) ma3d[f] = fs.readFileSync(path.join(GOC, '3d', f), 'utf8');
const tatCa3d = Object.values(ma3d).join('\n');
// DOM giả tối thiểu (giống tests/harness.js)
const ctxProxy = new Proxy({}, {get(t, p){ if (p === 'measureText') return s => ({width: String(s).length * 7}); if (p in t) return t[p]; return () => ctxProxy; }, set(t, p, v){ t[p] = v; return true; }});
const el = () => ({querySelectorAll: () => [], style: {}, classList: {add(){}, remove(){}, toggle(){}}, addEventListener(){}, setAttribute(){}, innerHTML: '', textContent: '', value: 'anh', checked: true, className: '', dataset: {}, getContext: () => ctxProxy});
const els = {}, store = {};
global.document = {getElementById: id => (els[id] = els[id] || el()), querySelectorAll: () => [], querySelector: () => null, body: el(), addEventListener(){}, hidden: false, createElement: undefined};
global.localStorage = {getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; }};
global.window = global; window.innerWidth = 1280; window.innerHeight = 800; window.devicePixelRatio = 1; window.addEventListener = () => {}; window.matchMedia = () => ({matches: false}); global.requestAnimationFrame = () => {};
const giaLap = process.argv.includes('--gia-lap') ? "SPEED_SIGNS.push({kind: 'stop', v: 0, x: 500, y: 250}); TP3_GIA = true;" : '';
(0, eval)('(function(){' + game + '\n; var TP3_GIA = false; ' + giaLap + ' window.TP3 = {hong: false};\n' + ma3d['danh-muc.js'] +
  '\n; if (TP3_GIA) TP3.DANH_MUC.push({ma: "R.122", ten: "Biển dừng lại (giả lập)", phu: [], kieu: "hinh", hinh: "bienStop", nguon: () => SPEED_SIGNS.filter(s => s.kind === "stop")});\n window.__KV = {W, H, MAP, SIGNBOARDS, BAYS}; })()');
const TP3 = window.TP3, {W, H} = window.__KV, loi = [], thayThe = [];
const lo = new Set(TP3.DANH_MUC.flatMap(m => m.phu || []));
for (const b of TP3.bangCanLo()) if (!lo.has(b)) loi.push('Bảng dữ liệu "' + b + '" của game chưa có mục danh mục nào lo (vật loại này KHÔNG được dựng trong 3D)');
console.log('mã | tên | kiểu | số vật | hình');
let tong = 0;
for (const m of TP3.DANH_MUC){
  let ds = []; try { ds = m.nguon() || []; } catch (e){ loi.push(m.ma + ': hàm nguon() lỗi: ' + e.message); }
  tong += ds.length;
  let hinh = m.hinh, on = true;
  if (m.kieu === 'hinh'){ on = new RegExp('TP3\\.hinhVat\\.' + m.hinh + '\\s*=').test(tatCa3d); if (!on){ thayThe.push(m.ma + ' (' + m.ten + ', ' + ds.length + ' vật)'); hinh = 'HÌNH THAY THẾ (chưa có TP3.hinhVat.' + m.hinh + ')'; } }
  else if (m.kieu === 'lop'){ if (!tatCa3d.includes("TP3.themLop('" + m.hinh + "'")) loi.push(m.ma + ': chưa có lớp dựng cảnh "' + m.hinh + '"'); }
  else if (m.kieu === 'mat-dat'){ if (!(m.hinh === 'veNen' ? /function veNen/.test(game) : ma3d['duong.js'].includes('function ' + m.hinh))) loi.push(m.ma + ': không thấy hàm vẽ mặt đất "' + m.hinh + '"'); }
  else if (m.kieu === 'chu-noi'){ if (!ma3d['chu-noi.js'] || !ma3d['chi-duong.js']) loi.push(m.ma + ': thiếu chu-noi.js / chi-duong.js'); }
  else loi.push(m.ma + ': kiểu lạ "' + m.kieu + '"');
  for (const v of ds){
    if (!(Number.isFinite(v.x) && Number.isFinite(v.y))){ loi.push(m.ma + ': có vật không có toạ độ'); break; }
    if (v.x < -512 || v.y < -512 || v.x > W + 512 || v.y > H + 512){ loi.push(m.ma + ': có vật nằm ngoài vùng dựng (' + Math.round(v.x) + ', ' + Math.round(v.y) + ')'); break; }
    if (m.kieu === 'hinh' && m.hinh === 'bien' && on){
      if (!v.n || Math.abs(Math.hypot(v.n.x, v.n.y) - 1) > 0.01){ loi.push(m.ma + ': có biển không có hướng mặt'); break; }
      if (!v.mat || !new RegExp('\\b' + v.mat[0] + ':').test(ma3d['bien.js'])){ loi.push(m.ma + ': chưa có nét vẽ mặt biển "' + (v.mat && v.mat[0]) + '" trong MAT_BIEN'); break; }
    }
  }
  console.log([m.ma, m.ten, m.kieu, ds.length, hinh].join(' | '));
}
// 4. HƯỚNG MẶT BIỂN VÀ CỘT ĐÈN (kiểm độc lập với cách suy hướng trong danh-muc.js):
//    - biển một mặt phải nằm BÊN PHẢI làn xe mà nó quay mặt về (xe đi theo chiều −n thấy biển ở bên tay phải, cách tim đường hơn nửa bề rộng đường);
//    - biển chỉ dẫn đặt TRƯỚC nút của nó: xe đi theo chiều −n phải đang tiến về nút đó;
//    - biển vòng xuyến: xe phải đang tiến về tâm vòng xuyến; biển P: xe phải đang tiến về ô đỗ;
//    - hộp đèn: người đứng ở vạch dừng của nhánh đó phải thấy mặt đèn (góc lệch dưới 75°), hộp chính ở bên phải nhánh.
{ const M = window.__KV.MAP, hinh = Object.fromEntries(TP3.DANH_MUC.map(m => [m.ma, m])), sai = [];
  const duongGan = (x, y) => { let t = null; for (const r of M.roads){ if (!r.veh) continue; for (const g of r.seg){
      const k = Math.max(0, Math.min(g.l, (x - g.p.x)*g.d.x + (y - g.p.y)*g.d.y)), d = Math.hypot(x - g.p.x - g.d.x*k, y - g.p.y - g.d.y*k);
      if (!t || d < t.d) t = {d, r, dir: g.d, lat: -(x - g.p.x)*g.d.y + (y - g.p.y)*g.d.x}; } } return t; };
  const ghi = (ma, v, ly) => sai.push(ma + ' ở (' + Math.round(v.x) + ', ' + Math.round(v.y) + '): ' + ly);
  for (const ma of ['P.127', 'W.225', 'chi-dan', 'R.303', 'bien-P']){
    const ds = hinh[ma].nguon(), goc = ma === 'chi-dan' ? window.__KV.SIGNBOARDS : null;
    ds.forEach((v, i) => {
      const t = {x: -v.n.x, y: -v.n.y};   // chiều xe đi mà biển quay mặt về
      // làn mà biển phục vụ: đường gần nhất có hướng song song với t
      let tot = null; for (const r of M.roads){ if (!r.veh) continue; for (const g of r.seg){ if (Math.abs(g.d.x*t.x + g.d.y*t.y) < 0.9) continue;
        const k = Math.max(0, Math.min(g.l, (v.x - g.p.x)*g.d.x + (v.y - g.p.y)*g.d.y)), d = Math.hypot(v.x - g.p.x - g.d.x*k, v.y - g.p.y - g.d.y*k);
        if (!tot || d < tot.d) tot = {d, r, px: g.p.x + g.d.x*k, py: g.p.y + g.d.y*k}; } }
      if (!tot || tot.d > tot.r.half + 30) return ghi(ma, v, 'không có đường nào song song với hướng biển ở gần (cách ' + (tot ? Math.round(tot.d) : '?') + ')');
      const phai = (v.x - tot.px) * (-t.y) + (v.y - tot.py) * t.x;   // dương: biển ở bên phải của xe đi theo chiều t
      if (phai < tot.r.half - 1) ghi(ma, v, 'biển không nằm bên phải làn xe nó quay mặt về (lệch ' + Math.round(phai) + ', đường ' + tot.r.id + ')');
      if (goc){ const nd = M.nodes[goc[i].node]; if ((nd.x - v.x)*t.x + (nd.y - v.y)*t.y <= 0) ghi(ma, v, 'biển chỉ dẫn quay lưng về nút ' + goc[i].node); }
      if (ma === 'R.303'){ const g = M.rings.reduce((a, b) => Math.hypot(b.x - v.x, b.y - v.y) < Math.hypot(a.x - v.x, a.y - v.y) ? b : a); if ((g.x - v.x)*t.x + (g.y - v.y)*t.y <= 0) ghi(ma, v, 'biển vòng xuyến quay lưng về vòng xuyến'); }
      if (ma === 'bien-P'){ const b = window.__KV.BAYS[i];   // xe đang tới (cách tâm ô 80 về phía ngược chiều đi) phải thấy mặt biển
        if ((b.cx - b.dir.x*80 - v.x)*v.n.x + (b.cy - b.dir.y*80 - v.y)*v.n.y <= 0 || Math.hypot(b.cx - v.x, b.cy - v.y) > 60) ghi(ma, v, 'biển P không quay mặt về xe đang tới ô đỗ'); }
    });
  }
  let soHop = 0; const cot = hinh['cot-den'].nguon();
  for (const c of cot) c.hop.forEach((h, k) => {
    soHop++;
    const sl = M.stopLines.find(q => q.L === h.L && q.phase === h.phase && Math.abs(q.d.x + h.n.x) < 1e-6 && Math.abs(q.d.y + h.n.y) < 1e-6);
    if (!sl) return ghi('cot-den', c, 'hộp đèn ' + k + ' không khớp vạch dừng nào (pha ' + h.phase + ')');
    if (k === 0 && Math.hypot(sl.sx - c.x, sl.sy - c.y) > 110) ghi('cot-den', c, 'cột đèn cách vạch dừng của nhánh mình ' + Math.round(Math.hypot(sl.sx - c.x, sl.sy - c.y)));
  });
  // mỗi vạch dừng phải có ít nhất một hộp đèn đúng pha mà người đứng ở vạch dừng NHÌN THẤY mặt đèn: hộp nằm phía trước, lệch dưới 60° so với hướng nhìn thẳng
  for (const sl of M.stopLines){
    const thay = cot.some(c => c.hop.some(h => { if (h.L !== sl.L || h.phase !== sl.phase || Math.abs(sl.d.x + h.n.x) > 1e-6 || Math.abs(sl.d.y + h.n.y) > 1e-6) return false;
      const vx = c.x - sl.sx, vy = c.y - sl.sy, L = Math.hypot(vx, vy) || 1; return (vx*sl.d.x + vy*sl.d.y) / L > 0.5; }));
    if (!thay) sai.push('vạch dừng ở nút ' + sl.node + ', đường ' + sl.road.id + ': đứng ở vạch dừng không thấy hộp đèn nào của nhánh mình');
  }
  console.log('Hướng mặt: đã kiểm ' + ['P.127', 'W.225', 'chi-dan', 'R.303', 'bien-P'].reduce((n, ma) => n + hinh[ma].nguon().length, 0) + ' biển, ' + soHop + ' hộp đèn, ' + M.stopLines.length + ' vạch dừng; sai ' + sai.length + '.');
  for (const q of sai) loi.push('hướng mặt: ' + q);
}
console.log('Tổng: ' + TP3.DANH_MUC.length + ' loại, ' + tong + ' vật.');
if (thayThe.length) console.log('ĐANG DÙNG HÌNH THAY THẾ:\n  ' + thayThe.join('\n  '));
if (loi.length) console.log('LỖI:\n  ' + loi.join('\n  '));
if (!thayThe.length && !loi.length) console.log('Tất cả đều có hình 3D');
process.exit(thayThe.length || loi.length ? 1 : 0);
