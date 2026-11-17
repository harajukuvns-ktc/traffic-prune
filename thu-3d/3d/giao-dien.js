/* =========================================================
   Traffic Prune · thu-3d/3d/giao-dien.js: GIAO DIỆN GỌN KHI LÁI Ở GÓC NHÌN 3D (đi cùng ../giao-dien-gon.css)
   Bộ não của game vẫn tự viết nội dung các khung chữ (updHUD, say, showLaw); file này chỉ làm gọn cách hiện:
     1. bật lớp v3d trên <body> khi đang ở góc 3D, lớp co-law khi bảng phạt đang hiện (để không chồng thêm khung lời thoại);
     2. rút dòng nhắc (#warn) còn một câu ngắn; câu đầy đủ vẫn nằm trong thuộc tính title;
     3. bảng phạt tự ẩn nhanh hơn (điện thoại 4 giây, máy tính 7 giây); chạm vào lời thoại NPC để ẩn;
     4. ô số đo: mặc định một dòng nhỏ; ?do=1 hiện đủ; ?do=0 tắt.
   chinh.js gọi TP3.giaoDien.capNhat() ở mỗi lần vẽ. Cách chép sang game chính: xem HUONG-DAN-3D.md.
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const GD = TP3.giaoDien = {wGoc: null, do: new URLSearchParams(location.search).get('do')};
// Rút một dòng nhắc của game còn một câu ngắn (giữ biểu tượng đầu dòng và ý chính)
GD.rutGon = function(w){
  if (!w) return w;
  let m;
  if (/^🔴/.test(w)) return '🔴 Đèn đỏ: dừng trước vạch';
  if (/^🟡/.test(w)) return '🟡 Đèn vàng: giảm tốc, dừng lại';
  if ((m = w.match(/^🚨 Quá tốc độ: (\d+) km\/h.*?tối đa (\d+)/))) return '🚨 Quá tốc độ: ' + m[1] + ' / ' + m[2] + ' km/h';
  if (/^📞 Khách gọi/.test(w)) return '📞 Khách gọi: tấp vào ô P rồi nghe';
  if (/^📵/.test(w)) return '📵 Đang cầm điện thoại: tấp vào ô P';
  if ((m = w.match(/^(.*?)(?::| \(|!|, |\. )/))) w = m[1];
  return w.length > 46 ? w.slice(0, 45) + '…' : w;
};
// Rút chữ bay lên (tiền, điểm văn hóa): bỏ phần giải thích sau dấu hai chấm
GD.rutChuBay = t => { const i = t.indexOf(':'); return i > 0 ? t.slice(0, i) : t; };
bubEl.addEventListener('click', () => { bubEl.style.display = 'none'; S.bubble = null; });
GD.capNhat = function(ba3D){
  const b = document.body.classList;
  if (GD.v3d !== ba3D){ GD.v3d = ba3D; b.toggle('v3d', ba3D); GD.wGoc = null; if (!ba3D && hudCache.warn){ warnEl.textContent = hudCache.warn; } }
  if (!ba3D) return;
  const coLaw = lawEl.style.display === 'block';
  if (GD.coLaw !== coLaw){ GD.coLaw = coLaw; b.toggle('co-law', coLaw); }
  // game chỉ ghi lại #warn khi nội dung đổi (hudCache.warn), nên chỉ cần rút gọn một lần cho mỗi nội dung
  if (hudCache.warn !== GD.wGoc){ GD.wGoc = hudCache.warn; if (GD.wGoc){ warnEl.textContent = GD.rutGon(GD.wGoc); warnEl.title = GD.wGoc; } }
  const toiDa = isTouch ? 4 : 7; if (S.lawT > toiDa) S.lawT = toiDa;
};
// ô số đo
GD.kieuDo = GD.do === '0' ? 'tat' : GD.do === '1' ? 'du' : 'gon';
})();
