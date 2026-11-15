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
  // Mũ bảo hiểm và điện thoại (bản 0.11). Đối chiếu ngày 15/11/2026 qua nhiều nguồn thứ cấp (chưa lấy được toàn văn NĐ 168): xem docs/THIET-KE.md mục 8.
  helmet: {
    name: 'Không đội mũ bảo hiểm (hoặc đội không cài quai)', fine: 500000, range: '400.000–600.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, điểm h khoản 2 (người điều khiển xe mô tô, xe gắn máy không đội mũ bảo hiểm hoặc đội không cài quai đúng quy cách; các nguồn không ghi trừ điểm GPLX)',
    tip: 'Lên xe là đội mũ và cài quai ngay, kể cả đi quãng ngắn. Trong game bấm nút "Đội mũ" (phím H). Qua chốt CSGT mà đầu trần là bị thổi còi dừng xe.'
  },
  phone: {
    name: 'Vừa lái xe vừa cầm và dùng điện thoại', fine: 900000, range: '800.000–1.000.000đ', pts: 4,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 7, điểm đ khoản 4 (dùng tay cầm và sử dụng điện thoại khi điều khiển xe; trừ 4 điểm GPLX theo quy định trừ điểm tại khoản 13). Gây tai nạn thì bị phạt nặng hơn, tính vào lỗi "gây va chạm". Căn cứ cấm: khoản 6 Điều 9 Luật TTATGTĐB 2024. Điện thoại gắn cố định trên giá đỡ, chỉ nhìn bản đồ, không cầm và không thao tác thì không bị phạt theo hành vi này',
    tip: 'Có cuộc gọi thì tấp vào ô P hoặc chỗ được phép đỗ rồi mới nghe. Đang chạy, kể cả đang dừng đèn đỏ, mà cầm điện thoại thì vẫn là đang lái xe và bị phạt. Màn hình dẫn đường gắn trên xe thì được, miễn đừng cầm và thao tác.'
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
const LAW_ORDER = ['red','speed1','speed2','speed3','noentry','signal','helmet','phone','line','lane','ring','crash','parkdir'];

// ===== Ô TÔ (bản 0.12): Điều 6 NĐ 168/2024/NĐ-CP; điểm trừ theo khoản 16 Điều 6 =====
// Đối chiếu ngày 15/11/2026: agent Sonnet độc lập (bản toàn văn ketoananpha.vn qua công cụ tóm tắt, bảng lỗi trừ điểm của thuvienphapluat.vn, luatvietnam.vn)
// và một lượt tra của Claude (luatvietnam.vn, nguoiquansat.vn, báo Lao Động). NĐ 238/2026 không đổi mức phạt và điểm trừ các lỗi dưới đây.
// Chưa đọc được nguyên văn PDF chính thức; độ chắc của từng lỗi ghi ở docs/THIET-KE.md mục 8.
const LAW_CAR = {
  red: {
    name: 'Ô tô vượt đèn đỏ', fine: 19000000, range: '18.000.000–20.000.000đ', pts: 4,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: điểm b khoản 9 (phạt tiền), điểm b khoản 16 (trừ điểm)',
    tip: 'Đèn đỏ, đèn vàng: dừng trước vạch dừng. Ô tô vượt đèn đỏ bị phạt gấp gần bốn lần xe máy.'
  },
  wrongway: {
    name: 'Ô tô đi ngược chiều đường một chiều', fine: 19000000, range: '18.000.000–20.000.000đ', pts: 4,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: điểm d khoản 9 (phạt tiền), điểm b khoản 16 (trừ điểm)',
    tip: 'Biển P.102 "Cấm đi ngược chiều" và biển I.407 "Đường một chiều": chỉ đi theo hướng mũi tên.'
  },
  line: {
    name: 'Ô tô đè vạch liền (không chấp hành vạch kẻ đường)', fine: 500000, range: '400.000–600.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6, điểm a khoản 1 (không trừ điểm GPLX). Nếu đè vạch rồi chạy sang phần đường ngược chiều thì có thể bị xử theo lỗi sai phần đường (điểm b khoản 5)',
    tip: 'Vạch vàng liền: không được đè lên hay lấn sang bên kia. Ô tô dài, muốn rẽ hay quay đầu thì chọn chỗ vạch đứt hoặc nút giao.'
  },
  lane: {
    name: 'Ô tô đi không đúng phần đường, làn đường', fine: 5000000, range: '4.000.000–6.000.000đ', pts: 2,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: điểm b khoản 5 (phạt tiền), khoản 16 (trừ 2 điểm)',
    tip: 'Đi bên phải theo chiều của mình. Vượt xe máy thì qua vạch đứt, vượt xong về làn ngay. Trong vòng xuyến đi ngược chiều kim đồng hồ.'
  },
  ring: {
    name: 'Ô tô không nhường đường tại vòng xuyến', fine: 5000000, range: '4.000.000–6.000.000đ', pts: 2,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: điểm o khoản 5 (phạt tiền), khoản 16 (trừ 2 điểm)',
    tip: 'Vào vòng xuyến có báo hiệu: giảm tốc, nhường xe đi đến từ bên trái (khoản 3 Điều 22 Luật TTATGTĐB 2024).'
  },
  crash: {
    name: 'Ô tô gây va chạm khi đang vi phạm', fine: 21000000, range: '20.000.000–22.000.000đ', pts: 10,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: khoản 10 (điểm a hoặc b tùy lỗi gây ra), trừ 10 điểm theo khoản 16',
    tip: 'Ô tô nặng và dài, phanh xa hơn xe máy. Một lỗi nhỏ cộng một cú va chạm là thành lỗi rất nặng.'
  },
  noentry: {
    name: 'Ô tô đi vào đường có biển cấm ô tô', fine: 5000000, range: '4.000.000–6.000.000đ', pts: 2,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: điểm i khoản 5 (đi vào khu vực cấm, đường có biển báo hiệu cấm đi vào đối với loại phương tiện đang điều khiển), khoản 16 (trừ 2 điểm)',
    tip: 'Biển tròn viền đỏ, gạch chéo đỏ, hình ô tô (P.103a) là "Cấm ô tô". Phố đi bộ cắm biển này ở đầu phố: đi vòng sang đường khác.'
  },
  signal: {
    name: 'Ô tô rẽ hoặc quay đầu không bật xi-nhan', fine: 900000, range: '800.000–1.000.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6, điểm c khoản 3 (chuyển hướng không có tín hiệu báo hướng rẽ; không trừ điểm GPLX). Căn cứ: khoản 2 Điều 15 Luật TTATGTĐB 2024',
    tip: 'Bật xi-nhan trước khi rẽ hoặc quay đầu (phím Q, E) và giữ đến khi rẽ xong. Ô tô quay đầu lâu nên càng phải báo sớm.'
  },
  speed1: {
    name: 'Ô tô quá tốc độ từ 5 đến dưới 10 km/h', fine: 900000, range: '800.000–1.000.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6, điểm a khoản 3 (không trừ điểm GPLX)',
    tip: 'Biển tròn viền đỏ ghi số (P.127) là tốc độ tối đa, áp dụng cho cả ô tô. Camera ở ngã tư có đèn chụp đúng lúc xe qua vạch dừng.'
  },
  speed2: {
    name: 'Ô tô quá tốc độ từ 10 đến 20 km/h', fine: 5000000, range: '4.000.000–6.000.000đ', pts: 2,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: điểm đ khoản 5 (phạt tiền), khoản 16 (trừ 2 điểm)',
    tip: 'Ô tô vượt 10 km/h là đã bị trừ điểm, khác xe máy. Nhả ga sớm trước ngã tư.'
  },
  speed3: {
    name: 'Ô tô quá tốc độ trên 20 đến 35 km/h', fine: 7000000, range: '6.000.000–8.000.000đ', pts: 4,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: điểm a khoản 6 (phạt tiền), khoản 16 (trừ 4 điểm)',
    tip: 'Khu trường học giới hạn 30: chạy 51 km/h là đã vượt 21 km/h.'
  },
  speed4: {
    name: 'Ô tô quá tốc độ trên 35 km/h', fine: 13000000, range: '12.000.000–14.000.000đ', pts: 6,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: điểm a khoản 7 (phạt tiền), khoản 16 (trừ 6 điểm)',
    tip: 'Vượt trên 35 km/h là mức nặng nhất, mất nửa số điểm bằng lái. Nếu gây tai nạn thì còn nặng hơn nhiều.'
  },
  belt: {
    name: 'Người lái ô tô không thắt dây an toàn', fine: 900000, range: '800.000–1.000.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6, điểm k khoản 3 (người điều khiển không thắt dây an toàn khi xe đang chạy; không trừ điểm GPLX). Người ngồi trên xe không thắt dây: điểm l khoản 3',
    tip: 'Lên xe là thắt dây an toàn ngay, kể cả đi quãng ngắn. Trong game bấm nút "Thắt dây an toàn" (phím H).'
  },
  phone: {
    name: 'Lái ô tô mà cầm và dùng điện thoại', fine: 5000000, range: '4.000.000–6.000.000đ', pts: 4,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6: điểm h khoản 5 (dùng tay cầm và sử dụng điện thoại hoặc thiết bị điện tử khi điều khiển xe đang di chuyển), khoản 16 (trừ 4 điểm)',
    tip: 'Có cuộc gọi thì tấp vào chỗ được phép đỗ rồi mới nghe. Điện thoại gắn cố định để xem bản đồ thì được, miễn đừng cầm và thao tác khi xe chạy.'
  },
  parkdir: {
    name: 'Ô tô đỗ xe ngược chiều', fine: 700000, range: '600.000–800.000đ', pts: 0,
    ref: 'NĐ 168/2024/NĐ-CP, Điều 6, khoản 2 (điểm d hoặc đ: dừng, đỗ xe không đúng chiều quy định; chưa chắc là điểm nào), không trừ điểm. Căn cứ: khoản 6 Điều 18 Luật TTATGTĐB 2024',
    tip: 'Đỗ ven đường: sát lề bên phải theo chiều đang đi, đầu xe xuôi theo dòng xe. Khác xe máy, ô tô đỗ ngược chiều là bị phạt.'
  }
};
const LAW_ORDER_CAR = ['red','speed1','speed2','speed3','speed4','noentry','signal','belt','phone','line','lane','ring','crash','parkdir'];

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
  {veh:'bike', q:'Người lái xe máy vượt đèn đỏ bị xử phạt thế nào?',
   a:['Phạt 4–6 triệu đồng, trừ 4 điểm GPLX','Phạt 200–400 nghìn đồng','Chỉ bị nhắc nhở'], why:'Theo NĐ 168/2024/NĐ-CP, Điều 7: phạt 4.000.000–6.000.000đ và trừ 4 điểm.'},
  {veh:'bike', q:'Biển tròn, viền đỏ, gạch chéo đỏ, hình người lái xe máy nghĩa là gì?',
   a:['Cấm xe máy đi vào','Chỉ xe máy được đi','Đường dành cho người đi bộ'], why:'Đó là biển P.104 "Cấm xe máy". Xe máy đi vào đường có biển này bị phạt 2–3 triệu đồng và trừ 2 điểm (điểm b khoản 6 Điều 7 NĐ 168/2024).'},
  {veh:'bike', q:'Bạn sắp rẽ phải ở ngã tư. Việc đúng là gì?',
   a:['Bật xi-nhan phải trước khi rẽ và giữ đến khi rẽ xong','Rẽ trước, bật xi-nhan sau','Không cần xi-nhan nếu đường vắng'], why:'Khoản 2 Điều 15 Luật TTATGTĐB 2024: phải có tín hiệu báo hướng rẽ trước khi chuyển hướng và dùng liên tục suốt quá trình chuyển hướng. Không bật bị phạt 600–800 nghìn đồng (điểm a khoản 3 Điều 7 NĐ 168/2024).'},
  {veh:'bike', q:'Biển tròn, viền đỏ, nền trắng, ghi số 40 nghĩa là gì?',
   a:['Tốc độ tối đa cho phép là 40 km/h','Phải chạy ít nhất 40 km/h','Đoạn đường dài 40 mét'], why:'Đó là biển P.127 "Tốc độ tối đa cho phép". Xe máy vượt từ 5 km/h trở lên là bị phạt (điểm b khoản 2 Điều 7 NĐ 168/2024).'},
  {q:'Biển tam giác vàng, viền đỏ, hình hai em nhỏ báo hiệu điều gì?',
   a:['Gần đoạn đường thường có trẻ em qua lại, phải đi chậm và thận trọng','Cấm trẻ em đi vào','Có trạm xe buýt dành cho học sinh'], why:'Đó là biển W.225 "Trẻ em", đặt gần trường học, vườn trẻ. Gặp biển này phải giảm tốc, chú ý trẻ em chạy ra bất ngờ.'},
  {veh:'bike', q:'Biển hạn chế tốc độ ghi 40. Bạn đi 52 km/h thì bị gì?',
   a:['Phạt 800.000–1.000.000đ (vượt 10 đến 20 km/h)','Không sao vì chỉ vượt 12 km/h','Phạt 6–8 triệu đồng, trừ 4 điểm'], why:'Vượt từ 10 đến 20 km/h bị phạt 800.000–1.000.000đ (điểm a khoản 4 Điều 7 NĐ 168/2024). Chỉ vượt dưới 5 km/h mới không bị phạt; vượt trên 20 km/h bị phạt 6–8 triệu và trừ 4 điểm.'},
  {veh:'bike', q:'Đi xe máy mà không đội mũ bảo hiểm (hoặc đội mà không cài quai) thì bị xử phạt thế nào?',
   a:['Phạt 400.000–600.000đ','Chỉ bị nhắc nhở nếu đi quãng ngắn','Phạt 4–6 triệu đồng, trừ 4 điểm'], why:'Người điều khiển xe máy không đội mũ bảo hiểm hoặc đội không cài quai đúng quy cách bị phạt 400.000–600.000đ (điểm h khoản 2 Điều 7 NĐ 168/2024). Đi quãng ngắn cũng không được miễn.'},
  {veh:'bike', q:'Có khách gọi điện lúc bạn đang chạy xe máy. Việc đúng là gì?',
   a:['Tấp vào chỗ được phép đỗ rồi mới nghe máy','Cầm điện thoại nghe một tay cho nhanh','Dừng giữa đường nghe cho tiện'], why:'Vừa lái vừa cầm và dùng điện thoại bị phạt 800.000–1.000.000đ và trừ 4 điểm GPLX (điểm đ khoản 4 Điều 7 NĐ 168/2024). Điện thoại gắn cố định trên giá đỡ để xem bản đồ thì không bị phạt, nhưng không được cầm và thao tác khi đang lái. Dừng giữa đường làm cản trở người khác.'},
  // Câu riêng cho ô tô (veh: 'car'); câu không ghi veh dùng cho cả hai loại xe
  {veh:'car', q:'Lái ô tô vượt đèn đỏ bị xử phạt thế nào?',
   a:['Phạt 18–20 triệu đồng, trừ 4 điểm GPLX','Phạt 4–6 triệu đồng','Chỉ bị nhắc nhở'], why:'Điểm b khoản 9 Điều 6 NĐ 168/2024: phạt 18.000.000–20.000.000đ; trừ 4 điểm theo khoản 16.'},
  {veh:'car', q:'Người lái ô tô không thắt dây an toàn khi xe đang chạy thì sao?',
   a:['Bị phạt 800.000–1.000.000đ','Không sao nếu đi trong phố','Chỉ người ngồi sau mới phải thắt'], why:'Người lái không thắt dây an toàn bị phạt 800.000–1.000.000đ (điểm k khoản 3 Điều 6 NĐ 168/2024); người ngồi trên xe không thắt cũng bị phạt.'},
  {veh:'car', q:'Đang lái ô tô thì có điện thoại. Việc đúng là gì?',
   a:['Tìm chỗ được phép đỗ, dừng hẳn rồi mới nghe','Cầm máy nghe nhanh vì đường vắng','Nghe lúc dừng đèn đỏ là được'], why:'Dùng tay cầm và sử dụng điện thoại khi lái ô tô bị phạt 4–6 triệu đồng và trừ 4 điểm (điểm h khoản 5 Điều 6 NĐ 168/2024). Dừng đèn đỏ vẫn là đang điều khiển xe trên đường.'},
  {veh:'car', q:'Biển giới hạn 30 km/h, bạn lái ô tô 52 km/h. Bạn vượt bao nhiêu và bị phạt mức nào?',
   a:['Vượt 22 km/h: phạt 6–8 triệu, trừ 4 điểm','Vượt 22 km/h: phạt 800.000–1.000.000đ','Không sao, vì chưa tới 60 km/h'], why:'Ô tô vượt trên 20 đến 35 km/h bị phạt 6–8 triệu đồng và trừ 4 điểm (điểm a khoản 6 Điều 6 NĐ 168/2024). Vượt trên 35 km/h: 12–14 triệu, trừ 6 điểm.'},
  {veh:'car', q:'Biển tròn, viền đỏ, gạch chéo đỏ, có hình ô tô nghĩa là gì?',
   a:['Cấm ô tô đi vào','Chỉ ô tô được đi','Bãi đỗ ô tô'], why:'Đó là biển P.103a "Cấm xe ô tô". Lái ô tô vào đường có biển này bị phạt 4–6 triệu đồng và trừ 2 điểm (điểm i khoản 5 Điều 6 NĐ 168/2024).'},
  {q:'Mỗi giấy phép lái xe có bao nhiêu điểm?',
   a:['12 điểm','10 điểm','20 điểm'], why:'Theo Luật Trật tự, an toàn giao thông đường bộ 2024, mỗi GPLX có 12 điểm.'}
];
const QUIZ_N = 5, QUIZ_PASS = 4;
