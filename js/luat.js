/* =========================================================
   Traffic Prune · luat.js: LUẬT, MỨC PHẠT, CÂU HỎI KIỂM TRA
   Mọi con số và căn cứ pháp lý nằm ở đây. Sửa xong nhớ ghi nguồn vào docs/THIET-KE.md.
   ========================================================= */
'use strict';

// Căn cứ: NĐ 168/2024/NĐ-CP, đã sửa đổi bởi NĐ 238/2026/NĐ-CP (hiệu lực 15/8/2026); NĐ 238 không đổi các lỗi dưới đây.
// Kiểm tra độc lập ngày 11/11/2026: mức phạt và điểm trừ đều đúng (xem docs/THIET-KE.md mục 8).
const LAW = {
  red: {
    name: 'Vượt đèn đỏ', fine: 5000000, range: '4.000.000–6.000.000đ', pts: 4,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7: điểm c khoản 7 (phạt tiền), điểm b khoản 13 (trừ điểm)',
    tip: 'Đèn đỏ: dừng trước vạch dừng. Đèn vàng cũng phải dừng, trừ khi đã đi quá vạch dừng thì được đi tiếp.'
  },
  wrongway: {
    name: 'Đi ngược chiều đường một chiều', fine: 5000000, range: '4.000.000–6.000.000đ', pts: 2,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7: điểm a khoản 7 (phạt tiền), điểm a khoản 13 (trừ điểm)',
    tip: 'Biển tròn đỏ có vạch trắng ngang (P.102) là "Cấm đi ngược chiều". Biển vuông hoặc chữ nhật nền xanh, mũi tên trắng (I.407) là "Đường một chiều": chỉ đi theo hướng mũi tên.'
  },
  line: {
    name: 'Đè vạch liền (không chấp hành vạch kẻ đường)', fine: 300000, range: '200.000–400.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, điểm a khoản 1 (không trừ điểm GPLX)',
    tip: 'Vạch vàng liền: không được đè lên hay lấn sang bên kia. Vạch vàng đứt: được cắt qua để vượt xe, rẽ hoặc vào chỗ đỗ, xong phải về lại làn của mình.'
  },
  lane: {
    name: 'Đi không đúng phần đường, làn đường', fine: 700000, range: '600.000–800.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, điểm d khoản 3 (không trừ điểm GPLX)',
    tip: 'Đường hai chiều: đi bên phải theo chiều của mình. Qua vạch đứt chỉ để vượt hoặc rẽ, không chạy luôn bên phần đường ngược chiều. Trong vòng xuyến: đi ngược chiều kim đồng hồ.'
  },
  ring: {
    name: 'Không nhường đường tại vòng xuyến', fine: 2500000, range: '2.000.000–3.000.000đ', pts: 2,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7: điểm d khoản 6 (phạt tiền), điểm a khoản 13 (trừ điểm)',
    tip: 'Nơi giao nhau có báo hiệu đi theo vòng xuyến: giảm tốc, nhường xe đi đến từ bên trái (khoản 3 Điều 22 Luật TTATGTĐB 2024). Không có báo hiệu vòng xuyến thì nhường xe đi đến từ bên phải.'
  },
  crash: {
    name: 'Gây va chạm khi đang vi phạm', fine: 12000000, range: '10.000.000–14.000.000đ', pts: 10,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7: điểm a khoản 10 (vd. đi ngược chiều, sai phần đường mà gây tai nạn) hoặc điểm b khoản 10 (vd. vượt đèn đỏ, đè vạch, không nhường đường ở vòng xuyến mà gây tai nạn); trừ 10 điểm theo điểm d khoản 13',
    tip: 'Một lỗi nhỏ cộng thêm một cú va chạm là thành lỗi rất nặng. Chậm lại vài giây rẻ hơn nhiều.'
  },
  // CHỈ NHẮC NHỞ (người dùng chốt 12/11/2026): xe máy không có mức phạt riêng cho hành vi này.
  // remind: true → không phạt tiền, không trừ điểm, nhưng chuyến đó không tính là chuyến sạch.
  parkdir: {
    name: 'Đỗ xe không đúng chiều đi', fine: 0, range: 'Không phạt tiền, chỉ nhắc nhở', pts: 0, remind: true,
    // Kiểm tra độc lập 12/11/2026: đúng số khoản; sửa câu chữ theo đề xuất của agent kiểm tra.
    ref: 'Khoản 6 Điều 18 Luật TTATGTĐB 2024 (Luật số 36/2024/QH15): trên đường phố chỉ được dừng, đỗ xe sát lề đường, vỉa hè phía bên phải theo chiều đi. Điều 7 NĐ 168/2024/NĐ-CP (đã sửa đổi bởi NĐ 238/2026/NĐ-CP) không quy định xử phạt hành vi đỗ xe máy ngược chiều lưu thông (hành vi này chỉ bị phạt với ô tô, điểm d khoản 2 Điều 6)',
    tip: 'Đỗ xe ven đường: tấp vào lề bên phải theo chiều mình đang đi, đầu xe xuôi theo dòng xe. Ô đỗ ở lề bên kia thì quay đầu ở chỗ được phép rồi mới vào ô.'
  }
};
const LAW_ORDER = ['red','wrongway','line','lane','ring','crash','parkdir'];

