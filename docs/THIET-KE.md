# Traffic Prune: tài liệu thiết kế

Tài liệu này là **nguồn sự thật** của dự án. Mọi phiên làm việc mới (người hay AI) đọc file này trước khi sửa code. Khi một quyết định thay đổi, sửa ở đây trước rồi mới sửa code.

- Ghi chép phỏng vấn gốc và góp ý theo từng phiên bản: [`phong-van.md`](phong-van.md)
- Hướng dẫn cài đặt, cách chơi cho người dùng: [`../HUONG-DAN.md`](../HUONG-DAN.md)

## 0. Quy tắc làm việc

**Quy tắc làm việc (người dùng yêu cầu ngày 12/11/2026): luôn lập kế hoạch trước khi làm, báo cáo các vấn đề và cách xử lý cho người dùng, chờ người dùng xác nhận rồi mới tiến hành.** Chỉ bỏ qua bước báo cáo ở bước cụ thể nào mà người dùng nói rõ là không cần. Áp dụng cho mọi phiên làm việc.

Trình tự mỗi lần có việc mới: (1) đọc tài liệu này; (2) gửi người dùng kế hoạch: vấn đề, nguyên nhân, cách xử lý, câu hỏi cần chốt; (3) **nhắc người dùng chọn mô hình phù hợp cho việc sắp làm, theo bảng ở mục 11** (người dùng yêu cầu ngày 13/11/2026); (4) chờ xác nhận; (5) làm, kiểm tra, cập nhật tài liệu; (6) báo kết quả.

## 1. Mục tiêu

Webgame giúp **người lớn đã đi xe lâu năm**, hay quen thói sai luật, nhận ra cái sai và học đi đúng luật giao thông đường bộ Việt Nam **mà không bị lên lớp**. Hai điểm mấu chốt:

1. Cách xử lý biển báo, phân làn, giao lộ và các tình huống thực tế khác (mở rộng dần).
2. **Văn hóa tham gia giao thông**.

Dự án cá nhân, phục vụ cộng đồng. Một người phụ trách, không biết lập trình; Claude viết code.

## 2. Nguyên tắc thiết kế (đã chốt)

- **Không có màn chơi dựng sẵn.** Một thành phố chung, người chơi nhập vai (giao hàng, đi làm…) và tự tạo tình huống bằng thói quen của mình.
- **Học từ hậu quả.** Vi phạm thì có hậu quả tự nhiên (kẹt xe, va chạm), hậu quả pháp lý (phạt tiền, trừ điểm theo mức thật) và một dòng giải thích luật ngắn.
- **NPC nhắc nhở hài hước, nhẹ nhàng mà sâu cay.** Giọng chung của game: nhẹ nhàng, vui tươi, thân thiện.
- **Công bằng cho người đi đúng.** Người vi phạm đền tiền cho người bị ảnh hưởng; càng nhiều người bị ảnh hưởng thì đền càng nhiều.
- **Đi đúng luật luôn có lợi hơn.** Chuyến càng dài, càng sạch thì càng nhiều tiền và điểm.
- **Bám luật hiện hành.** Mọi mức phạt, điểm trừ và căn cứ nằm trong `js/luat.js`, có ghi nguồn.
- **Quyền riêng tư.** Chỉ lưu thông tin người chơi tự khai báo và cách họ chơi; bản thử nghiệm chỉ lưu trên máy người chơi.
- **Ưu tiên điện thoại, chơi được trên máy tính**, chạy ngay trên trình duyệt, không cần cài.

## 3. Đã có trong bản 0.8

