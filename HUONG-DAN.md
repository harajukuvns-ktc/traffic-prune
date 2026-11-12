# Traffic Prune: hướng dẫn cài đặt và chạy thử (bản 0.7)

Từ bản 0.4.1, game gồm **nhiều file trong một thư mục** (`index.html`, thư mục `css`, thư mục `js`…). Bạn không cần cài thêm thư viện hay phần mềm game nào, nhưng **phải giữ nguyên cả thư mục**: chỉ chép riêng `index.html` ra chỗ khác thì game sẽ không chạy.

**Cách nhanh nhất: chơi ngay trên mạng**, không cần tải gì, chạy được cả trên điện thoại: https://harajukuvns-ktc.github.io/traffic-prune/ . Trang này luôn là bản mới nhất.

Cách lấy game mới nhất về máy: vào trang kho code trên GitHub, bấm nút xanh **Code → Download ZIP**, rồi giải nén ra một thư mục.

## Cách 1: mở thẳng (nhanh nhất)

1. Giải nén game ra một thư mục, ví dụ `Traffic Prune`.
2. Nháy đúp vào `index.html` trong thư mục đó. Game sẽ mở trong trình duyệt (Chrome, Edge, Cốc Cốc, Firefox, Safari đều được).
3. Chọn cách người trong phố gọi bạn, bấm **Lên xe!** là chơi.

## Cách 2: chạy bằng localhost

Chạy bằng localhost giống cách một trang web thật chạy, và về sau sẽ cần cách này khi game có nhiều người chơi.

**Bước 1: kiểm tra máy đã có Python chưa**

- Windows: bấm phím Windows, gõ `cmd`, Enter. Trong cửa sổ đen gõ `python --version` rồi Enter.
- Mac: mở **Terminal** (gõ "Terminal" trong Spotlight), gõ `python3 --version` rồi Enter.

Nếu thấy dòng kiểu `Python 3.12.x` là máy đã có Python. Nếu báo lỗi:

- Windows: vào https://www.python.org/downloads/ tải bản mới nhất. Khi cài, **nhớ tích ô "Add python.exe to PATH"**. Cài xong thì đóng cửa sổ `cmd` cũ, mở lại.
- Mac: gõ `xcode-select --install` rồi làm theo hướng dẫn trên màn hình.

**Bước 2: bật máy chủ trong thư mục game**

- Windows: mở thư mục chứa `index.html`, bấm vào thanh địa chỉ ở trên cùng, gõ `cmd` rồi Enter. Một cửa sổ đen mở ra ngay tại thư mục đó. Gõ:
  ```
  python -m http.server 8000
  ```
- Mac: trong Terminal gõ `cd ` (có dấu cách), kéo thư mục game thả vào cửa sổ Terminal, Enter. Rồi gõ:
  ```
  python3 -m http.server 8000
  ```

Thấy dòng `Serving HTTP on ... port 8000` là máy chủ đã chạy. **Để nguyên cửa sổ này, đừng tắt.**

**Bước 3: mở game**

Mở trình duyệt và vào địa chỉ: **http://localhost:8000**

**Tắt máy chủ:** quay lại cửa sổ đen, bấm `Ctrl + C`.

**Chơi thử trên điện thoại (cùng mạng Wi-Fi với máy tính):**
1. Tìm địa chỉ IP của máy tính. Trên Windows gõ `ipconfig` và xem dòng `IPv4 Address`, ví dụ `192.168.1.5`. Trên Mac vào System Settings → Wi-Fi → Details.
2. Trên điện thoại mở `http://192.168.1.5:8000`, thay bằng IP của bạn.
3. Nếu không vào được, có thể tường lửa Windows đang chặn. Khi Windows hỏi có cho Python truy cập mạng không, chọn **Allow**.

## Cách chơi (bản 0.7)

