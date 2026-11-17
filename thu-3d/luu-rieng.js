/* =========================================================
   Traffic Prune · thu-3d/luu-rieng.js: BẢN THỬ 3D LƯU RIÊNG
   game.js lưu tiền, điểm, lựa chọn vào localStorage dưới khoá 'trafficPrune.v1'. Bản thử 3D chạy cùng địa chỉ với
   bản chơi chính nên nếu để nguyên sẽ ghi đè lên dữ liệu chơi thật. File này (nạp TRƯỚC game.js) đổi hướng khoá đó
   sang khoá riêng 'trafficPrune.thu3d'. Lần đầu chưa có dữ liệu riêng thì đọc dữ liệu chơi thật để giữ cách xưng hô,
   âm thanh..., nhưng không bao giờ ghi ngược lại.
   ========================================================= */
'use strict';
(function(){
  const GOC = 'trafficPrune.v1', RIENG = 'trafficPrune.thu3d';
  try {
    const P = Storage.prototype, doc = P.getItem, ghi = P.setItem;
    P.getItem = function(k){
      if (k !== GOC) return doc.call(this, k);
      const v = doc.call(this, RIENG);
      return v === null ? doc.call(this, GOC) : v;
    };
    P.setItem = function(k, v){ return ghi.call(this, k === GOC ? RIENG : k, v); };
    // "Xóa dữ liệu và chơi lại": chỉ xoá phần của bản thử (ghi 'null' để lần sau không đọc lại dữ liệu chơi thật)
    const xoa = P.removeItem;
    P.removeItem = function(k){ if (k === GOC) return ghi.call(this, RIENG, 'null'); return xoa.call(this, k); };
  } catch (e) { /* trình duyệt chặn localStorage (mở file trực tiếp ở chế độ riêng tư): game vẫn chạy, chỉ không lưu */ }
})();