| Mảng | Nội dung |
|---|---|
| Bản đồ | Khu phố hư cấu 1600×1200 đơn vị (4 đơn vị = 1 m): 2 đường ngang, 2 đường dọc, 3 ngã tư có đèn, 1 phố một chiều, 1 vòng xuyến, chợ, 9 điểm giao hàng, 11 ô đỗ xe P kẻ vạch trên lòng đường sát mép vỉa hè bên phải theo chiều đi (Điều 18 Luật TTATGTĐB 2024), vỉa hè bo cong ở giao lộ |
| Vạch kẻ | Vạch vàng liền gần nút giao (90 đơn vị), vạch đứt ở giữa đoạn; thứ tự ở ngã tư: vạch dừng (trắng) → vạch người đi bộ → cột đèn |
| Góc nhìn | Ba kiểu, đổi vòng bằng một nút: **dẫn đường** (mặc định, nghiêng 57°, xoay theo hướng xe) → **sau tay lái** (`S.view = 'bike'`: máy quay thấp và sát xe, nghiêng 75°, không vẽ xe người chơi mà hiện ghi đông + đồng hồ tốc độ ở mép dưới) → **bản đồ** nhìn từ trên xuống. Kiểu sau tay lái vẫn là tấm bản đồ phẳng nghiêng đi (cách A), nhà chưa có tường; góc nhìn thứ nhất 3D thật (cách B) để sau |
| Chỉ đường | Vạch chấm xanh mảnh + bảng chỉ dẫn rẽ; tránh đi ngược chiều, không bảo quay đầu ở đoạn vạch liền; luôn dẫn vào ô đỗ theo đúng chiều của ô (ô ở lề bên kia thì bảo quay đầu); giọng đọc tiếng Việt của trình duyệt |
| Điều khiển | Ga, phanh (Space: chỉ phanh), rẽ; trợ lái giữ làn và giữ xe thẳng trong ô đỗ (tắt được); trên điện thoại: chữ thập ▲▼◀▶ bên trái (▲ = ga, ▼ = phanh rồi lùi), PHANH và GA bên phải |
| Lỗi bắt được | Vượt đèn đỏ (đầu xe qua vạch dừng), đi ngược chiều phố một chiều, đè vạch liền, chạy lâu bên phần đường ngược chiều, không nhường đường ở vòng xuyến, đi ngược chiều trong vòng xuyến, gây va chạm khi đang vi phạm. **Chỉ nhắc nhở** (không phạt tiền, không trừ điểm, chuyến không tính sạch): đỗ trong ô P mà đầu xe ngược chiều đi |
| Hậu quả | Phạt tiền + trừ điểm GPLX; đền 50.000đ mỗi xe bị làm kẹt (xe buýt 100.000đ), 1.500.000đ khi va chạm có lỗi; NPC nói câu nhắc; hết điểm thì dừng xe, làm bài kiểm tra 5 câu (đúng ≥ 4) để phục hồi |
| Văn hóa (mới có một phần) | Nhắc khi dừng giữa đường, khi leo vỉa hè gặp người đi bộ, khi bám đuôi; NPC bấm còi khi bị chặn |
| Kinh tế | Tiền công theo quãng đường; thưởng đi sạch tăng theo chuỗi; 5 chuyến sạch liên tiếp hồi 1 điểm GPLX |
| Âm thanh | Tiếng máy (xe số 4 số; xe tay ga tiếng cao, đều, có tiếng rít curoa; chọn trong bảng 🔊), đèn vàng/xanh, còi CSGT, máy ảnh phạt nguội, còi NPC, nhạc thưởng, giọng chỉ đường (Web Audio, không file). Trên iPhone, âm thanh được mở khóa lúc nhấc tay khỏi màn hình; bảng 🔊 báo âm thanh đang chạy hay bị chặn |
| Giọng NPC | Kiểu game: chữ hiện dần, mỗi tiếng (âm tiết) một tiếng bíp, cao độ uốn theo dấu thanh tiếng Việt; mỗi kiểu nhân vật một giọng (bảng `GIONG` trong `js/cau-thoai.js`); im khi giọng chỉ đường đang đọc |

## Bản chơi trên mạng

GitHub Pages (bật ngày 12/11/2026): **https://harajukuvns-ktc.github.io/traffic-prune/**. Mỗi lần đẩy code lên nhánh `main`, trang tự cập nhật sau khoảng 1–2 phút.

## 4. Cấu trúc code

```
index.html          khung trang, nạp các file bên dưới theo thứ tự
css/style.css       giao diện bảng chỉ dẫn, nút, hộp thoại
js/luat.js          LUẬT: mức phạt, điểm trừ, căn cứ, mẹo; câu hỏi kiểm tra phục hồi điểm
js/cau-thoai.js     LỜI THOẠI NPC, tên nhân vật
js/ban-do.js        BẢN ĐỒ: đường, đèn, vạch, ô đỗ, điểm giao, lộ trình NPC, hàm classify()
js/am-thanh.js      ÂM THANH: đối tượng SND
js/game.js          trạng thái, NPC, người chơi, bắt lỗi, chỉ đường, vẽ, giao diện, khởi động
tests/              kiểm tra tự động (chạy bằng Node)
CLAUDE.md           hướng dẫn ngắn cho các phiên làm việc với Claude
docs/               tài liệu thiết kế, ghi chép phỏng vấn
```

