# Traffic Prune: tài liệu thiết kế

Tài liệu này là **nguồn sự thật** của dự án. Mọi phiên làm việc mới (người hay AI) đọc file này trước khi sửa code. Khi một quyết định thay đổi, sửa ở đây trước rồi mới sửa code.

- Ghi chép phỏng vấn gốc và góp ý theo từng phiên bản: [`phong-van.md`](phong-van.md)
- Hướng dẫn cài đặt, cách chơi cho người dùng: [`../HUONG-DAN.md`](../HUONG-DAN.md)

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

## 3. Đã có trong bản 0.4

| Mảng | Nội dung |
|---|---|
| Bản đồ | Khu phố hư cấu 1600×1200 đơn vị (4 đơn vị = 1 m): 2 đường ngang, 2 đường dọc, 3 ngã tư có đèn, 1 phố một chiều, 1 vòng xuyến, chợ, 9 điểm giao hàng, 11 ô đỗ xe P, vỉa hè bo cong ở giao lộ |
| Vạch kẻ | Vạch vàng liền gần nút giao (90 đơn vị), vạch đứt ở giữa đoạn; thứ tự ở ngã tư: vạch dừng (trắng) → vạch người đi bộ → cột đèn |
| Góc nhìn | Kiểu ứng dụng dẫn đường: nghiêng 57°, xoay theo hướng xe; nút đổi sang bản đồ nhìn từ trên xuống |
| Chỉ đường | Vạch chấm xanh mảnh + bảng chỉ dẫn rẽ; tránh đi ngược chiều, không bảo quay đầu ở đoạn vạch liền; giọng đọc tiếng Việt của trình duyệt |
| Điều khiển | Ga, phanh (Space: chỉ phanh), rẽ; trợ lái giữ làn (tắt được); nút cảm ứng trên điện thoại |
| Lỗi bắt được | Vượt đèn đỏ (đầu xe qua vạch dừng), đi ngược chiều phố một chiều, đè vạch liền, chạy lâu bên phần đường ngược chiều, không nhường đường ở vòng xuyến, đi ngược chiều trong vòng xuyến, gây va chạm khi đang vi phạm |
| Hậu quả | Phạt tiền + trừ điểm GPLX; đền 50.000đ mỗi xe bị làm kẹt (xe buýt 100.000đ), 1.500.000đ khi va chạm có lỗi; NPC nói câu nhắc; hết điểm thì dừng xe, làm bài kiểm tra 5 câu (đúng ≥ 4) để phục hồi |
| Văn hóa (mới có một phần) | Nhắc khi dừng giữa đường, khi leo vỉa hè gặp người đi bộ, khi bám đuôi; NPC bấm còi khi bị chặn |
| Kinh tế | Tiền công theo quãng đường; thưởng đi sạch tăng theo chuỗi; 5 chuyến sạch liên tiếp hồi 1 điểm GPLX |
| Âm thanh | Tiếng máy, đèn vàng/xanh, còi CSGT, máy ảnh phạt nguội, còi NPC, nhạc thưởng, giọng chỉ đường (Web Audio, không file) |

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

## 8. Kiểm tra pháp lý

Lần gần nhất: 11/11/2026, agent độc lập đối chiếu `js/luat.js` và các câu pháp lý trong `js/game.js`.

- **Mức phạt và điểm trừ: đều đúng** với NĐ 168/2024/NĐ-CP. NĐ 238/2026/NĐ-CP (ban hành 26/6/2026, hiệu lực 15/8/2026) chỉ sửa điểm e khoản 1 và điểm b khoản 6 Điều 7, không đụng các lỗi trong game.
- Đã sửa: ghi rõ điểm cho lỗi sai phần đường (điểm d khoản 3), vòng xuyến (điểm d khoản 6, trừ điểm theo điểm a khoản 13), gây tai nạn (điểm a hoặc b khoản 10, trừ điểm theo điểm d khoản 13); mô tả biển đường một chiều (I.407, vuông/chữ nhật nền xanh); nhường đường khi không có báo hiệu vòng xuyến; câu điểm liệt trong bài kiểm tra phục hồi điểm; Thông tư 105/2026/TT-BCA đã sửa đổi Thông tư 65.
- Chưa xác minh được: hình biển vòng xuyến R.303; mốc áp dụng đề kiểm tra mới theo Thông tư 105/2026 (các nguồn chưa thống nhất, cần đọc toàn văn).
- Lưu ý thiết kế: đè vạch liền rồi chạy hẳn sang phần đường ngược chiều có thể bị xử theo điểm d khoản 3 (sai phần đường) thay vì điểm a khoản 1. Game hiện chỉ phạt lỗi đè vạch trong trường hợp này.
- Nguồn chính: luatvietnam.vn (NĐ 238/2026, Thông tư 105/2026), thuvienphapluat.vn (bảng lỗi trừ điểm), ketoananpha.vn (toàn văn NĐ 168/2024, Luật TTATGTĐB 2024), pbgdpl.cantho.gov.vn, lsvn.vn.

## 9. Việc còn bỏ ngỏ (ưu tiên từ trên xuống)

- Đọc toàn văn Thông tư 105/2026/TT-BCA để chốt mốc áp dụng đề kiểm tra mới.
- Âm thanh bản 0.4 chưa được nghe trên máy thật.
- Văn hóa giao thông: hai thanh điểm riêng (luật / văn hóa), các hành vi tốt được thưởng.
- Thu xe, đổi xe cũ khi không đủ tiền đền; mua xe; nhiều loại xe và vai (xe đạp, đi bộ, ô tô).
- Thêm lỗi: không đội mũ bảo hiểm, dùng điện thoại khi lái, dừng đỗ sai chỗ, đi vào làn cấm.
- Âm thanh nhóm C (tiếng phố, chợ) và G (nhạc nền).
- Nhiều người chơi thật, phòng, giảm NPC khi người chơi tăng.
- Đưa game lên mạng (GitHub Pages), đo chỉ số thành công.
- Các câu hỏi mở khác: xem mục "Việc còn bỏ ngỏ" trong `phong-van.md`.
