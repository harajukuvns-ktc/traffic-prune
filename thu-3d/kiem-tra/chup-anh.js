/* Chụp ảnh bản 3D ở các chỗ cố định để so bằng mắt giữa các phiên làm việc:
     node chup-anh.js <thư mục lưu ảnh> [bộ lọc tên] [mức: thap|vua|cao, mặc định vua] [địa chỉ gốc http, không ghi thì file://] [--du]
   Mỗi chỗ chụp 4 ảnh: máy tính 1280×800 (góc dẫn đường + xe máy, góc sau vô lăng + ô tô) và điện thoại 390×844
   (góc dẫn đường + ô tô, góc sau tay lái + xe máy). Thêm --du thì chụp đủ 8 tổ hợp mỗi chỗ. */
'use strict';
const path = require('path'), fs = require('fs');
const {moTrinhDuyet} = require('./trinh-duyet.js');
const P = Math.PI, CHO = {   // toạ độ bản đồ; a: hướng xe (0 = sang phải, π/2 = xuống dưới)
  'pho-cho':        {x: 690, y: 320, a: 0, mo: 'khu cũ: đầu Phố Chợ trên Đường Hoa Sữa (để so với đợt 1)'},
  'nga-nam':        {x: 2020, y: 425, a: -P / 2, mo: 'ngã năm Hoa Sữa × Phượng Vĩ × Đại lộ Cây Bàng, xe đứng trước vạch dừng'},
  'dai-lo-cheo':    {x: 2145, y: 505, a: 0.876, mo: 'Đại lộ Cây Bàng chạy chéo'},
  'o-do-cheo':      {x: 2196, y: 566, a: 0.876, mo: 'ô đỗ xoay theo đường chéo trước Siêu thị Cây Bàng'},
  'nga-ba-lech':    {x: 2385, y: 920, a: 0, mo: 'ngã ba lệch Me Chua × Đại lộ Cây Bàng'},
  'hem':            {x: 790, y: 1560, a: P / 2, mo: 'Hẻm Xôi: hẹp, không vạch giữa'},
  'bo-ke':          {x: 386, y: 2165, a: P / 2, mo: 'Đường Bờ Kè cong'},
  'vong-xuyen-2':   {x: 1980, y: 1935, a: P / 2, mo: 'vòng xuyến thứ hai (4 lối) trên Đường Phượng Vĩ'},
  'truong-binh-minh': {x: 1980, y: 1625, a: P / 2, mo: 'trước Trường tiểu học Bình Minh (biển trẻ em, 30 km/h)'},
  'chot-bang-lang': {x: 2780, y: 1125, a: P / 2, mo: 'chốt CSGT trên Đường Bằng Lăng'}
};
(async () => {
  const thamSo = process.argv.slice(2).filter(a => a !== '--du'), du = process.argv.includes('--du');
  const thuMuc = thamSo[0] || '.', loc = thamSo[1] || '', muc = thamSo[2] || 'vua';
  const TRANG = thamSo[3] ? thamSo[3].replace(/\/?$/, '/') + 'index.html' : 'file://' + path.resolve(__dirname, '..', 'index.html');
  fs.mkdirSync(thuMuc, {recursive: true});
  const B = await moTrinhDuyet();
  try {
    for (const kho of [{ten: 'may-tinh', w: 1280, h: 800, dt: false}, {ten: 'dien-thoai', w: 390, h: 844, dt: true}]){
      const toHop = du ? [['bike', 'nav'], ['bike', 'bike'], ['car', 'nav'], ['car', 'bike']] : kho.dt ? [['car', 'nav'], ['bike', 'bike']] : [['bike', 'nav'], ['car', 'bike']];
      await B.kho(kho.w, kho.h, kho.dt, 1);
      await B.mo(TRANG + '?tu=0&fps=60&q=' + muc); await B.cho(600);
      await B.chay('document.getElementById("go").click(); 1');
      for (const ten in CHO) for (const [xe, goc] of toHop){
        const tep = [ten, goc === 'nav' ? 'dan-duong' : (xe === 'car' ? 'sau-vo-lang' : 'sau-tay-lai'), xe === 'car' ? 'o-to' : 'xe-may', kho.ten].join('_') + (muc === 'vua' ? '' : '_muc-' + muc) + '.png';
        if (loc && !tep.includes(loc)) continue;
        const c = CHO[ten];
        await B.chay(`__T3D.doiXe('${xe}'); __TP.S.helmet = true; __TP.S.belt = true; __T3D.gocNhin('${goc}'); __T3D.datXe(${c.x}, ${c.y}, ${c.a}, 0); 1`);
        await B.chay('__T3D.sanSang()'); await B.cho(1300);
        await B.chup(path.join(thuMuc, tep));
        console.log(tep + ' — ' + c.mo);
      }
    }
    if (B.loi.length) console.log('LỖI TRONG TRANG:\n' + B.loi.join('\n')); else console.log('Không có lỗi JS trong trang.');
  } finally { await B.dong(); }
})().catch(e => { console.error(e); process.exit(1); });