Các file là script thường (không phải ES module), chia sẻ biến toàn cục, nên **vẫn mở được bằng nháy đúp** `index.html`. Thứ tự nạp trong `index.html` là bắt buộc: luat → cau-thoai → ban-do → am-thanh → game.

### Quy ước

- Đơn vị bản đồ: 4 đơn vị = 1 m. Tốc độ hiển thị km/h = vận tốc / 3.
- Giao thông đi bên phải; vòng xuyến chạy ngược chiều kim đồng hồ (trên màn hình, góc atan2 giảm dần).
- Đáp án đúng của mỗi câu hỏi trong `QUIZ` luôn đặt ở `a[0]`.
- Lời thoại dùng `{x}` (cách gọi người chơi), `{X}` (viết hoa), `{n}` (số lần mắc lỗi).
- Ghi chú trong code viết tiếng Việt.

## 5. Kiểm tra trước khi phát hành một bản mới

```
cd tests
node kiem-tra-logic.js ../index.html
```

Bài kiểm tra mô phỏng 5 phút giao thông và từng tình huống: NPC không kẹt cứng và không vượt đèn đỏ; mỗi lỗi bị bắt đúng; đi đúng thì không bị phạt; chỉ đường hợp lệ cho mọi cặp điểm giao; phanh, hết điểm GPLX, giao hàng ở ô P. Phải in ra "Tất cả đều đạt".

Sau đó mở game bằng trình duyệt để xem bằng mắt (máy tính và khổ điện thoại).

## 6. Cách làm việc với các agent

Không giao trọn một mảng cho một agent cố định (agent không nhớ gì giữa các phiên). Thay vào đó:

- **Kiểm tra luật độc lập:** mỗi khi `js/luat.js` thay đổi hoặc trước khi phát hành, một agent chưa thấy code tự đối chiếu với văn bản gốc. Kết quả lần kiểm tra gần nhất ghi ở mục 8.
- **Chơi thử, soát lỗi:** mỗi bản mới, một agent chơi trên trình duyệt, cố tình vi phạm từng lỗi, báo chỗ bị phạt oan hay chỉ đường sai.
- **Soạn nội dung song song:** câu thoại, câu hỏi kiểm tra; Claude rà lại trước khi đưa vào game.

## 7. Lịch sử phiên bản

| Bản | Ngày | Thay đổi chính |
|---|---|---|
| 0.1 | 11/11/2026 | Khu phố 2D, xe máy + NPC, 4 lỗi, phạt và đền, câu thoại NPC, giao hàng |
| 0.2 | 11/11/2026 | Góc nhìn dẫn đường, trợ lái giữ làn, 11 ô đỗ P, vạch đứt/liền, lỗi đè vạch liền |
| 0.3 | 11/11/2026 | Hạ góc nhìn, chỉ đường dạng vạch chấm, vạch dừng → vạch người đi bộ → đèn, vỉa hè bo cong |
| 0.4 | 11/11/2026 | Space chỉ phanh, vạch dừng trắng, hết điểm GPLX dừng xe + bài kiểm tra, âm thanh |
| 0.4.1 | 11/11/2026 | Tách thành nhiều file theo mảng, thêm tài liệu thiết kế và kiểm tra tự động; sửa căn cứ pháp lý theo kết quả kiểm tra độc lập |
| 0.5 | 11/11/2026 | Tiếng máy xe làm lại: xe số có 4 số (vòng tua tụt khi lên số), thêm lựa chọn xe tay ga; ô tốc độ hiện số đang chạy |
| 0.6 | 11/11/2026 | Giọng NPC kiểu game (phương án A): chữ hiện dần, bíp theo dấu thanh, giọng riêng theo nhân vật; thanh chỉnh âm lượng giọng NPC |
| 0.7 | 12/11/2026 | Quy tắc làm việc (lập kế hoạch, báo cáo, chờ xác nhận); ô đỗ chuyển xuống lòng đường sát vỉa hè theo chiều đi, chỉ đường vào ô đúng chiều; chữ thập 4 nút trên điện thoại; tiếng xe tay ga làm lại; sửa iPhone không có tiếng. Đỗ ngược chiều trong ô P: chỉ nhắc nhở theo đúng luật (người dùng chốt 09:14) |
| 0.8 | 12/11/2026 | Thêm góc nhìn "sau tay lái" (cách A, là lựa chọn thêm): máy quay thấp sát xe, ghi đông và đồng hồ tốc độ |

