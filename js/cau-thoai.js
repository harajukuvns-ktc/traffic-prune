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
  noentry: [
    'Biển cấm xe máy to đùng thế kia mà {x} vẫn chạy vào. Phố đi bộ là để đi bộ, {x} ơi!',
    '{X} chạy xe giữa phố đi bộ à? Mấy bác đang dạo chợ nhìn {x} kìa.',
    'Gạch chéo đỏ nghĩa là xe máy đừng vào. {X} đọc biển chưa, hay biển tự đọc {x}?'
  ],
  speedcam: [
    'Tách! Camera ngã tư chụp {x} rồi. Biển ghi số mấy là tốc độ tối đa, không phải tốc độ tối thiểu đâu.',
    '{X} qua vạch dừng mà đồng hồ vượt giới hạn. Camera ngã tư không chớp mắt đâu, thư phạt về tận nhà đó.',
    'Ở ngã tư có camera, nhanh một chút là có ảnh làm kỷ niệm. Chậm lại trước vạch dừng nha {x}.',
    'Đồng hồ đổi màu từ lâu mà {x} vẫn giữ ga. Tới ngã tư là camera ghi hết đó.'
  ],
  speedcamschool: [
    'Khối phố có trường mầm non mà {x} phóng qua ngã tư thế này, camera chụp rồi đó. Các em nhỏ còn đi lại ở đây nữa.',
    'Có biển "Trẻ em" đàng hoàng đó {x}. Cả đoạn phố này là khu giảm ga, camera ngã tư ghi lại hết.',
    'Tách! Đoạn trường học giới hạn 30 mà {x}. Giảm ga từ lúc vào phố nhé, đừng chờ tới ngã tư.'
  ],
  speedwarn: [
    'Ơ, {x} đi nhanh hơn biển rồi. Ngã tư phía trước có camera đó, nhả ga đi kẻo bị chụp.',
    'Đồng hồ {x} đổi màu rồi kìa. Chậm lại trước ngã tư nhé, camera không biết nói chuyện đâu, chỉ biết chụp.',
    '{X} chạy nhanh hơn giới hạn đó. Giữa đường tôi mới nhắc, tới ngã tư thì camera phạt luôn đó.'
  ],
  speedwarnschool: [
    'Khối phố có trường mà {x} chạy nhanh vậy sao? Giảm xuống 30 đi, tới ngã tư camera chụp bây giờ.',
    'Có biển "Trẻ em" mà {x} chưa giảm ga. Mấy bé hay chạy ra bất chợt đó, chậm lại nha.'
  ],
  // mũ bảo hiểm: helmet = CSGT thổi còi tại chốt; helmetnpc = người đi đường nhắc, không phạt
  helmet: [
    'Tuýt! Đầu trần mà qua chốt à {x}? Mũ bảo hiểm là cái "áo giáp" rẻ nhất mà {x} lại để ở nhà.',
    'Mời {x} tấp vào. Không đội mũ bảo hiểm, phạt theo quy định nhé. Mũ rẻ hơn tiền phạt nhiều.',
    'Xe thì có biển số, đầu thì không có mũ. {X} đưa giấy tờ giùm tôi!'
  ],
  helmetnpc: [
    '{X} ơi, mũ bảo hiểm đâu rồi? Qua chốt CSGT là bị thổi còi đó, đội vào nha.',
    'Đầu trần chạy xe thế này nguy hiểm lắm {x} ơi. Đội mũ vào, nhanh một giây không bằng an toàn cả đời.',
    'Gió mát nhỉ {x}? Mát thì mát, nhưng đội mũ vào rồi hẵng mát.'
  ],
  // ô tô (bản 0.12): khóa có đuôi 'car' được dùng thay cho khóa gốc khi người chơi lái ô tô
  belt: [
    'Tuýt! Mời bác tài tấp vào. Dây an toàn treo đó làm cảnh à {x}?',
    'Dây an toàn thắt mất hai giây, còn biên bản thì ký mất mười phút đó {x}.',
    'Ngồi ô tô mà không thắt dây, phanh gấp một cái là {x} chào kính chắn gió luôn đó!'
  ],
  helmetnpccar: [
    'Bác tài ơi, dây an toàn đâu? Qua chốt CSGT là bị thổi còi đó nha.',
    '{X} lái ô tô mà không thắt dây à? Thắt vào đi, phanh gấp là nguy lắm.'
  ],
  noentryhem: [
    'Hẻm này cắm biển cấm ô tô đó {x}. Xe to chui vào là kẹt cả xóm!',
    'Ô tô của {x} vào hẻm thì bà con lấy lối đâu mà đi? Lùi ra đi đường lớn nha.',
    'Đầu hẻm có biển tròn gạch chéo hình ô tô kìa {x}. Hẻm nhỏ chỉ dành cho xe máy với người đi bộ thôi.'
  ],
  noentrycar: [
    'Phố đi bộ mà {x} lùa cả ô tô vào? Biển cấm ô tô to tướng ở đầu phố kìa!',
    'Ô tô của {x} chiếm hết lối đi của mấy bác dạo chợ rồi. Lùi ra giùm cái!',
    'Biển tròn gạch chéo có hình ô tô là cấm ô tô đó {x}. Phố này dành cho người đi bộ.'
  ],
  sidewalkcar: [
    'Ô tô mà leo lên vỉa hè hả {x}? Người đi bộ còn chỗ nào mà đi nữa!',
    'Ối! {X} đậu bánh xe lên vỉa hè suýt cán chân tôi rồi.'
  ],
  // điện thoại: phone = CSGT bắt tại chốt; phonecam = camera ngã tư chụp; phonewarn = người đi đường nhắc; phoneok = khách vui vì được nghe máy đàng hoàng
  phone: [
    'Tuýt! Một tay lái một tay cầm điện thoại, {x} định làm xiếc à? Mời tấp vào lập biên bản.',
    'Khách gọi thì khách chờ được, còn xe tải đâu có chờ {x}. Cầm điện thoại khi lái là bị phạt và trừ điểm nhé.',
    '{X} nghe điện thoại ngay giữa chốt CSGT luôn. Can đảm thì có, đúng luật thì không!'
  ],
  phonecam: [
    'Tách! Camera ngã tư chụp được {x} đang cầm điện thoại. Ảnh nét lắm, thư phạt về nhà liền.',
    'Cầm điện thoại qua ngã tư có camera là có ảnh làm kỷ niệm đó {x}. Lần sau tấp vào ô P rồi hẵng nghe.'
  ],
  phonewarn: [
    '{X} ơi, cầm điện thoại khi lái nguy hiểm lắm! Tấp vào ô P nghe cũng đâu mất bao lâu.',
    'Một tay lái một tay điện thoại, xe lắc lư như đi trên dây vậy {x}. Phía trước có chốt và camera đó.',
    'Khách gọi gấp tới đâu cũng đừng vừa chạy vừa nghe. Hai chữ "cầm máy" đắt hơn cuốc xe nhiều {x} ạ.'
  ],
  phoneok: [
    'Cảm ơn {x} đã dừng lại nghe máy đàng hoàng! Khách thấy lịch sự nên boa thêm chút đỉnh.',
    'Tấp vào đỗ rồi mới nghe máy, chuẩn quá {x}. Đơn của tôi nhờ {x} chăm sóc nhé, có chút trà đá gửi {x}.'
  ],
  signal: [
    'Rẽ mà không xi-nhan, người sau đoán ý {x} kiểu gì? Chưa ai có thần giao cách cảm đâu.',
    '{X} rẽ bất ngờ như phim kinh dị vậy. Bật xi-nhan trước nha, cả phố đỡ giật mình.',
    'Cái cần xi-nhan không phải đồ trang trí đâu {x} ơi. Bấm Q hoặc E trước khi rẽ nhé.'
  ],
  signaloff: [
    'Xi-nhan nhấp nháy nãy giờ mà {x} đi thẳng. Tắt giùm đi, người sau đang đoán {x} sắp rẽ đó!',
    'Đèn xi-nhan bên {x} còn nháy kìa. Xong việc rẽ thì tắt đi nha, kẻo cả phố hiểu lầm.'
  ],
  parkdir: [
    'Ơ kìa {x}, cả dãy xe đỗ xuôi chiều, mỗi {x} đỗ ngược. Định đứng ra chào khách à?',
    '{X} đỗ ngược chiều rồi kìa. Lúc ra xe lại phải cắt ngang dòng xe, nguy hiểm lắm đó!',
    'Đỗ xe thì xuôi theo chiều đi nha {x}. Đầu xe ngược thế này nhìn như đang cãi nhau với cả phố.'
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
  // khách chấm sao thấp khi điểm văn hóa dưới 40 (bản 1.0)
  cultlow: [
    'Hàng tới rồi. Tôi chấm {x} ít sao thôi, vì cả phố đều biết {x} đi đường kiểu gì.',
    'Cảm ơn {x}. Nhưng đi đường mà cứ như cả phố là của riêng mình thì tôi chấm sao hơi tiếc tay.',
    'Giao đúng hàng là tốt. Còn cách {x} đối xử với mọi người trên đường thì khách chỉ biết… nhắn nhẹ vậy thôi.'
  ],
  // người đi bộ qua vạch (bản 1.0b)
  crossbump: [
    'Ấy ấy! Vạch người đi bộ là của người đi bộ chứ {x} ơi, tôi qua đường chứ có phải qua… cua đâu!',
    'Giật cả mình! Thấy người ta đang qua vạch mà {x} vẫn rồ ga, tôi suýt làm quen với vỉa hè bằng… mặt.'
  ],
  crossthanks: [
    'Cảm ơn {x} đã dừng cho tôi qua nha! Đường phố mà ai cũng như {x} thì đẹp quá.',
    '{X} dừng nhường tôi, tôi nhớ ơn lắm. Chúc {x} một đường toàn đèn xanh!'
  ],
  tailgate: [
    '{X} ơi, bám đuôi sát vậy tôi tưởng mình đang cõng thêm một chiếc xe nữa. Giữ khoảng cách cho an toàn nha!',
    'Phía sau sát rạt thế này, tôi phanh cái là {x} thành người quen của… cốp xe tôi luôn.'
  ],
  cultbad: ['{X} ơi, đi đường cũng là sống chung với nhau. Nhường nhau một chút là ai cũng về nhà sớm hơn.'],
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