- **Màn hình dẫn đường:** bản đồ xoay theo hướng xe, giống ứng dụng dẫn đường trên điện thoại. Vạch chấm xanh nhạt có mũi tên nhỏ là lối đi được gợi ý; vạch mảnh nên không che làn đường. Bảng xanh lá phía trên báo chỗ rẽ sắp tới, ví dụ "140 m · Rẽ phải vào Đường Cầu Vồng". Nút **🗺️ Bản đồ** ở góc phải đổi về kiểu nhìn từ trên xuống của bản 0.1, bấm lần nữa để quay lại.
- **Lái xe:** ↑ hoặc W để ga, **Space để phanh** (chỉ phanh, dừng hẳn thì đứng yên), ↓ hoặc S cũng phanh nhưng giữ tiếp sau khi dừng thì xe lùi chậm, ← → hoặc A D để rẽ trái, rẽ phải. Vì bản đồ xoay theo xe nên ← luôn là rẽ sang trái của bạn. Trên điện thoại: bên trái có 4 nút hình chữ thập (▲ tiến, giống GA; ▼ phanh, dừng hẳn rồi giữ tiếp thì lùi chậm; ◀ ▶ rẽ), bên phải có PHANH (chỉ phanh, không lùi) và GA.
- **Trợ lái giữ làn:** khi bạn thả phím rẽ ra, xe tự chạy thẳng theo làn bên phải. Bạn chỉ cần bấm rẽ ở ngã tư, khi vào ô đỗ hoặc khi muốn vượt. Tắt được ở màn hình mở đầu (nút ❔).
- **Giao hàng:** tới nơi thì tấp vào **ô đỗ xe có biển P** của điểm giao (đang nhấp nháy xanh) và dừng hẳn lại. Dừng ngoài lòng đường không tính.
- **Ô đỗ xe P:** có 11 ô, kẻ vạch trắng ngay trên lòng đường, sát vỉa hè bên phải theo chiều xe chạy, giống ngoài đời. Muốn đỗ vào ô ở lề bên kia thì phải quay đầu để đỗ đúng chiều; chỉ đường sẽ dẫn bạn như vậy. Đỗ trong ô thì không cản ai và không ai đụng bạn. Dừng lâu giữa đường làm người khác phải chờ thì sẽ bị nhắc.
- **Vạch giữa đường:** vạch vàng **đứt** thì được cắt qua để rẽ, vượt hoặc vào làn bên kia để quay đầu, xong phải về làn ngay. Vạch vàng **liền** (gần ngã tư và vòng xuyến) thì không được đè lên.
- **Đèn tín hiệu:** khi tiến vào ngã tư, bạn sẽ gặp lần lượt **vạch dừng** (màu trắng), **vạch người đi bộ**, rồi **cột đèn** ở góc giao lộ. Đèn đỏ thì dừng trước vạch dừng; đầu xe vượt qua vạch dừng lúc đèn đỏ là bị phạt. Có dòng nhắc "🔴 Đèn đỏ phía trước" khi bạn tới gần.
- **Thưởng:** chuyến đi không vi phạm được thưởng thêm, chuỗi chuyến sạch càng dài thì thưởng càng cao. Cứ 5 chuyến sạch liên tiếp thì hồi 1 điểm GPLX.
- **Phạt:** vượt đèn đỏ, đi ngược chiều Phố Chợ, đè vạch liền, chạy lâu bên phần đường ngược chiều, không nhường đường ở vòng xuyến. Gây va chạm khi đang vi phạm thì bị phạt nặng hơn nữa.
- **Nhắc nhở (không phạt tiền):** đỗ trong ô P mà đầu xe quay ngược chiều đi. Luật yêu cầu đỗ sát lề bên phải theo chiều đi, nhưng với xe máy không có mức phạt riêng, nên game chỉ nhắc. Chuyến đó không được tính là chuyến sạch.
- **Đền:** ai bị bạn làm kẹt xe hoặc đụng phải thì được đền tiền từ ví của bạn. Người bị ảnh hưởng hiện mặt 😤.
- **Hết điểm GPLX:** bị trừ hết 12 điểm thì xe dừng ngay, không lái tiếp được, đúng như luật. Muốn lái lại thì làm bài kiểm tra 5 câu về luật, đúng từ 4 câu là được phục hồi đủ 12 điểm. Nếu không muốn thi, bạn có thể chọn chơi lại từ đầu.
- **Âm thanh (nút 🔊):** tiếng máy xe theo loại xe bạn chọn trong bảng 🔊: **xe số** (có 4 số, máy kéo lên rồi tụt nhẹ mỗi lần lên số; ô tốc độ hiện bạn đang ở số mấy) hoặc **xe tay ga** (tiếng cao, đều, kèm tiếng rít nhẹ của dây curoa); tiếng "tít tít" khi bạn lao tới đèn vàng; tiếng "ting" khi đèn chuyển xanh lúc bạn đang chờ; tiếng còi CSGT, và tiếng máy ảnh khi vượt đèn đỏ; NPC bị bạn chặn đường sẽ bấm còi, càng chờ lâu càng bấm nhiều; tiếng nhạc thưởng khi giao hàng, chuỗi chuyến sạch càng dài thì nốt càng cao. Bảng 🔊 có nút bật tắt, chọn loại xe, ba thanh chỉnh âm lượng (tiếng động, giọng chỉ đường, giọng NPC) và nút **▶ Nghe thử**.
- **Giọng đọc chỉ đường:** game đọc chỉ dẫn bằng giọng tiếng Việt có sẵn trong trình duyệt, ví dụ "100 mét nữa, rẽ phải vào Đường Cầu Vồng". Nếu bảng 🔊 báo máy chưa có giọng tiếng Việt thì game chỉ hiện chữ. Trên Windows có thể thêm giọng tiếng Việt: Settings → Time & language → Speech → Add voices → Tiếng Việt, rồi mở lại trình duyệt.
- **Giọng NPC:** khi người trong phố nói, chữ hiện dần trong khung lời thoại kèm tiếng "líu lo" kiểu game. Mỗi tiếng nói là một tiếng bíp, uốn lên xuống theo dấu thanh (sắc đi lên, huyền đi xuống…). Mỗi kiểu nhân vật một giọng: bác xe ôm trầm, cô bán xôi cao, bác tài xe buýt ồm ồm. Khi giọng chỉ đường đang đọc thì NPC chỉ hiện chữ.
- **📘 Sổ tay:** xem lại luật, mức phạt, căn cứ pháp lý, và bạn đã mắc mỗi lỗi bao nhiêu lần.