// Bài kiểm tra khi bằng lái hết điểm. Đáp án đúng luôn đặt ở vị trí đầu (a[0]); game tự xáo trộn khi hiển thị.
const QUIZ = [
  {q:'Đèn vàng bật khi đầu xe của bạn chưa tới vạch dừng. Bạn phải làm gì?',
   a:['Dừng lại trước vạch dừng','Tăng ga để qua cho kịp','Bấm còi rồi đi tiếp'], why:'Đèn vàng phải dừng trước vạch dừng, chỉ được đi tiếp khi đã đi quá vạch dừng.'},
  {q:'Biển tròn nền đỏ, có một vạch trắng nằm ngang nghĩa là gì?',
   a:['Cấm đi ngược chiều','Cấm dừng và đỗ xe','Đường một chiều'], why:'Đó là biển "Cấm đi ngược chiều" (P.102). Biển "Đường một chiều" (I.407) là biển vuông hoặc chữ nhật nền xanh, mũi tên trắng.'},
  {q:'Vạch vàng LIỀN ở giữa đường có ý nghĩa gì?',
   a:['Không được đè lên hay lấn sang bên kia','Được qua để vượt xe','Chỉ cấm ô tô, xe máy được qua'], why:'Vạch liền: không được đè lên hay lấn qua.'},
  {q:'Vạch vàng ĐỨT ở giữa đường cho phép bạn làm gì?',
   a:['Cắt qua để vượt, rẽ, vào chỗ đỗ, xong phải về làn','Chạy luôn ở phần đường bên kia','Không được cắt qua'], why:'Vạch đứt được cắt qua khi cần, rồi phải về lại làn của mình.'},
  {q:'Đi vào nơi giao nhau có biển vòng xuyến, bạn phải nhường xe nào?',
   a:['Xe đi tới từ bên trái (đang chạy trong vòng xuyến)','Không nhường ai, ai vào trước đi trước','Xe đi tới từ bên phải'], why:'Có báo hiệu vòng xuyến: nhường xe đi đến từ bên trái; không có báo hiệu vòng xuyến thì nhường xe đi đến từ bên phải (Điều 22 Luật TTATGTĐB 2024).'},
  {q:'Trong vòng xuyến, xe chạy theo chiều nào?',
   a:['Ngược chiều kim đồng hồ','Theo chiều kim đồng hồ','Chiều nào cũng được'], why:'Đi theo chiều mũi tên trên biển vòng xuyến (R.303), tức là ngược chiều kim đồng hồ.'},
  {q:'Bạn muốn dừng lại nghỉ một lúc. Nên làm gì?',
   a:['Tấp vào nơi đỗ xe cho phép','Dừng sát vạch giữa đường','Dừng ngay trong ngã tư'], why:'Dừng lâu giữa đường làm người khác phải chờ; hãy vào nơi đỗ xe.'},
  {q:'Người lái xe máy vượt đèn đỏ bị xử phạt thế nào?',
   a:['Phạt 4–6 triệu đồng, trừ 4 điểm GPLX','Phạt 200–400 nghìn đồng','Chỉ bị nhắc nhở'], why:'Theo NĐ 168/2024/NĐ-CP, Điều 7: phạt 4.000.000–6.000.000đ và trừ 4 điểm.'},
  {q:'Mỗi giấy phép lái xe có bao nhiêu điểm?',
   a:['12 điểm','10 điểm','20 điểm'], why:'Theo Luật Trật tự, an toàn giao thông đường bộ 2024, mỗi GPLX có 12 điểm.'}
];
const QUIZ_N = 5, QUIZ_PASS = 4;
