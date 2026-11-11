// Chạy game trong Node với DOM giả để kiểm tra logic
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(process.argv[2], 'utf8');
const dir = path.dirname(process.argv[2]);
// Nạp các file js theo đúng thứ tự trong index.html (nếu còn là bản một file thì lấy script nội tuyến)
const srcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const js = srcs.length ? srcs.map(s => fs.readFileSync(path.join(dir, s), 'utf8')).join('\n;\n')
                       : html.split('<script>')[1].split('</script>')[0];
const ctxProxy = new Proxy({}, {
  get(t, p){ if (p === 'measureText') return s => ({width: String(s).length * 7}); if (p in t) return t[p]; return () => ctxProxy; },
  set(t, p, v){ t[p] = v; return true; }
});
function el(){ return {querySelectorAll:()=>[], style:{}, classList:{add(){},remove(){},toggle(){}}, addEventListener(){}, innerHTML:'', textContent:'', value:'anh', checked:true, className:'', dataset:{}, getContext:()=>ctxProxy}; }
const els = {};
global.document = {getElementById: id => (els[id] = els[id] || el()), querySelectorAll: () => [], body: el()};
const store = {};
global.localStorage = {getItem:k=>store[k]??null, setItem:(k,v)=>{store[k]=v;}, removeItem:k=>{delete store[k];}};
global.window = global; window.innerWidth = 1280; window.innerHeight = 800; window.devicePixelRatio = 1;
window.addEventListener = () => {};
window.matchMedia = () => ({matches:false});
global.requestAnimationFrame = () => {};
(0, eval)('(function(){' + js + '\n})()');
module.exports = {TP: window.__TP, els};