## 8. Kiểm tra pháp lý

Lần gần nhất: 11/11/2026, agent độc lập đối chiếu `js/luat.js` và các câu pháp lý trong `js/game.js`.

- **Mức phạt và điểm trừ: đều đúng** với NĐ 168/2024/NĐ-CP. NĐ 238/2026/NĐ-CP (ban hành 26/6/2026, hiệu lực 15/8/2026) chỉ sửa điểm e khoản 1 và điểm b khoản 6 Điều 7, không đụng các lỗi trong game.
- Đã sửa: ghi rõ điểm cho lỗi sai phần đường (điểm d khoản 3), vòng xuyến (điểm d khoản 6, trừ điểm theo điểm a khoản 13), gây tai nạn (điểm a hoặc b khoản 10, trừ điểm theo điểm d khoản 13); mô tả biển đường một chiều (I.407, vuông/chữ nhật nền xanh); nhường đường khi không có báo hiệu vòng xuyến; câu điểm liệt trong bài kiểm tra phục hồi điểm; Thông tư 105/2026/TT-BCA đã sửa đổi Thông tư 65.
- Chưa xác minh được: hình biển vòng xuyến R.303; mốc áp dụng đề kiểm tra mới theo Thông tư 105/2026 (các nguồn chưa thống nhất, cần đọc toàn văn).
- Lưu ý thiết kế: đè vạch liền rồi chạy hẳn sang phần đường ngược chiều có thể bị xử theo điểm d khoản 3 (sai phần đường) thay vì điểm a khoản 1. Game hiện chỉ phạt lỗi đè vạch trong trường hợp này.
- Nguồn chính: luatvietnam.vn (NĐ 238/2026, Thông tư 105/2026), thuvienphapluat.vn (bảng lỗi trừ điểm), ketoananpha.vn (toàn văn NĐ 168/2024, Luật TTATGTĐB 2024), pbgdpl.cantho.gov.vn, lsvn.vn.

### Kiểm tra ngày 12/11/2026: lỗi nhắc nhở "Đỗ xe không đúng chiều đi" (`parkdir`)

- Agent độc lập xác nhận: khoản 6 Điều 18 Luật TTATGTĐB 2024 yêu cầu dừng, đỗ sát lề, vỉa hè bên phải theo chiều đi, áp dụng cho mọi người điều khiển phương tiện, kể cả xe máy. Cấm dừng, đỗ bên trái đường một chiều ở điểm a khoản 4 Điều 18.
- Điều 7 NĐ 168/2024 (xe máy) **không có** hành vi đỗ ngược chiều. Với ô tô thì có: điểm d khoản 2 Điều 6, phạt 600.000–800.000đ. NĐ 238/2026 không sửa Điều 7 về dừng, đỗ.
- Các lỗi dừng, đỗ của xe máy ở Điều 7 (để dùng sau này): điểm a khoản 2 (đỗ trên phần đường xe chạy ngoài đô thị nơi có lề), điểm d khoản 2 (đỗ ở lòng đường gây cản trở), điểm e khoản 2 (nơi giao nhau, nơi có biển cấm dừng, đỗ…), đều 400.000–600.000đ.
- Đã sửa câu căn cứ trong `js/luat.js` theo đề xuất: ghi đủ số luật, ghi NĐ 168 đã sửa đổi bởi NĐ 238, nói rõ "không quy định xử phạt".
- Chưa xác minh được: toàn văn NĐ 168 và NĐ 238 từ trang chính thức (vbpl.vn, chinhphu.vn không mở được); chưa loại trừ hẳn việc áp lỗi chung "không chấp hành vạch kẻ đường" nếu ô đỗ có vạch chỉ hướng. Lời luật lấy từ hethongphapluat.com, luatvietnam.vn, ketoananpha.vn.

## 9. Việc còn bỏ ngỏ (ưu tiên từ trên xuống)

