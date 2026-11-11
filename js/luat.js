/* =========================================================
   Traffic Prune · luat.js: LUẬT, MỨC PHẠT, CÂU HỎI KIỂM TRA
   Mọi con số và căn cứ pháp lý nằm ở đây. Sửa xong nhớ ghi nguồn vào docs/THIET-KE.md.
   ========================================================= */
'use strict';

const LAW = {
  red: {
    name: 'Vượt đèn đỏ', fine: 5000000, range: '4.000.000–6.000.000đ', pts: 4,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7: điểm c khoản 7 (phạt tiền), điểm b khoản 13 (trừ điểm)',
    tip: 'Đèn đỏ: dừng trước vạch dừng. Đèn vàng cũng phải dừng, trừ khi đã đi quá vạch dừng thì được đi tiếp.'
  },
  wrongway: {
    name: 'Đi ngược chiều đường một chiều', fine: 5000000, range: '4.000.000–6.000.000đ', pts: 2,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7: điểm a khoản 7 (phạt tiền), điểm a khoản 13 (trừ điểm)',
    tip: 'Biển tròn đỏ có vạch trắng ngang là "Cấm đi ngược chiều". Biển xanh có mũi tên là "Đường một chiều": chỉ đi theo hướng mũi tên.'
  },
  line: {
    name: 'Đè vạch liền (không chấp hành vạch kẻ đường)', fine: 300000, range: '200.000–400.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, điểm a khoản 1',
    tip: 'Vạch vàng liền: không được đè lên hay lấn sang bên kia. Vạch vàng đứt: được cắt qua để vượt xe, rẽ hoặc vào chỗ đỗ, xong phải về lại làn của mình.'
  },
  lane: {
    name: 'Đi không đúng phần đường, làn đường', fine: 700000, range: '600.000–800.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, khoản 3',
    tip: 'Đường hai chiều: đi bên phải theo chiều của mình. Qua vạch đứt chỉ để vượt hoặc rẽ, không chạy luôn bên phần đường ngược chiều. Trong vòng xuyến: đi ngược chiều kim đồng hồ.'
  },
  ring: {
    name: 'Không nhường đường tại vòng xuyến', fine: 2500000, range: '2.000.000–3.000.000đ', pts: 2,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, khoản 6',
    tip: 'Nơi có biển vòng xuyến (tròn xanh, ba mũi tên xoay): giảm tốc và nhường xe đi tới từ bên trái, tức là xe đang chạy trong vòng xuyến.'
  },
  crash: {
    name: 'Gây va chạm khi đang vi phạm', fine: 12000000, range: '10.000.000–14.000.000đ', pts: 10,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, khoản 10 (ví dụ: vượt đèn đỏ, đi ngược chiều mà gây tai nạn), trừ 10 điểm theo khoản 13',
    tip: 'Một lỗi nhỏ cộng thêm một cú va chạm là thành lỗi rất nặng. Chậm lại vài giây rẻ hơn nhiều.'
  }
};
const LAW_ORDER = ['red','wrongway','line','lane','ring','crash'];

// Bài kiểm tra khi bằng lái hết điểm. Đáp án đúng luôn đặt ở vị trí đầu (a[0]); game tự xáo trộn khi hiển thị.
const QUIZ = [
  {q:'Đèn vàng bật khi đầu xe của bạn chưa tới vạch dừng. Bạn phải làm gì?',
   a:['Dừng lại trước vạch dừng','Tăng ga để qua cho kịp','Bấm còi rồi đi tiếp'], why:'Đèn vàng phải dừng trước vạch dừng, chỉ được đi tiếp khi đã đi quá vạch dừng.'},
  {q:'Biển tròn nền đỏ, có một vạch trắng nằm ngang nghĩa là gì?',
   a:['Cấm đi ngược chiều','Cấm dừng và đỗ xe','Đường một chiều'], why:'Đó là biển "Cấm đi ngược chiều". Biển "Đường một chiều" là biển xanh có mũi tên.'},
  {q:'Vạch vàng LIỀN ở giữa đường có ý nghĩa gì?',
   a:['Không được đè lên hay lấn sang bên kia','Được qua để vượt xe','Chỉ cấm ô tô, xe máy được qua'], why:'Vạch liền: không được đè lên hay lấn qua.'},
  {q:'Vạch vàng ĐỨT ở giữa đường cho phép bạn làm gì?',
   a:['Cắt qua để vượt, rẽ, vào chỗ đỗ, xong phải về làn','Chạy luôn ở phần đường bên kia','Không được cắt qua'], why:'Vạch đứt được cắt qua khi cần, rồi phải về lại làn của mình.'},
  {q:'Đi vào nơi giao nhau có biển vòng xuyến, bạn phải nhường xe nào?',
   a:['Xe đi tới từ bên trái (đang chạy trong vòng xuyến)','Không nhường ai, ai vào trước đi trước','Xe đi tới từ bên phải'], why:'Nơi có báo hiệu vòng xuyến: nhường xe đi tới từ bên trái.'},
  {q:'Trong vòng xuyến, xe chạy theo chiều nào?',
   a:['Ngược chiều kim đồng hồ','Theo chiều kim đồng hồ','Chiều nào cũng được'], why:'Ở Việt Nam xe đi bên phải, nên chạy vòng xuyến ngược chiều kim đồng hồ.'},
  {q:'Bạn muốn dừng lại nghỉ một lúc. Nên làm gì?',
   a:['Tấp vào nơi đỗ xe cho phép','Dừng sát vạch giữa đường','Dừng ngay trong ngã tư'], why:'Dừng lâu giữa đường làm người khác phải chờ; hãy vào nơi đỗ xe.'},
  {q:'Người lái xe máy vượt đèn đỏ bị xử phạt thế nào?',
   a:['Phạt 4–6 triệu đồng, trừ 4 điểm GPLX','Phạt 200–400 nghìn đồng','Chỉ bị nhắc nhở'], why:'Theo NĐ 168/2024/NĐ-CP, Điều 7: phạt 4.000.000–6.000.000đ và trừ 4 điểm.'},
  {q:'Mỗi giấy phép lái xe có bao nhiêu điểm?',
   a:['12 điểm','10 điểm','20 điểm'], why:'Theo Luật Trật tự, an toàn giao thông đường bộ 2024, mỗi GPLX có 12 điểm.'}
];
const QUIZ_N = 5, QUIZ_PASS = 4;
