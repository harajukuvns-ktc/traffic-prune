/* Công cụ kiểm tra bản thử 3D bằng Chrome không màn hình (không cần cài gói nào; cần Node 22 trở lên và google-chrome).
   Mở Chrome với WebGL chạy bằng CPU (SwiftShader), điều khiển qua Chrome DevTools Protocol.
   Dùng trong các kịch bản khác:  const {moTrinhDuyet} = require('./trinh-duyet.js'); */
'use strict';
const {spawn} = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

async function moTrinhDuyet(opt){
  opt = opt || {};
  const cong = opt.cong || 9300 + Math.floor(Math.random() * 500), hoSo = fs.mkdtempSync(path.join(os.tmpdir(), 'tp3d-'));
  const chrome = spawn(opt.chrome || 'google-chrome', ['--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--hide-scrollbars',
    '--remote-debugging-port=' + cong, '--user-data-dir=' + hoSo, '--window-size=1280,800', 'about:blank'], {stdio: 'ignore'});
  let trang = null;
  for (let i = 0; i < 100 && !trang; i++){
    await new Promise(r => setTimeout(r, 150));
    try { const ds = await (await fetch('http://127.0.0.1:' + cong + '/json')).json(); trang = ds.find(t => t.type === 'page'); } catch (e){}
  }
  if (!trang) throw new Error('Không mở được Chrome');
  const ws = new WebSocket(trang.webSocketDebuggerUrl);
  await new Promise((ok, loi) => { ws.onopen = ok; ws.onerror = loi; });
  let id = 0; const cho = new Map(), loi = [], nhatKy = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && cho.has(m.id)){ const c = cho.get(m.id); cho.delete(m.id); m.error ? c.loi(new Error(m.error.message)) : c.ok(m.result); return; }
    if (m.method === 'Runtime.exceptionThrown') loi.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description) || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled'){ const t = m.params.args.map(a => a.value !== undefined ? a.value : a.description).join(' ');
      nhatKy.push(m.params.type + ': ' + t); if (m.params.type === 'error') loi.push('console.error: ' + t); }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') loi.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  };
  const goi = (method, params) => new Promise((ok, loi_) => { cho.set(++id, {ok, loi: loi_}); ws.send(JSON.stringify({id, method, params: params || {}})); });
  await goi('Page.enable'); await goi('Runtime.enable'); await goi('Log.enable');
  const B = {
    loi, nhatKy, goi,
    // khổ màn hình; dienThoai: giả lập màn hình cảm ứng (game sẽ hiện hàng nút bấm)
    async kho(w, h, dienThoai, dpr){
      await goi('Emulation.setDeviceMetricsOverride', {width: w, height: h, deviceScaleFactor: dpr || 1, mobile: !!dienThoai});
      await goi('Emulation.setTouchEmulationEnabled', {enabled: !!dienThoai, maxTouchPoints: dienThoai ? 5 : 1});
    },
    async mo(url){
      const t0 = Date.now();
      const xong = new Promise(ok => { const cu = ws.onmessage; ws.onmessage = ev => { cu(ev); if (JSON.parse(ev.data).method === 'Page.loadEventFired'){ ws.onmessage = cu; ok(); } }; });
      await goi('Page.navigate', {url}); await xong;
      return Date.now() - t0;
    },
    async chay(bieuThuc){   // chạy một biểu thức trong trang (chờ nếu là Promise), trả về giá trị
      const r = await goi('Runtime.evaluate', {expression: bieuThuc, awaitPromise: true, returnByValue: true});
      if (r.exceptionDetails) throw new Error('Lỗi trong trang: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
      return r.result.value;
    },
    cho: ms => new Promise(r => setTimeout(r, ms)),
    async chup(tep){ const r = await goi('Page.captureScreenshot', {format: 'png'}); fs.writeFileSync(tep, Buffer.from(r.data, 'base64')); return tep; },
    async dong(){ try { await goi('Browser.close'); } catch (e){} try { chrome.kill(); } catch (e){} try { fs.rmSync(hoSo, {recursive: true, force: true}); } catch (e){} }
  };
  return B;
}
module.exports = {moTrinhDuyet};