- (Đã chốt 12/11/2026 lúc 09:14: "Ok, chỉ nhắc nhở theo đúng luật.") Đỗ xe ngược chiều: NĐ 168/2024 Điều 7 không có mức phạt riêng cho xe máy, nên game chỉ nhắc nhở (mục `parkdir` trong `js/luat.js`). Nếu sau này muốn phạt, chỉ có thể dùng điểm d khoản 2 Điều 7 (đỗ ở lòng đường gây cản trở) hoặc điểm e khoản 2 (đỗ nơi cấm, ví dụ bên trái đường một chiều).
- Người dùng chơi thử bản 0.8 trên iPhone thật: âm thanh đã có chưa, chữ thập dễ bấm không, góc nhìn sau tay lái có mượt và dễ lái không.
- Góc nhìn thứ nhất 3D thật (cách B) và các việc mở rộng khác: xem lộ trình ở mục 10. Khi làm cách B, cân nhắc thêm gương chiếu hậu và mũi tên báo ô P bên cạnh.
- Giọng NPC: đã làm phương án A (bíp kiểu game). Khi lời thoại ổn định, có thể thêm C (thu âm giọng thật) hoặc D (giọng AI tạo sẵn) cho vài câu "đinh".
- Âm thanh (bản 0.4), tiếng máy xe (bản 0.5) và giọng NPC (bản 0.6) chưa được nghe trên máy thật.
- Đọc toàn văn Thông tư 105/2026/TT-BCA để chốt mốc áp dụng đề kiểm tra mới.
- Văn hóa giao thông: hai thanh điểm riêng (luật / văn hóa), các hành vi tốt được thưởng.
- Thu xe, đổi xe cũ khi không đủ tiền đền; mua xe; nhiều loại xe và vai (xe đạp, đi bộ, ô tô).
- Thêm lỗi: không đội mũ bảo hiểm, dùng điện thoại khi lái, dừng đỗ sai chỗ, đi vào làn cấm.
- Âm thanh nhóm C (tiếng phố, chợ) và G (nhạc nền).
- Nhiều người chơi thật, phòng, giảm NPC khi người chơi tăng.
- Đo chỉ số thành công khi có người chơi thật.
- Các câu hỏi mở khác: xem mục "Việc còn bỏ ngỏ" trong `phong-van.md`.

*Các việc về đồ họa 3D, mở rộng bản đồ và nâng độ khó đã được xếp vào lộ trình ở mục 10.*

## 10. Lộ trình nâng cấp

### 10.1 Đồ họa 3D (đã chốt 12/11/2026)

Ba nấc đồ họa:

| Nấc | Nội dung | Công sức |
|---|---|---|
| 1 (hiện tại) | Bản đồ phẳng nghiêng đi, có kiểu nhìn "sau tay lái" | Đã có |
| 2 | 3D hình khối đơn giản: nhà là khối hộp có tường, biển báo và đèn đứng thẳng, xe là khối đơn giản (tức "cách B" của góc nhìn thứ nhất) | Vài phiên làm việc |
| 3 | 3D đầy đủ: mô hình xe, người, cây, bóng đổ, ánh sáng | Rất lớn, cần mô hình mua sẵn hoặc người làm mô hình |

**Chỉ nâng lên nấc 2 khi đủ ba điều kiện:**

1. Nội dung luật đã đủ (xong giai đoạn 1 và phần lớn giai đoạn 2 của mục 10.2).
2. Người dùng đã chơi thử trên điện thoại thật và thấy điều khiển dễ.
3. Đã chốt có đổi sang bản đồ thành phố thật hay không. Nếu có thì làm 3D cùng lúc với việc đổi bản đồ, tránh làm lại hai lần.

Dấu hiệu thêm: nếu người dùng chơi kiểu nhìn "sau tay lái" (cách A, bản 0.8) mà thấy chưa đủ cảm giác thì đó là lúc nên nâng.

Nấc 3 chỉ tính đến khi dự án có thêm người hoặc đã có người chơi thật.

**Khi nâng cấp:**

- Phần "bộ não" (`js/luat.js`, `js/ban-do.js`, phần bắt lỗi và chỉ đường trong `js/game.js`) giữ nguyên; chỉ phần vẽ ra màn hình viết lại. Bài kiểm tra tự động vẫn chạy được vì chỉ kiểm tra bộ não.
- Thư viện vẽ 3D để ngay trong thư mục game, giữ được việc nháy đúp `index.html` là chạy.
- Luôn giữ lại kiểu nhìn bản đồ nhẹ cho máy yếu.

### 10.2 Mở rộng bản đồ và nâng độ khó (ĐÃ CHỐT 13/11/2026)

