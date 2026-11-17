# Hướng dẫn làm tiếp phần 3D (`thu-3d/`)

Đọc file này trước khi sửa bất cứ thứ gì trong `thu-3d/`. Quy tắc chung của dự án vẫn ở `CLAUDE.md` và `docs/THIET-KE.md` (mục 10.1).

## 1. Nguyên tắc

- **Bộ não của game giữ nguyên.** `thu-3d/index.html` nạp nguyên `../js/*.js` rồi mới nạp phần 3D. Phần 3D chỉ gán lại ba hàm toàn cục của `game.js`: `render`, `resize`, `step` (xem đầu `3d/chinh.js`). Không sửa `js/`, `css/`, `index.html` gốc từ đây.
- **Không file mô hình, không file ảnh.** Mọi hình dựng bằng code (`Gom`), mọi ảnh chất liệu vẽ bằng canvas lúc mở trang. Thư viện duy nhất: `lib/three.r187.js` (script thường, có `window.THREE`).
- **Dựng theo dữ liệu `MAP`**, không ghi cứng toạ độ. Ngoại lệ đang có: nhãn "CHỢ HOA SỮA" (bản 2D cũng ghi cứng).
- Script thường (không phải ES module) để nháy đúp `thu-3d/index.html` là chạy. Ghi chú trong code viết tiếng Việt.

## 2. Cấu trúc file và thứ tự nạp

Mọi file gắn vào một đối tượng chung `window.TP3`. Thứ tự trong `index.html` là bắt buộc:

| Thứ tự | File | Việc |
|---|---|---|
| 0 | `luu-rieng.js` (trước `game.js`) | Đổi khoá lưu sang `trafficPrune.thu3d` |
| 1 | `3d/nen-tang.js` | Tham số, ba mức đồ họa (`TP3.MUC`), `Gom` (gộp hình), `BangAnh` (ảnh ghép), `TP3.themLop` |
| 2 | `3d/danh-muc.js` | **Danh mục vật** `TP3.DANH_MUC` (không dùng three.js, Node nạp được) |
| 3 | `3d/chat-lieu.js` | Ảnh chất liệu tự sinh, hai bảng ảnh `TP3.anh.duc` / `TP3.anh.trong`, chất liệu `TP3.vl.*` |
| 4 | `3d/anh-sang.js` | Bảng cảnh `TP3.CANH`, nắng, trời, sương, bóng đổ |
| 5 | `3d/duong.js` | Lớp `duong`: ảnh mặt đất từng ô (dùng `veNen` của game), vỉa hè, bó vỉa; nền xa |
| 6 | `3d/nha.js` | Lớp `nha`: nhà ống, nhà lõi khối phố, trường học; "nhà xa" dạng khối |
| 7 | `3d/bien.js` | Lớp `bien`: dựng mọi vật loại `hinh` của danh mục (biển, cột đèn, chốt CSGT); bóng đèn tín hiệu |
| 8 | `3d/trang-tri.js` | Lớp `trang-tri`: cây, cột điện, dây, vòng xuyến, chợ, phố đi bộ, xe dựng vỉa hè |
| 9 | `3d/xe.js`, `3d/nguoi.js`, `3d/chi-duong.js` | Vật động: xe, người, vạch chỉ đường, ô đích |
| 10 | `3d/may-quay.js`, `3d/chu-noi.js` | Hai góc nhìn 3D; chữ nổi |
| 11 | `3d/chinh.js` (sau cùng) | Quản lý ô, vòng vẽ, giữ mát máy, nối vào game, `window.__T3D` |

## 3. Toạ độ, đơn vị, quy ước

- Bản đồ `(x, y)` với y hướng xuống → 3D là `(X = x, Y = độ cao, Z = y)`. 4 đơn vị = 1 mét. Góc bản đồ `a`: 0 = sang phải, π/2 = đi xuống.
- Hệ trục riêng của một vật: x tới trước (hoặc dọc mặt tiền), y lên trên, z sang phải. `G.dat(x, y0, z, a, s)` đặt khung cho mọi hình thêm sau đó; gọi `G.dat()` để trả về gốc.
- Vỉa hè cao `TP3.CAO_VIA` = 1,2. Vật trên vỉa hè đặt ở độ cao đó; vật dưới lòng đường ở 0.
- Xe máy dựng theo mét rồi phóng 6,2 lần; ô tô dài 20, xe buýt dài 46 (khớp vùng va chạm của game).
- Màu viết `'#rrggbb'`; hình không có ảnh tự trỏ vào ô trắng của bảng ảnh. Độ "che sáng" tô sẵn truyền qua `ao` (1 = sáng đủ).
- Bản đồ chia ô 512 × 512. Mỗi lớp là một hàm `ham(o, G)` dựng phần của mình cho **một ô** `o = {x0, y0, x1, y1, khoa}`; `G = {duc, trong, bong, day, them}` (hình đặc, hình có lỗ thủng, bóng mờ, dây điện, lưới riêng). Chỉ dựng vật có điểm neo nằm trong ô (`TP3.trongO`).

