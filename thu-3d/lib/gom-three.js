// Gom three.core.js + three.module.js (r187) thành một script thường, gán window.THREE
const fs = require('fs');
const [core, mod, out] = process.argv.slice(2);
function tach(src) {
  const exp = []; const body = [];
  for (const line of src.split('\n')) {
    if (/^import /.test(line)) continue;
    if (/^export \{.*\} from /.test(line)) continue;
    const m = line.match(/^export \{(.*)\};?\s*$/);
    if (m) { if (!/ from /.test(line)) exp.push(...m[1].split(',').map(s => s.trim()).filter(Boolean)); continue; }
    if (/^export /.test(line)) throw new Error('export lạ: ' + line.slice(0, 80));
    body.push(line);
  }
  return { exp, body: body.join('\n') };
}
const a = tach(fs.readFileSync(core, 'utf8')), b = tach(fs.readFileSync(mod, 'utf8'));
const ob = l => l.map(e => { const [loc, as] = e.split(/\s+as\s+/); return (as && as !== loc) ? `${as}: ${loc}` : loc; }).join(', ');
const nB = b.exp.length;
if (/import\.meta|\bawait import\(/.test(a.body + b.body)) console.warn('cảnh báo: có import.meta');
const head = `/**\n * Three.js r187 (giấy phép MIT, xem THREE-LICENSE.txt). Gom thành script thường cho Traffic Prune.\n */\n`;
// phần module nằm trong hàm riêng để tên biến nội bộ không đụng phần core
fs.writeFileSync(out, head + '(function(){\n"use strict";\n' + a.body + '\nconst __mod = (function(){\n' + b.body + '\nreturn {' + ob(b.exp) + '};\n})();\nwindow.THREE = Object.freeze(Object.assign({' + ob(a.exp) + '}, __mod));\n})();\n');
console.log('xong', a.exp.length + nB, 'tên', fs.statSync(out).size, 'byte');
