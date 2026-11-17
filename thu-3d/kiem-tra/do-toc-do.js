/* Đo độ mượt của bản thử 3D ở ngã tư có đèn Hoa Sữa × Bánh Mì, cả ba mức đồ họa, hai khổ màn hình, hai góc nhìn:
     node do-toc-do.js [số khung, mặc định 20] [mức, ví dụ "thap,vua,cao"]
   Tắt giới hạn khung hình và tắt tự chỉnh độ nét (?fps=60&tu=0) để đo đúng sức vẽ.
   Lưu ý: Chrome không màn hình vẽ 3D bằng CPU nên chậm hơn điện thoại thật rất nhiều; chỉ dùng để so sánh tương đối. */
'use strict';
const path = require('path');
const {moTrinhDuyet} = require('./trinh-duyet.js');
const TRANG = 'file://' + path.resolve(__dirname, '..', 'index.html'), CHO = {x: 492, y: 280, a: Math.PI};
(async () => {
  const n = +process.argv[2] || 20, cacMuc = (process.argv[3] || 'thap,vua,cao').split(',');
  const B = await moTrinhDuyet(), bang = [];
  try {
    for (const kho of [{ten: 'máy tính 1280×800', w: 1280, h: 800, dt: false}, {ten: 'điện thoại 390×844', w: 390, h: 844, dt: true}]) for (const muc of cacMuc){
      await B.kho(kho.w, kho.h, kho.dt, 1);
      const tai = await B.mo(TRANG + '?tu=0&fps=60&q=' + muc); await B.cho(400);
      await B.chay('document.getElementById("go").click(); 1');
      const tt = await B.chay('__T3D.sanSang()');
      console.log(`# ${kho.ten} · ${muc}: tải trang ${tai} ms · dựng xong mọi ô sau ${tt.msSanSang} ms (riêng dựng ô ${tt.msDungO} ms) · ${tt.soO} ô · ${tt.tamGiacTinh} tam giác tĩnh · ảnh trên card đồ họa khoảng ${tt.boNhoAnhMB} MB`);
      for (const goc of ['nav', 'bike']){
        await B.chay(`__T3D.doiXe('bike'); __T3D.gocNhin('${goc}'); __T3D.datXe(${CHO.x}, ${CHO.y}, ${CHO.a}, 0); 1`); await B.cho(900);
        const r = await B.chay(`__T3D.do(${n})`);
        bang.push([kho.ten, muc, '3D ' + goc, r.fps, r.msKhung, r.msVe, r.msNao, r.lenhVe, r.tamGiac, r.diemAnh, r.boNhoAnhMB].join(' | '));
      }
    }
    console.log('khổ | mức | góc | khung/giây | ms/khung | ms vẽ (CPU) | ms bộ não | lệnh vẽ | tam giác | điểm ảnh | ảnh (MB)');
    for (const b of bang) console.log(b);
    if (B.loi.length) console.log('LỖI TRONG TRANG:\n' + B.loi.join('\n'));
  } finally { await B.dong(); }
})().catch(e => { console.error(e); process.exit(1); });