## 4. Thêm một loại biển / vật mới (ví dụ: biển STOP R.122)

Giả sử `js/ban-do.js` đã sinh biển STOP vào `SPEED_SIGNS` với `kind: 'stop'` (hoặc một bảng mới).

1. **Thêm một mục vào `TP3.DANH_MUC`** (`3d/danh-muc.js`):
   ```js
   {ma: 'R.122', ten: 'Biển dừng lại', phu: ['SPEED_SIGNS:stop'], kieu: 'hinh', hinh: 'bien',
     nguon: () => SPEED_SIGNS.filter(s => s.kind === 'stop').map(s => ({x: s.x, y: s.y, n: matVeXe(s.x, s.y), mat: ['dungLai'], dang: 'tron'}))},
   ```
   `phu` là tên bảng dữ liệu mục này lo; nếu là bảng hoàn toàn mới thì thêm tên bảng vào `TP3.bangCanLo()` ở cuối file.
2. **Vẽ mặt biển**: thêm nét `dungLai: g => {...}` vào `MAT_BIEN` trong `3d/bien.js` (ô 128 × 128; biển tám cạnh thì vẽ hình tám cạnh, phần ngoài để trong suốt). Kích thước lấy theo `dang` (`tron`, `tamGiac`, `vuong`, `bang`) trong bảng `KICH`; cần cỡ khác thì thêm một dòng vào `KICH`.
3. Vật không phải biển (dải phân cách, mũi tên mặt đường, chắn tàu...): đặt `hinh: 'tenRieng'` rồi viết `TP3.hinhVat.tenRieng = function(G, v, m){ ... }` trong `bien.js` hoặc file phù hợp. Vật nằm trên mặt đường và game đã vẽ trong `veNen` thì khai `kieu: 'mat-dat'`, không cần dựng.
4. **Chưa kịp viết hàm dựng cũng không sao**: loại `hinh` thiếu hàm sẽ tự dùng **hình thay thế** (cột với tấm biển trắng viền cam ghi mã). Xem thử: mở `thu-3d/index.html?thuThayThe=P.127`.
5. Chạy `node thu-3d/kiem-tra/kiem-vat.js` tới khi in "Tất cả đều có hình 3D", rồi chụp ảnh chỗ có vật mới để xem bằng mắt.

Hướng mặt biển: dữ liệu game chỉ có vị trí. `matVeXe(x, y)` suy ra từ làn đường gần nhất (biển ở bên phải chiều đi thì quay về xe đang tới). Biển có quy tắc khác thì tự tính `n` trong `nguon`.

## 5. Thêm bảng cảnh (đêm, mưa cho giai đoạn 3)

Thêm một bảng cùng dạng `CANH.ngay` vào `TP3.CANH` trong `3d/anh-sang.js` (độ phơi sáng, nắng, ánh trời, màu bầu trời, sương, bóng) rồi gọi `TP3.datCanh('dem', scene, renderer)`. Việc sẽ phải làm thêm khi có đêm: đèn đường, đèn pha, cửa sổ sáng (hiện chưa có chất liệu tự phát sáng cho nhà); mưa: hạt mưa, mặt đường sẫm. Các file dựng hình không phải sửa.

## 6. Ngân sách hiệu năng

| | thấp | vừa | cao |
|---|---|---|---|
| Lệnh vẽ mỗi khung | dưới 50 | dưới 80 | dưới 100 |
| Tam giác vẽ mỗi khung | khoảng 30 nghìn | khoảng 50–125 nghìn | khoảng 230–350 nghìn (có bóng đổ) |
| Ảnh trên card đồ họa | khoảng 32 MB | khoảng 51 MB | khoảng 78 MB |
| Số ô giữ cùng lúc (`oToiDa`) | 9 | 14 | 16 |

- Mỗi ô chỉ nên có 4–5 lưới: mặt đất, hình đặc, hình có lỗ thủng, bóng mờ, dây điện. Vật mới gộp vào `G.duc` / `G.trong`, không tạo lưới riêng.
- Vật động lặp lại dùng `InstancedMesh` (`TP3.taoLap`). Ảnh mới thêm vào hai bảng ảnh ghép, không tạo ảnh rời.
- Giữ mát máy nằm trong `chinh.js`: giới hạn khung hình (`?fps=30|45|60`, điện thoại mặc định 45), tự hạ / nâng 5 nấc (`?tu=0` để tắt), nhả ô xa, dựng ô chia nhiều bước, dựng lại khi mất ngữ cảnh WebGL.
- Tham số trang: `?q=thap|vua|cao`, `?fps=`, `?tu=0`, `?do=0` (tắt ô số đo), `?thuThayThe=<mã>`.