Người dùng yêu cầu lúc 10:57 ngày 12/11/2026 và chốt lúc 08:15 ngày 13/11/2026: "Mình nhất trí với thứ tự ba giai đoạn bạn đề xuất, nhớ lưu lại để tránh sót giai đoạn; trong giai đoạn 1 nên làm biển chỉ dẫn, biển cấm xe máy, ô tô và xi-nhan; bản đồ mở rộng gấp 2; không cần chế độ dễ riêng cho người mới."

**Làm theo đúng thứ tự giai đoạn 1 → 2 → 3 → 3D. Mỗi phiên làm việc đọc bảng này trước để không sót việc.**

| Việc | Giai đoạn | Trạng thái |
|---|---|---|
| Biển chỉ dẫn hướng đi trước giao lộ | 1 (làm trước) | Chưa làm |
| Biển cấm xe máy, biển cấm ô tô | 1 (làm trước) | Chưa làm |
| Xi-nhan và lỗi không xi-nhan | 1 (làm trước) | Chưa làm |
| Biển hạn chế tốc độ, lỗi quá tốc độ | 1 | Chưa làm |
| Mũ bảo hiểm, dùng điện thoại khi lái | 1 | Chưa làm |
| Hai thanh điểm: luật và văn hóa | 1 | Chưa làm |
| Mở rộng bản đồ gấp 2, chia theo khu | 2 | Chưa làm |
| Bộ sinh lộ trình NPC tự động | 2 | Chưa làm |
| Giờ cao điểm, mưa, ban đêm, xe ưu tiên, NPC đi ẩu | 3 | Chưa làm |
| Đồ họa 3D nấc 2 (mục 10.1) | Sau cùng | Chưa làm |

**Giai đoạn 1 (bản 0.9–1.0): làm sâu trên bản đồ hiện có, chưa mở rộng**

Ba việc người dùng chọn làm trước:

- **Biển chỉ dẫn hướng đi** (biển xanh, tên đường và mũi tên) đặt trước mỗi giao lộ. Mũi tên phân làn kẻ trên mặt đường **để sang giai đoạn 2** vì mỗi chiều hiện chỉ có một làn (người dùng chốt 13/11/2026).
- **Biển cấm xe máy và biển cấm ô tô**, kèm lỗi đi vào đường cấm. **Phố Chợ đổi thành phố đi bộ** có biển cấm (người dùng chọn phương án (a) ngày 13/11/2026), để người chơi đi xe máy gặp hậu quả thật; chỉ đường phải tự tránh Phố Chợ. Cần agent tra Quy chuẩn 41 lấy đúng hình, số hiệu biển và tra NĐ 168 lấy mức phạt trước khi đưa vào `js/luat.js`.
- **Xi-nhan:** phím Q và E trên máy tính, hai nút nhỏ ngay trên chữ thập trên điện thoại; đèn xi-nhan nhấp nháy trên xe, có tiếng tích tắc; bảng chỉ dẫn nhắc "bật xi-nhan" trước chỗ rẽ. **Xi-nhan không tự tắt**; quên tắt quá lâu thì NPC nhắc, không phạt (người dùng chốt 13/11/2026).
  - Chỉ phạt lỗi không xi-nhan khi xe **đi qua ngã tư mà đổi hướng rõ rệt** hoặc **cắt qua vạch đứt sang làn bên kia**; bỏ qua khi trợ lái đang can thiệp, để tránh phạt oan.

Rồi mới tới:

- Biển hạn chế tốc độ và lỗi chạy quá tốc độ.
- Lỗi không đội mũ bảo hiểm (chọn ở màn mở đầu) và dùng điện thoại khi lái.
- Hai thanh điểm riêng: luật và văn hóa.

**Không làm chế độ dễ riêng cho người mới** (người dùng chốt 13/11/2026). Độ khó đến từ giao thông và từ việc người chơi tự chọn hành trình.

**Giai đoạn 2 (bản 1.x): mở rộng bản đồ gấp 2, chia theo khu, mỗi khu một nhóm tình huống**

- Đại lộ có phân làn ô tô / xe máy, dải phân cách, điểm mở để quay đầu.
- Giao lộ lớn: đèn mũi tên rẽ trái riêng, nhiều biển chỉ dẫn, làn rẽ riêng.
- Khu chợ và hẻm nhỏ: nhường đường khi từ hẻm ra đường chính, người đi bộ, hàng rong lấn đường.
- Khu trường học: hạn chế tốc độ, trẻ em qua đường.
- Đường sắt cắt ngang có biển và chuông.
- Vòng xuyến lớn nhiều lối ra.

