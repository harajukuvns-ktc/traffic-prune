/* Chụp ảnh lúc NHIỀU chữ cảnh báo hiện cùng lúc (vừa bị phạt + NPC nói + đèn đỏ phía trước + có cuộc gọi), để kiểm
   chữ có che tầm nhìn người lái không:  node chup-canh-bao.js <thư mục> [đuôi tên, ví dụ truoc | sau]
   Khổ: điện thoại dọc 390×844, điện thoại ngang 844×390, máy tính 1280×800; góc nav và bike; xe máy và ô tô. */
'use strict';
const path = require('path'), fs = require('fs');
const {moTrinhDuyet} = require('./trinh-duyet.js');
(async () => {
  const thuMuc = process.argv[2] || '.', duoi = process.argv[3] || 'sau';
  fs.mkdirSync(thuMuc, {recursive: true});
  const B = await moTrinhDuyet();
  try {
    for (const kho of [{ten: 'dien-thoai-doc', w: 390, h: 844, dt: true}, {ten: 'dien-thoai-ngang', w: 844, h: 390, dt: true}, {ten: 'may-tinh', w: 1280, h: 800, dt: false}]){
      await B.kho(kho.w, kho.h, kho.dt, 1);
      await B.mo('file://' + path.resolve(__dirname, '..', 'index.html') + '?tu=0&fps=60&q=thap'); await B.cho(500);
      await B.chay('document.getElementById("go").click(); 1');
      for (const [xe, goc] of [['bike', 'nav'], ['bike', 'bike'], ['car', 'bike'], ['car', 'nav']]){
        // xe đứng trước vạch dừng ngã tư Hoa Sữa × Bánh Mì, chưa đội mũ / thắt dây; chờ đèn đỏ rồi cho mọi thứ hiện cùng lúc
        await B.chay(`__T3D.doiXe('${xe}'); __TP.S.helmet = false; __TP.S.belt = false; __T3D.gocNhin('${goc}'); __T3D.datXe(492, 280, Math.PI, 0); __TP.S.call = null; 1`);
        await B.chay('__T3D.sanSang()');
        await B.chay(`new Promise(xong => { const t0 = Date.now(), f = () => { const la = __TP.playerLightAhead(400); if ((la && la.state === 'red') || Date.now() - t0 > 25000) xong(); else setTimeout(f, 100); }; f(); })`);
        await B.chay(`__TP.violate('red'); __TP.say({name: 'Bác xe ôm', follow: true}, 'Ấy chết, đi đứng kiểu gì thế, đèn đỏ kia kìa! Nhanh một phút chậm cả đời đó nha.'); __TP.S.callAt = __TP.S.now; 1`);
        await B.cho(2500);
        const tep = ['chu-canh-bao', kho.ten, goc, xe === 'car' ? 'o-to' : 'xe-may', duoi].join('_') + '.png';
        await B.chup(path.join(thuMuc, tep)); console.log(tep);
      }
    }
    if (B.loi.length) console.log('LỖI TRONG TRANG:\n' + B.loi.join('\n')); else console.log('Không có lỗi JS trong trang.');
  } finally { await B.dong(); }
})().catch(e => { console.error(e); process.exit(1); });