## 7. Kịch bản kiểm, chụp, đo (`thu-3d/kiem-tra/`)

Cần Node 22 và `google-chrome`; Chrome chạy không màn hình, vẽ 3D bằng CPU nên số khung hình chỉ để so tương đối.

| Lệnh | Việc |
|---|---|
| `cd tests && node kiem-tra-logic.js ../index.html` | Bài kiểm bộ não của game, phải in "Tất cả đều đạt" |
| `node thu-3d/kiem-tra/kiem-vat.js` | Vật chưa có hình 3D (không cần trình duyệt); `--gia-lap` để xem bài kiểm bắt lỗi ra sao |
| `node thu-3d/kiem-tra/lai-thu.js [địa chỉ http]` | Lái bằng bộ não thật: phạt đèn đỏ, giao hàng, mũ, đèn phanh, mất ngữ cảnh, giới hạn khung hình, bộ nhớ khi chạy dọc bản đồ |
| `node thu-3d/kiem-tra/chup-anh.js <thư mục> [lọc tên] [mức] [địa chỉ http] [--du]` | Chụp 10 chỗ cố định (4 ảnh mỗi chỗ, `--du` thì 8) |
| `node thu-3d/kiem-tra/do-toc-do.js [số khung] [mức]` | Đo khung/giây, lệnh vẽ, tam giác, bộ nhớ ảnh, thời gian dựng ô |

Trong trang có `window.__T3D`: `datXe(x, y, a, v)`, `gocNhin('nav'|'bike'|'map')`, `doiXe('bike'|'car')`, `sanSang()`, `do(n)`, `soO()`, `nac()`, `thuMatNguCanh()`, `thongTin`.

## 8. Chỗ bộ não dính vào phần vẽ 2D (việc cần làm khi gộp 3D vào game chính)

1. `render()` gộp vẽ canvas, `drawMini()`, `updHUD()` → nên tách thành "cập nhật giao diện" và "vẽ cảnh".
2. `resize()` gộp cỡ canvas 2D, phép nghiêng CSS, chữ nút góc nhìn, lớp `body.bike`, cỡ bản đồ nhỏ → tách phần giao diện ra.
3. Sự kiện đổi cỡ cửa sổ giữ tham chiếu `resize` gốc → gọi qua tên hàm.
4. Chữ nổi (tên đường, điểm giao, tiền bay lên, 😤 💬) nằm trong `drawUprights` → đưa danh sách chữ ra dữ liệu chung.
5. Biển, cột đèn chỉ có vị trí, không có hướng mặt → thêm hướng vào `js/ban-do.js`, bỏ phần đoán trong `danh-muc.js`.
6. Hình dáng, màu xe và người nằm trong các hàm `draw*`; người đi bộ không có hướng; xe NPC không có trạng thái xi-nhan, phanh (3D đang tự suy).
7. `newTrip()` chọn thẳng trong `DESTS` (đợt 1 từng phải bọc lại; nay không còn bọc).
8. Khoá lưu `localStorage` dùng chung → khi gộp thì bỏ `luu-rieng.js`.
9. `frame()` gọi `step` + `render` ở mọi nhịp màn hình → giới hạn khung hình đang làm trong `render` mới.

## 9. Hạn chế đã biết

- Chưa đo số khung hình trên điện thoại thật ở bản cả bản đồ; chỉ có nhận xét "rất tốt" của người dùng cho đợt 1.
- Ghi đông xe máy vẫn là lớp SVG `#cockpit` của game, chưa phải khối 3D.
- Dựng một ô mới tốn một bước nặng nhất khoảng 50–100 ms trên máy thử (bước vẽ ảnh mặt đất); trên điện thoại có thể thấy khựng nhẹ khi chạy nhanh qua mép ô.
- Ô xa hơn `oBanKinh` chỉ có khối nhà trơn, không có biển, cây, vỉa hè; chuyển sang hình đầy đủ khi tới gần (nằm trong sương).
- Nhà dọc Đại lộ Cây Bàng giữ theo `MAP.houses` (thẳng trục, xếp bậc thang) cho khớp va chạm, nên giữa nhà và vỉa hè có mảng cỏ hình tam giác.
- Chữ nổi không bị nhà che. Xe buýt NPC không có xi-nhan, đèn phanh.
- Chỗ đặt cây và cột điện tính một lần cho cả bản đồ lúc mở trang (hình thì dựng theo ô).
- Ba lỗi người dùng báo ở mục 9 của `docs/THIET-KE.md` (nút đội mũ, dòng nhắc che tầm mắt, góc sau tay lái khó thấy biển) chưa sửa.