Bản đồ gấp 2 nghĩa là khoảng 3200×1200 hoặc 1600×2400 đơn vị; chọn hướng nào tùy bố cục khu, quyết định khi bắt tay làm giai đoạn 2.

Việc kỹ thuật bắt buộc kèm theo: viết bộ sinh lộ trình NPC tự động. Hiện `ROUTES` trong `js/ban-do.js` viết tay từng tuyến, bản đồ to gấp đôi thì không quản nổi.

**Giai đoạn 3 (bản 2.x): độ khó sống động**

- Giờ cao điểm: mật độ xe thay đổi theo giờ trong game.
- Mưa: đường trơn, phanh ăn kém, tầm nhìn giảm.
- Ban đêm, đèn xe, lỗi không bật đèn.
- Xe ưu tiên (cứu thương, cứu hỏa) phải nhường đường.
- NPC đi ẩu có chủ ý để người chơi tập phòng vệ.

**Sau giai đoạn 3 mới tới đồ họa 3D (mục 10.1).**

Mỗi khi xong một việc, đổi trạng thái trong bảng trên và thêm dòng vào bảng lịch sử phiên bản ở mục 7.

## 11. Chọn mô hình cho từng loại việc (để đỡ tốn hạn mức)

Người dùng hỏi ngày 13/11/2026. Nguyên tắc chung theo hướng dẫn của Anthropic: Sonnet là lựa chọn mặc định cho phần lớn việc viết code; Opus dành cho việc khó hoặc động đến nhiều chỗ; Haiku cho việc máy móc. Cách dùng hiệu quả nhất là **lập kế hoạch bằng Opus, thực hiện bằng Sonnet**; đổi mô hình giữa chừng không làm mất nội dung cuộc trò chuyện.

| Loại việc trong dự án này | Mô hình | Vì sao |
|---|---|---|
| Lập kế hoạch, lộ trình, quyết định thiết kế, tư vấn | Opus | Ít lượt, mỗi quyết định ảnh hưởng dài; đây là chỗ Opus đáng tiền nhất |
| Viết code một việc đã có kế hoạch rõ (thêm biển báo, thêm xi-nhan, thêm một lỗi) | Sonnet | Phần lớn việc code hằng ngày; nhanh và rẻ hơn nhiều |
| Dựng bản đồ: thêm đường, nút, ô đỗ, tuyến NPC theo khuôn có sẵn | Sonnet | Việc lặp lại, nhiều số liệu, đã có mẫu trong `js/ban-do.js`. Riêng việc **quyết định bố cục khu nào dạy gì** thì nằm ở bước lập kế hoạch (Opus) |
| Soạn câu thoại NPC, câu hỏi kiểm tra, cập nhật tài liệu, đổi tên, sửa chữ | Haiku | Việc máy móc, không cần suy luận sâu |
| Lỗi khó tìm, sửa chạm nhiều file, đổi cách vẽ (ví dụ lên 3D) | Opus | Đúng loại việc Opus mạnh hơn hẳn |
| Agent tra cứu luật, tra cứu biển báo | Sonnet | Đọc nhiều nguồn rồi tóm lại; Claude rà lại kết luận trước khi đưa vào `js/luat.js` |

**Claude phải nhắc người dùng chọn mô hình trước khi bắt tay vào mỗi công việc cụ thể** (người dùng yêu cầu 13/11/2026), vì đổi mô hình giữa chừng không làm mất nội dung cuộc trò chuyện.

Mức effort là đòn bẩy thứ hai: để thấp hoặc vừa cho việc thường, chỉ để cao khi việc khó.

Thói quen giúp đỡ tốn hạn mức:

- **Mỗi việc lớn mở một phiên mới.** Tài liệu trong Project được cache nên dùng lại ít tốn hơn là kéo dài một phiên đã rất dài.
- Gộp nhiều góp ý vào một lượt thay vì nhắn từng ý.
- Giao việc đọc nhiều (tra cứu luật, biển báo) cho agent riêng, vì agent chỉ trả về bản tóm tắt ngắn.
- Xem mức đã dùng ở Settings > Usage.

Nguồn: hướng dẫn của Anthropic về chọn mô hình và về hạn mức sử dụng (support.claude.com).
