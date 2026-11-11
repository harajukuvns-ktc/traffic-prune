/* =========================================================
   Traffic Prune · cau-thoai.js: LỜI THOẠI NPC VÀ TÊN NHÂN VẬT
   {x} = cách gọi người chơi (anh/chị/bác...), {X} = viết hoa chữ đầu, {n} = số lần mắc lỗi.
   ========================================================= */
'use strict';

const LINES = {
  red: [
    'Đèn đỏ là để dừng, {x} ơi, không phải để thử xem mình có phải nhân vật chính không.',
    'Ba mươi giây chờ đèn đỏ đổi lấy năm triệu tiền phạt. Phép tính này mà cô giáo toán thấy chắc khóc.',
    '{X} vội thế, ở nhà đang nấu cơm quên tắt bếp hả?',
    'Đèn xanh thì đi, đèn đỏ thì… {x} cũng đi. Đèn nhà {x} chắc chỉ có một màu.'
  ],
  wrongway: [
    'Phố này một chiều thôi {x} ơi. Chiều của {x} là chiều ngược với cả thế giới.',
    'Người ta đi ngược chiều để tìm lại thanh xuân, còn {x} đi ngược chiều để tìm… biên bản.',
    'Cả con phố đi một hướng, riêng {x} một hướng. Cá tính thì có, đúng luật thì không.'
  ],
  line: [
    'Vạch liền là bức tường vô hình đó {x} ơi. {X} vừa đi xuyên tường kìa.',
    'Vạch đứt thì được qua, vạch liền thì… liền dừng ý định đó lại nha {x}.',
    'Gần ngã tư người ta kẻ vạch liền để ai ở yên làn nấy. {X} lại thích sang nhà hàng xóm chơi.'
  ],
  lane: [
    'Phần đường bên kia là của người ta. {X} mượn hơi lâu rồi đó.',
    'Đường có hai chiều, mỗi người một bên. {X} định ôm hết cả hai à?',
    'Qua vạch đứt để vượt thì được, chứ dọn sang ở luôn bên đó thì không nha {x}.'
  ],
  ringwrong: [
    'Vòng xuyến đi ngược kim đồng hồ {x} ơi. Quay ngược thế này là quay về quá khứ đấy.',
    'Cả vòng xuyến xoay một chiều, riêng {x} xoay chiều kia. Định làm con quay hả?'
  ],
  ring: [
    'Vào vòng xuyến phải nhường xe đang đi bên trái {x} ơi. Vòng xuyến chứ đâu phải vòng quay may mắn.',
    '{X} lao vào như thể vòng xuyến đang phát quà miễn phí vậy.',
    'Đi vòng xuyến cần ba thứ: giảm tốc, quan sát, nhường đường. {X} mới có mỗi… tay ga.'
  ],
  jam: [
    'Người ta đi đường là để đến đích, còn {x} đi đường là để tạo cơ hội cho mọi người xung quanh kịp ngẫm sự đời, uống hết ly trà sữa và xem xong một tập phim.',
    'Cả dãy xe đang đứng chờ {x} sáng tác xong con đường mới đấy.',
    'Kẹt thế này chắc tôi kịp học xong một khóa tiếng Anh online.'
  ],
  crash: [
    'Ối! Xe tôi đang yên đang lành, sao {x} lại làm quen kiểu này?',
    'Đi đúng thì chẳng ai đụng ai. Đi sai thì đụng cả… ví tiền.',
    'Va chạm nhẹ thôi mà tiền bồi thường thì không nhẹ chút nào đâu {x}.'
  ],
  bump: [
    'Từ từ thôi {x}! Giữ khoảng cách chút, xe tôi đâu phải đệm hơi.',
    'Bám sát quá rồi đó {x}. Đi đường chứ có phải xếp hàng mua vé concert đâu.'
  ],
  stopping: [
    'Dừng giữa đường thế này cả phố phải chờ {x} đó. Có ô chữ P ven đường kìa, tấp vào cho thong thả!',
    '{X} muốn nghỉ chân thì ghé ô đỗ xe chữ P nha. Lòng đường đâu phải phòng khách.'
  ],
  victim: ['Ấy chết, tôi xin lỗi {x}! Để tôi đền nhé.'],
  sidewalk: [
    'Vỉa hè là của người đi bộ mà {x} ơi! Tôi đi bộ mà cũng phải né xe.',
    'Ôi giật cả mình! {X} lên vỉa hè làm tôi tưởng đang đứng giữa đường đua.'
  ],
  praise: [
    'Giao đúng nơi, đỗ đúng chỗ, đi đúng luật. Khách khen, ví vui, cả phố mỉm cười!',
    'Chuyến này sạch bong như xe mới rửa. Thưởng thêm cho {x} nè!',
    '{X} đi chuẩn quá, CSGT mà thấy chắc chỉ muốn vẫy tay chào.'
  ],
  meh: ['Hàng tới rồi, cảm ơn {x}! Chuyến này hơi… nhiều chuyện. Lần sau đi sạch là được thưởng thêm đó.'],
  again: ['Lần thứ {n} rồi đó {x}. ', 'Lại là {x}! Lần thứ {n} rồi nha. ']
};

const NPC_NAMES = ['Bác xe ôm','Cô bán xôi','Anh shipper','Chị đi chợ','Chú bảo vệ','Bà bán vé số','Anh thợ điện',
  'Chị nhân viên văn phòng','Ông đi tập thể dục','Cô giáo về muộn','Anh sinh viên','Chú bán kem'];
const PED_NAMES = ['Cô bán hàng rong','Bà cụ đi chợ','Anh đi bộ','Chị dắt chó đi dạo'];

// "Giọng" bíp bíp của từng kiểu nhân vật khi nói. Dò từ trên xuống, gặp dòng nào khớp tên thì dùng dòng đó.
//   cao: độ cao giọng (Hz, càng lớn càng cao) · am: kiểu âm ('sine' tròn, 'triangle' mềm, 'square' rè)
//   nhanh: tốc độ hiện chữ (ký tự mỗi giây)
const GIONG = [
  {khop: /xe buýt/i,          cao: 150, am: 'square',   nhanh: 26},
  {khop: /loa phường/i,       cao: 210, am: 'square',   nhanh: 30},
  {khop: /^(ông|bác)/i,       cao: 165, am: 'triangle', nhanh: 24},
  {khop: /^bà/i,              cao: 285, am: 'triangle', nhanh: 22},
  {khop: /^chú/i,             cao: 185, am: 'triangle', nhanh: 28},
  {khop: /^anh/i,             cao: 215, am: 'triangle', nhanh: 32},
  {khop: /^(cô|chị)/i,        cao: 330, am: 'sine',     nhanh: 34},
  {khop: /^khách/i,           cao: 300, am: 'sine',     nhanh: 32},
  {khop: /.*/,                cao: 240, am: 'triangle', nhanh: 30}
];