## Bản 0.7 đổi gì so với bản 0.6

1. Ô đỗ xe P chuyển xuống lòng đường, sát vỉa hè, theo chiều xe chạy. Chỉ đường dẫn vào ô đúng chiều.
2. Trên điện thoại có thêm chữ thập 4 nút ▲▼◀▶ bên trái, có lùi xe.
3. Tiếng xe tay ga làm lại cho cao và đều hơn.
4. Sửa lỗi iPhone không có tiếng. Nếu vẫn không nghe, chạm vào màn hình một lần rồi mở bảng 🔊 xem dòng "Âm thanh: …".
5. Đỗ ngược chiều trong ô P thì bị nhắc nhở (không phạt tiền), chuyến đó không tính sạch.

## Bản 0.6 đổi gì so với bản 0.5

1. Thêm giọng NPC kiểu game: chữ hiện dần, tiếng bíp theo dấu thanh, mỗi nhân vật một giọng.
2. Thêm thanh chỉnh âm lượng giọng NPC trong bảng 🔊.

## Bản 0.5 đổi gì so với bản 0.4

1. Làm lại tiếng máy xe: xe số có lên số, tiếng êm hơn, bớt gầm gừ.
2. Thêm lựa chọn loại xe (xe số hoặc xe tay ga) trong bảng 🔊.

## Bản 0.4 đổi gì so với bản 0.3

1. Space giờ chỉ phanh, không còn làm xe lùi. Nút PHANH trên điện thoại cũng vậy.
2. Vạch dừng luôn màu trắng, không đổi màu theo đèn.
3. Bị trừ hết điểm GPLX thì xe dừng ngay; muốn lái tiếp phải làm bài kiểm tra luật.
4. Thêm âm thanh: tiếng máy xe, tín hiệu đèn, còi CSGT, còi NPC khi bị chặn, nhạc thưởng, giọng đọc chỉ đường.

## Bản 0.3 đổi gì so với bản 0.2

1. Góc nhìn hạ thấp hơn, gần mặt đường hơn.
2. Đường chỉ dẫn đổi thành vạch chấm mảnh, nhạt, có mũi tên nhỏ, không che làn đường.
3. Sắp lại đúng thứ tự ở ngã tư: vạch dừng, vạch người đi bộ, rồi cột đèn. Lỗi vượt đèn đỏ giờ tính khi đầu xe vượt qua vạch dừng.
4. Vỉa hè ở các góc giao lộ được bo cong.

