/* Chụp ảnh bản thử 3D ở các chỗ cần xem bằng mắt: node chup-anh.js <thư mục lưu ảnh> [bộ lọc tên] [tham số trang, ví dụ ?q=cao]
   Mỗi ảnh: khổ máy tính 1280×800 hoặc điện thoại 390×844, góc nhìn nav / bike, xe máy / ô tô. */
'use strict';
const path = require('path'), fs = require('fs');
const {moTrinhDuyet} = require('./trinh-duyet.js');
const TRANG = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CHO = {   // toạ độ bản đồ; a: hướng xe (0 = sang phải, π/2 = xuống dưới)
  'nga-tu-den':  {x: 492, y: 280, a: Math.PI, mo: 'ngã tư có đèn (Hoa Sữa × Bánh Mì), xe đứng ở vạch dừng'},
  'vong-xuyen':  {x: 1180, y: 742, a: Math.PI / 2, mo: 'cửa vào vòng xuyến trên Đường Cầu Vồng'},
  'pho-cho':     {x: 690, y: 320, a: 0, mo: 'đầu Phố Chợ (phố đi bộ) trên Đường Hoa Sữa'},
  'khoi-truong': {x: 420, y: 790, a: -Math.PI / 2, mo: 'khối trường mầm non trên Phố Bánh Mì (biển trẻ em, 30 km/h)'}
};
(async () => {
  const thuMuc = process.argv[2] || '.', loc = process.argv[3] || '', q = process.argv[4] || '';
  fs.mkdirSync(thuMuc, {recursive: true});
  const B = await moTrinhDuyet();
  try {
    for (const kho of [{ten: 'may-tinh', w: 1280, h: 800, dt: false}, {ten: 'dien-thoai', w: 390, h: 844, dt: true}]){
      await B.kho(kho.w, kho.h, kho.dt, 1);
      await B.mo(TRANG + q); await B.cho(800);
      await B.chay('document.getElementById("go").click(); __TP.putOnHelmet(); 1');
      for (const xe of ['bike', 'car']) for (const goc of ['nav', 'bike']) for (const ten in CHO){
        const tep = [ten, goc === 'nav' ? 'dan-duong' : (xe === 'car' ? 'sau-vo-lang' : 'sau-tay-lai'), xe === 'car' ? 'o-to' : 'xe-may', kho.ten].join('_') + '.png';
        if (loc && !tep.includes(loc)) continue;
        const c = CHO[ten];
        await B.chay(`__T3D.doiXe('${xe}'); __T3D.gocNhin('${goc}'); __T3D.datXe(${c.x}, ${c.y}, ${c.a}, 0); 1`);
        await B.cho(900);
        await B.chup(path.join(thuMuc, tep));
        console.log(tep + ' — ' + c.mo);
      }
    }
    if (B.loi.length) console.log('LỖI TRONG TRANG:\n' + B.loi.join('\n')); else console.log('Không có lỗi JS trong trang.');
  } finally { await B.dong(); }
})().catch(e => { console.error(e); process.exit(1); });
