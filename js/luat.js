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
  // Phố đi bộ dựng bằng biển P.104 (cấm xe máy) + P.103a (cấm ô tô). Kiểm tra toàn văn NĐ 168 ngày 13/11/2026 (docs/THIET-KE.md mục 8).
  noentry: {
    name: 'Đi vào đường có biển cấm xe máy', fine: 2500000, range: '2.000.000–3.000.000đ', pts: 2,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7: điểm b khoản 6 (phạt tiền: đi vào khu vực cấm, đường có biển báo hiệu cấm đi vào đối với loại phương tiện đang điều khiển), điểm a khoản 13 (trừ điểm)',
    tip: 'Biển tròn viền đỏ, gạch chéo đỏ, hình người lái xe máy (P.104) là "Cấm xe máy". Biển cùng kiểu có hình ô tô (P.103a) là "Cấm ô tô". Phố đi bộ cắm hai biển này ở đầu phố: xe máy đừng chạy vào, hãy đi vòng sang đường khác.'
  },
  // Chỉ bắt khi rẽ ở ngã tư hoặc quay đầu. Vượt xe không báo hiệu là lỗi khác nên game không bắt.
  signal: {
    name: 'Rẽ hoặc quay đầu không bật xi-nhan', fine: 700000, range: '600.000–800.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, điểm a khoản 3 (chuyển hướng không có tín hiệu báo hướng rẽ; không trừ điểm GPLX). Căn cứ: khoản 2 Điều 15 Luật TTATGTĐB 2024: phải có tín hiệu báo hướng rẽ trước khi chuyển hướng và dùng liên tục trong suốt quá trình chuyển hướng',
    tip: 'Trước khi rẽ hoặc quay đầu, bật xi-nhan bên sẽ rẽ (phím Q: trái, E: phải; trên điện thoại là hai nút nhỏ phía trên nút mũi tên) và giữ đến khi rẽ xong. Xi-nhan xong nhớ tắt đi.'
  },
  // Chạy quá tốc độ (xe mô tô, xe gắn máy). Chỉ phạt khi vượt từ 5 km/h trở lên; dưới 5 km/h không phạt.
  // Từ bản 0.10.2 game phạt "nguội" bằng camera ở vạch dừng ngã tư có đèn (cách bắt lỗi là cách chơi, mức phạt không đổi).
  // Kiểm tra toàn văn NĐ 168/2024 và NĐ 238/2026 ngày 13/11/2026: NĐ 238 không đổi ba bậc này (docs/THIET-KE.md mục 8).
  speed1: {
    name: 'Chạy quá tốc độ từ 5 đến dưới 10 km/h', fine: 500000, range: '400.000–600.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, điểm b khoản 2 (không trừ điểm GPLX)',
    tip: 'Biển tròn viền đỏ ghi số (P.127) là tốc độ TỐI ĐA cho phép. Vượt từ 5 km/h trở lên là bị phạt. Nhìn đồng hồ, đổi màu là đang chạy quá. Camera ở ngã tư có đèn chụp tốc độ đúng lúc xe qua vạch dừng.'
  },
  speed2: {
    name: 'Chạy quá tốc độ từ 10 đến 20 km/h', fine: 900000, range: '800.000–1.000.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, điểm a khoản 4 (không trừ điểm GPLX)',
    tip: 'Biển tròn viền đỏ ghi số (P.127) là tốc độ TỐI ĐA cho phép. Vượt 10 đến 20 km/h bị phạt gần một triệu đồng; vượt trên 20 km/h còn bị trừ điểm.'
  },
  speed3: {
    name: 'Chạy quá tốc độ trên 20 km/h', fine: 7000000, range: '6.000.000–8.000.000đ', pts: 4,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7: điểm a khoản 8 (phạt tiền), điểm b khoản 13 (trừ điểm)',
    tip: 'Trước trường học có biển "Trẻ em" (tam giác vàng, W.225) và biển tốc độ thấp. Vượt trên 20 km/h bị phạt nặng và trừ 4 điểm; nếu gây tai nạn thì còn nặng hơn nhiều.'
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
// 'wrongway' tạm không có trong sổ tay vì bản đồ hiện chưa còn phố một chiều (Phố Chợ đã thành phố đi bộ); sẽ có lại ở bản đồ mở rộng.
const LAW_ORDER = ['red','speed1','speed2','speed3','noentry','signal','line','lane','ring','crash','parkdir'];

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
  {q:'Biển tròn, viền đỏ, gạch chéo đỏ, hình người lái xe máy nghĩa là gì?',
   a:['Cấm xe máy đi vào','Chỉ xe máy được đi','Đường dành cho người đi bộ'], why:'Đó là biển P.104 "Cấm xe máy". Xe máy đi vào đường có biển này bị phạt 2–3 triệu đồng và trừ 2 điểm (điểm b khoản 6 Điều 7 NĐ 168/2024).'},
  {q:'Bạn sắp rẽ phải ở ngã tư. Việc đúng là gì?',
   a:['Bật xi-nhan phải trước khi rẽ và giữ đến khi rẽ xong','Rẽ trước, bật xi-nhan sau','Không cần xi-nhan nếu đường vắng'], why:'Khoản 2 Điều 15 Luật TTATGTĐB 2024: phải có tín hiệu báo hướng rẽ trước khi chuyển hướng và dùng liên tục suốt quá trình chuyển hướng. Không bật bị phạt 600–800 nghìn đồng (điểm a khoản 3 Điều 7 NĐ 168/2024).'},
  {q:'Biển tròn, viền đỏ, nền trắng, ghi số 40 nghĩa là gì?',
   a:['Tốc độ tối đa cho phép là 40 km/h','Phải chạy ít nhất 40 km/h','Đoạn đường dài 40 mét'], why:'Đó là biển P.127 "Tốc độ tối đa cho phép". Xe máy vượt từ 5 km/h trở lên là bị phạt (điểm b khoản 2 Điều 7 NĐ 168/2024).'},
  {q:'Biển tam giác vàng, viền đỏ, hình hai em nhỏ báo hiệu điều gì?',
   a:['Gần đoạn đường thường có trẻ em qua lại, phải đi chậm và thận trọng','Cấm trẻ em đi vào','Có trạm xe buýt dành cho học sinh'], why:'Đó là biển W.225 "Trẻ em", đặt gần trường học, vườn trẻ. Gặp biển này phải giảm tốc, chú ý trẻ em chạy ra bất ngờ.'},
  {q:'Biển hạn chế tốc độ ghi 40. Bạn đi 52 km/h thì bị gì?',
   a:['Phạt 800.000–1.000.000đ (vượt 10 đến 20 km/h)','Không sao vì chỉ vượt 12 km/h','Phạt 6–8 triệu đồng, trừ 4 điểm'], why:'Vượt từ 10 đến 20 km/h bị phạt 800.000–1.000.000đ (điểm a khoản 4 Điều 7 NĐ 168/2024). Chỉ vượt dưới 5 km/h mới không bị phạt; vượt trên 20 km/h bị phạt 6–8 triệu và trừ 4 điểm.'},
  {q:'Mỗi giấy phép lái xe có bao nhiêu điểm?',
   a:['12 điểm','10 điểm','20 điểm'], why:'Theo Luật Trật tự, an toàn giao thông đường bộ 2024, mỗi GPLX có 12 điểm.'}
];
const QUIZ_N = 5, QUIZ_PASS = 4;