## Bản 0.2 đổi gì so với bản 0.1

1. Điều khiển dễ hơn: góc nhìn xoay theo xe, có trợ lái giữ làn, xe chạy chậm hơn một chút và rẽ êm hơn.
2. Thêm 11 ô đỗ xe P. Giao hàng bằng cách đỗ vào ô P.
3. Vạch giữa đường có đoạn đứt và đoạn liền, thêm lỗi "đè vạch liền" (200.000–400.000đ).
4. Màn hình kiểu ứng dụng dẫn đường: đường xanh chỉ lối, bảng chỉ dẫn rẽ, vòng xuyến báo "ra ở lối thứ mấy".

Nếu màn hình dẫn đường bị giật trên máy bạn, bấm **🗺️ Bản đồ** để dùng kiểu nhìn nhẹ hơn và báo lại cho Claude.

## Gợi ý chơi thử để tinh chỉnh

Mỗi lần chơi, bạn nên thử cố tình vi phạm từng lỗi một lần, rồi đi đúng luật vài chuyến, và ghi lại:

1. Lái xe đã dễ hơn chưa? Trợ lái giúp vừa đủ, hay "giành lái" quá tay?
2. Bảng chỉ dẫn và đường xanh có dễ theo không? Có lúc nào chỉ đường kỳ lạ không?
3. Tấp vào ô P có khó không? Ô có đủ rộng không?
4. Câu thoại nào làm bạn bật cười hoặc nhớ luật? Câu nào nghe gượng?
5. Có lúc nào bị phạt mà bạn thấy oan không? Ghi lại chỗ và tình huống.
6. Âm thanh có vừa tai không? Tiếng nào nghe khó chịu hay thiếu? Máy bạn có giọng đọc tiếng Việt không?

Gửi lại những ghi chép này cho Claude để chỉnh ở phiên bản sau.

## Tự sửa câu thoại (không cần biết lập trình)

1. Mở file `js/cau-thoai.js` bằng Notepad (Windows) hoặc TextEdit (Mac). Nên dùng **Visual Studio Code** (miễn phí) cho dễ nhìn.
2. Ngay đầu file là dòng `const LINES = {`. Bên dưới là các nhóm câu thoại: `red` (đèn đỏ), `wrongway` (ngược chiều), `line` (đè vạch liền), `lane` (sai phần đường), `ring` (vòng xuyến), `jam` (kẹt xe), `stopping` (dừng giữa đường), `crash` (va chạm), `praise` (khen)…
3. Sửa hoặc thêm câu, nhớ giữ dấu nháy đơn `'...'` ở hai đầu và dấu phẩy ở cuối mỗi câu. `{x}` sẽ được thay bằng cách gọi bạn chọn (anh, chị, bác…), còn `{X}` là cách gọi đó viết hoa chữ đầu.
4. Lưu file và tải lại trang (F5).

Cuối file `js/cau-thoai.js` có bảng `GIONG`: mỗi dòng là giọng của một kiểu nhân vật. Muốn giọng ai cao hơn thì tăng số `cao`, muốn nói nhanh hơn thì tăng số `nhanh`.

Mức phạt, căn cứ luật và câu hỏi kiểm tra nằm riêng trong file `js/luat.js`.

## Dữ liệu và quyền riêng tư

Game chỉ lưu trên trình duyệt của chính máy bạn: cách gọi bạn chọn, lựa chọn trợ lái và kiểu màn hình, và thống kê cách chơi (số lần mắc mỗi lỗi, tiền, điểm, số đơn). Không có dữ liệu nào được gửi đi. Muốn xóa thì vào 📘 Sổ tay → **Xóa dữ liệu và chơi lại từ đầu**.

## Lưu ý về luật

Mức phạt lấy theo Nghị định 168/2024/NĐ-CP (Điều 7, xe mô tô và xe gắn máy). Nghị định 238/2026/NĐ-CP sửa đổi một số điều của Nghị định 168 từ ngày 15/8/2026. Trước khi đưa game cho nhiều người chơi, cần đối chiếu lại từng mức phạt với văn bản gốc.
