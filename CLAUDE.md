# Hướng dẫn cho Claude khi làm việc trong kho này

- **Quy tắc làm việc (người dùng yêu cầu ngày 12/11/2026): luôn lập kế hoạch trước khi làm, báo cáo các vấn đề và cách xử lý cho người dùng, chờ người dùng xác nhận rồi mới tiến hành.** Chỉ bỏ qua bước báo cáo ở bước cụ thể nào mà người dùng nói rõ là không cần. Áp dụng cho mọi phiên làm việc.
- Người dùng không biết lập trình. Trả lời bằng tiếng Việt, xưng "mình", gọi người dùng là "bạn"; giải thích ngắn, không thuật ngữ.
- **Đọc `docs/THIET-KE.md` trước khi sửa bất cứ thứ gì.** Đó là nguồn sự thật: mục tiêu, các quyết định đã chốt, cấu trúc code, quy ước, việc còn bỏ ngỏ. Ghi chép phỏng vấn gốc ở `docs/phong-van.md`.
- Khi người dùng góp ý hoặc chốt quyết định mới: ghi vào `docs/THIET-KE.md` (và mục góp ý trong `docs/phong-van.md`), thêm một dòng vào bảng lịch sử phiên bản.
- Game là script thường (không phải ES module) để vẫn mở được bằng nháy đúp `index.html`. Giữ thứ tự nạp: `luat.js` → `cau-thoai.js` → `ban-do.js` → `am-thanh.js` → `game.js`.
- Mọi mức phạt, điểm trừ, căn cứ pháp lý chỉ nằm trong `js/luat.js`, phải có nguồn. Khi sửa luật, chạy một agent độc lập đối chiếu với văn bản gốc và ghi kết quả vào mục 8 của `docs/THIET-KE.md`.
- Trước khi giao bản mới: `cd tests && node kiem-tra-logic.js ../index.html` phải in "Tất cả đều đạt"; mở game bằng trình duyệt để xem bằng mắt cả khổ máy tính và điện thoại; cập nhật `HUONG-DAN.md`.
- Ghi chú trong code viết tiếng Việt.
