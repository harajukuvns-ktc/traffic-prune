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
  '\n; if (TP3_GIA) TP3.DANH_MUC.push({ma: "R.122", ten: "Biển dừng lại (giả lập)", phu: [], kieu: "hinh", hinh: "bienStop", nguon: () => SPEED_SIGNS.filter(s => s.kind === "stop")});\n window.__KV = {W, H}; })()');
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
console.log('Tổng: ' + TP3.DANH_MUC.length + ' loại, ' + tong + ' vật.');
if (thayThe.length) console.log('ĐANG DÙNG HÌNH THAY THẾ:\n  ' + thayThe.join('\n  '));
if (loi.length) console.log('LỖI:\n  ' + loi.join('\n  '));
if (!thayThe.length && !loi.length) console.log('Tất cả đều có hình 3D');
process.exit(thayThe.length || loi.length ? 1 : 0);
