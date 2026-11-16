// Tạo bản mẫu cho bản đồ đang chơi (bản 1.1 bước 7, bản 1.2 đợt a): ghi lại kết quả phân loại vị trí, vạch giữa, chỉ đường
// và vị trí mọi biển, cột đèn, ô đỗ, nhãn tên đường, để bài kiểm tra mục 21 so với bản mẫu sau khi bộ cũ đã bị xoá.
// Chạy:  node tao-ban-mau.js ../index.html   (ghi ra tests/ban-mau-1.2.json)
// Chỉ chạy lại khi CỐ Ý đổi khu phố hiện tại; mỗi lần chạy lại phải ghi lý do vào docs/THIET-KE.md.
const fs = require('fs'), path = require('path');
const {TP} = require('./harness.js');
const M = require('./ban-mau.js');
const out = M.chupKhuPho(TP);
fs.writeFileSync(path.join(__dirname, 'ban-mau-1.2.json'), JSON.stringify(out, null, 1));
console.log('Đã ghi bản mẫu:', Object.keys(out).map(k => k + ' ' + (Array.isArray(out[k]) ? out[k].length : typeof out[k] === 'object' ? '' : out[k])).join(' · '));
