/* Đo độ mượt của bản thử 3D và so với bản 2D gốc ở cùng một chỗ (ngã tư có đèn Hoa Sữa × Bánh Mì):
     node do-toc-do.js [số khung, mặc định 40] [tham số trang, ví dụ ?q=thap]
   Lưu ý: Chrome không màn hình vẽ 3D bằng CPU nên chậm hơn điện thoại thật rất nhiều; chỉ dùng để so sánh tương đối. */
'use strict';
const path = require('path');
const {moTrinhDuyet} = require('./trinh-duyet.js');
const GOC = path.resolve(__dirname, '..', '..');
const CHO = {x: 492, y: 280, a: Math.PI};
// bộ đo cho bản 2D gốc (trang gốc không có __T3D): đếm khoảng cách giữa các khung hình bằng requestAnimationFrame
const DO_2D = n => `new Promise(xong => { let k = -2, t0 = 0, tr = 0, lon = 0; const f = t => { if (++k > 0){ lon = Math.max(lon, t - tr); } if (k === 0) t0 = t; tr = t;
  if (k >= ${n}) xong({fps: Math.round(1000 * ${n} / (t - t0) * 100) / 100, msKhung: Math.round((t - t0) / ${n} * 100) / 100, msKhungLonNhat: Math.round(lon * 100) / 100, diemAnh: document.getElementById('game').width + '×' + document.getElementById('game').height});
  else requestAnimationFrame(f); }; requestAnimationFrame(f); })`;
(async () => {
  const n = +process.argv[2] || 40, q = process.argv[3] || '';
  const B = await moTrinhDuyet(), bang = [];
  try {
    for (const kho of [{ten: 'máy tính 1280×800', w: 1280, h: 800, dt: false, dpr: 1}, {ten: 'điện thoại 390×844', w: 390, h: 844, dt: true, dpr: 1}, {ten: 'điện thoại 390×844, màn hình nét gấp 3', w: 390, h: 844, dt: true, dpr: 3}]){
      await B.kho(kho.w, kho.h, kho.dt, kho.dpr);
      // bản thử 3D
      const tai3 = await B.mo('file://' + GOC + '/thu-3d/index.html' + q); await B.cho(600);
      const tt = await B.chay('JSON.stringify(Object.assign({taiXong: Math.round(performance.getEntriesByType("navigation")[0].loadEventEnd)}, __T3D.thongTin))');
      console.log('# ' + kho.ten + ' · 3D: tải trang ' + tai3 + ' ms · ' + tt);
      await B.chay('document.getElementById("go").click(); 1');
      for (const goc of ['nav', 'bike', 'map']){
        await B.chay(`__T3D.doiXe('bike'); __T3D.gocNhin('${goc}'); __T3D.datXe(${CHO.x}, ${CHO.y}, ${CHO.a}, 0); 1`); await B.cho(700);
        const r = await B.chay(`__T3D.do(${n})`);
        bang.push({kho: kho.ten, ban: goc === 'map' ? 'thử 3D, góc map (vẽ 2D gốc)' : '3D ' + goc, fps: r.fps, ms: r.msKhung, lonNhat: r.msKhungLonNhat, msVe: r.msVe, msNao: r.msNao, lenhVe: r.lenhVe, tamGiac: r.tamGiac, diemAnh: r.diemAnh});
      }
      // bản 2D gốc
      const tai2 = await B.mo('file://' + GOC + '/index.html'); await B.cho(600);
      console.log('# ' + kho.ten + ' · 2D gốc: tải trang ' + tai2 + ' ms · taiXong ' + await B.chay('Math.round(performance.getEntriesByType("navigation")[0].loadEventEnd)'));
      await B.chay('document.getElementById("go").click(); 1');
      for (const goc of ['nav', 'bike', 'map']){
        await B.chay(`__TP.S.view = '${goc}'; __TP.resize(); Object.assign(__TP.player, {x: ${CHO.x}, y: ${CHO.y}, a: ${CHO.a}, v: 0}); 1`); await B.cho(700);
        const r = await B.chay(DO_2D(n));
        bang.push({kho: kho.ten, ban: '2D gốc ' + goc, fps: r.fps, ms: r.msKhung, lonNhat: r.msKhungLonNhat, msVe: '', msNao: '', lenhVe: '', tamGiac: '', diemAnh: r.diemAnh});
      }
    }
    console.log('khổ | bản | khung/giây | ms/khung | ms khung chậm nhất | ms vẽ (CPU) | ms bộ não | lệnh vẽ | tam giác | điểm ảnh khung vẽ');
    for (const b of bang) console.log([b.kho, b.ban, b.fps, b.ms, b.lonNhat, b.msVe, b.msNao, b.lenhVe, b.tamGiac, b.diemAnh].join(' | '));
    if (B.loi.length) console.log('LỖI TRONG TRANG:\n' + B.loi.join('\n'));
  } finally { await B.dong(); }
})().catch(e => { console.error(e); process.exit(1); });
