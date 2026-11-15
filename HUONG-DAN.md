# Traffic Prune: hướng dẫn cài đặt và chạy thử (bản 0.12)

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

## Cách chơi (bản 0.12)

- **Màn hình dẫn đường:** bản đồ xoay theo hướng xe, giống ứng dụng dẫn đường trên điện thoại. Vạch chấm xanh nhạt có mũi tên nhỏ là lối đi được gợi ý; vạch mảnh nên không che làn đường. Bảng xanh lá phía trên báo chỗ rẽ sắp tới, ví dụ "140 m · Rẽ phải vào Đường Cầu Vồng". Nút đầu tiên ở góc phải đổi kiểu nhìn, mỗi lần bấm chuyển sang kiểu kế tiếp: dẫn đường → **🏍️ sau tay lái** → **🗺️ bản đồ** từ trên xuống → quay lại dẫn đường. Game nhớ kiểu bạn chọn.
- **Góc nhìn sau tay lái:** máy quay hạ thấp, sát ngay sau xe. Bạn không thấy xe mình nữa mà thấy ghi đông và đồng hồ tốc độ ở mép dưới màn hình; xe của bạn nằm ngay dưới đồng hồ. Ô P và xe ở ngay bên cạnh sẽ khó thấy hơn, nên hãy nhìn bảng chỉ dẫn và bản đồ nhỏ.
- **Lái xe:** ↑ hoặc W để ga, **Space để phanh** (chỉ phanh, dừng hẳn thì đứng yên), ↓ hoặc S cũng phanh nhưng giữ tiếp sau khi dừng thì xe lùi chậm, ← → hoặc A D để rẽ trái, rẽ phải. Vì bản đồ xoay theo xe nên ← luôn là rẽ sang trái của bạn. Trên điện thoại: bên trái có hai nút rẽ **◀ ▶ to nằm cạnh nhau** (đặt ngón vào là giữ; trượt ngón sang nút kia hay lệch ra ngoài mép vẫn tính là đang giữ, nhấc ngón lên mới nhả) và nút **▼** nhỏ hơn bên dưới (phanh, dừng hẳn rồi giữ tiếp thì lùi chậm); bên phải có PHANH (chỉ phanh, không lùi) và GA.
- **Cua chậm và quay đầu:** giữ nút rẽ mà không bấm GA thì xe tự chạy chậm khoảng 11 km/h, nên quay đầu chỉ cần giữ một nút rẽ. Đi chậm thì xe quay gắt hơn (khoảng 2,5 m, như xe máy thật). Trợ lái giữ làn chờ 1 giây sau khi bạn nhả nút rẽ mới nắn xe lại, và không nắn trong vài giây đầu sau khi bạn bật xi-nhan.
- **Trợ lái giữ làn:** khi bạn thả phím rẽ ra, xe tự chạy thẳng theo làn bên phải. Bạn chỉ cần bấm rẽ ở ngã tư, khi vào ô đỗ hoặc khi muốn vượt. Tắt được ở màn hình mở đầu (nút ❔).
- **Giao hàng:** tới nơi thì tấp vào **ô đỗ xe có biển P** của điểm giao (đang nhấp nháy xanh) và dừng hẳn lại. Dừng ngoài lòng đường không tính.
- **Ô đỗ xe P:** có 11 ô, kẻ vạch trắng ngay trên lòng đường, sát vỉa hè bên phải theo chiều xe chạy, giống ngoài đời. Muốn đỗ vào ô ở lề bên kia thì phải quay đầu để đỗ đúng chiều; chỉ đường sẽ dẫn bạn như vậy. Đỗ trong ô thì không cản ai và không ai đụng bạn. Dừng lâu giữa đường làm người khác phải chờ thì sẽ bị nhắc.
- **Vạch giữa đường:** vạch vàng **đứt** thì được cắt qua để rẽ, vượt hoặc vào làn bên kia để quay đầu, xong phải về làn ngay. Vạch vàng **liền** (gần ngã tư và vòng xuyến) thì không được đè lên.
- **Đèn tín hiệu:** khi tiến vào ngã tư, bạn sẽ gặp lần lượt **vạch dừng** (màu trắng), **vạch người đi bộ**, rồi **cột đèn** ở góc giao lộ. Đèn đỏ thì dừng trước vạch dừng; đầu xe vượt qua vạch dừng lúc đèn đỏ là bị phạt. Có dòng nhắc "🔴 Đèn đỏ phía trước" khi bạn tới gần.
- **Thưởng:** chuyến đi không vi phạm được thưởng thêm, chuỗi chuyến sạch càng dài thì thưởng càng cao. Cứ 5 chuyến sạch liên tiếp thì hồi 1 điểm GPLX.
- **Biển chỉ dẫn:** biển xanh chữ trắng đặt bên phải đường, cách ngã tư khoảng 37 m, cho biết rẽ trái, đi thẳng, rẽ phải sẽ vào đường nào. Nhìn biển trước khi tới ngã tư để chọn làn và bật xi-nhan sớm.
- **Xi-nhan:** bấm **Q** (xi-nhan trái) hoặc **E** (xi-nhan phải) **trước khi rẽ ở ngã tư hoặc quay đầu**. Trên điện thoại là hai nút nhỏ "◀ xi-nhan" và "xi-nhan ▶" ngay phía trên nút chữ thập. Đèn nháy trên thanh thông tin và trên xe, kèm tiếng tích-tắc. Xi-nhan **không tự tắt**: rẽ xong bấm lại đúng bên để tắt (quên tắt lâu thì người trong phố sẽ nhắc, không bị phạt). Khi sắp tới chỗ rẽ mà chưa bật, game có dòng nhắc 💡. Rẽ hoặc quay đầu mà không bật xi-nhan đúng bên (hoặc bật quá trễ, sau khi đã bắt đầu rẽ) là bị phạt. Cắt vạch đứt để vượt xe thì game không bắt lỗi này.
- **Phố Chợ là phố đi bộ:** hai đầu phố có biển **cấm xe máy** (tròn, viền đỏ, gạch chéo, hình người lái xe máy) và biển **cấm ô tô**, kèm bảng "PHỐ ĐI BỘ". Xe máy chạy vào là bị phạt. Chỉ đường sẽ không dẫn bạn qua đó. Chợ Hoa Sữa giờ đỗ xe ở bãi ngoài cổng chợ, trên đường Me Chua.
- **Tốc độ:** xe giờ chạy tối đa **55 km/h**. Đường thường có biển tròn viền đỏ ghi **40** (tốc độ tối đa cho phép), đặt bên phải ngay sau mỗi ngã tư. **Cả khối Phố Bánh Mì giữa hai ngã tư** (chỗ có trường mầm non Sơn Ca) giới hạn **30**, có thêm biển tam giác vàng **"Trẻ em"**. Ô tốc độ ở góc trên ghi giới hạn hiện tại ("tối đa 40"): **vàng** là đang hơi quá, **đỏ** là quá từ 5 km/h trở lên và có dòng nhắc 🚨 (ở góc nhìn sau tay lái, số trên đồng hồ cũng đổi màu). Chạy quá dưới 5 km/h thì không sao.
- **Camera phạt nguội:** giữa hai ngã tư bạn chỉ bị nhắc nhở, không bị phạt. Nhưng **ba ngã tư có đèn đều có camera trên cột đèn**: đúng lúc xe qua vạch dừng (đèn xanh hay đèn đỏ đều tính), nếu tốc độ vượt giới hạn của đoạn đường vừa đi qua từ 5 km/h thì bị phạt theo mức vượt lúc đó: 5 đến dưới 10 km/h phạt 400–600 nghìn; 10 đến 20 km/h phạt 800 nghìn–1 triệu; trên 20 km/h (chỉ gặp được ở khối trường học) phạt 6–8 triệu và trừ 4 điểm GPLX. Có tiếng máy ảnh "tách" và loé sáng. Vậy nhả ga **trước** khi tới vạch dừng. Phố Chợ và vòng xuyến không có camera.
- **Chọn xe:** ngay đầu màn hình mở đầu có ô **Bạn lái**: 🏍️ xe máy (bằng A1) hoặc 🚗 ô tô (bằng B). Muốn đổi thì bấm nút ❔ rồi chọn lại. Tiền dùng chung, nhưng **mỗi xe một bằng lái riêng, mỗi bằng 12 điểm**: ô ở góc trên ghi "GPLX A1" hoặc "GPLX B". Hết điểm bằng nào thì chỉ không lái được xe đó; xe kia vẫn lái bình thường.
- **Lái ô tô:** xe to, tăng tốc chậm hơn, tối đa 70 km/h, quay vòng rộng. **Rẽ ở ngã tư thì giảm còn khoảng 10–15 km/h**, không thì xe văng sang làn ngược chiều. Ô tô khó quay đầu trên đường hẹp, nên chỉ đường sẽ dẫn bạn **đi vòng** (vòng xuyến hoặc vòng quanh khối phố); muốn tự quay đầu thì lùi, tiến vài lần (giữ ↓ hoặc nút ▼ sau khi dừng để lùi). Ô tô thì **thắt dây an toàn** (nút 💺, phím H) thay cho đội mũ. Phố đi bộ có biển cấm ô tô. Mức phạt ô tô **cao hơn xe máy nhiều**: vượt đèn đỏ 18–20 triệu, cầm điện thoại 4–6 triệu, quá tốc độ có 4 bậc (vượt từ 10 km/h đã bị trừ điểm). Ô tô đỗ ngược chiều trong ô P là **bị phạt** (xe máy chỉ bị nhắc). 📘 Sổ tay và bài kiểm tra hiện luật của xe đang lái.
- **Mũ bảo hiểm:** mỗi buổi chơi xe bắt đầu **đầu trần** (ô đỏ "🪖 Chưa đội mũ" ở góc trên). Bấm nút vàng **🪖 Đội mũ** (phím **H**) ở góc phải, dưới bản đồ nhỏ; đội một lần là dùng cho cả buổi chơi. Có hai **chốt CSGT** cố định (chòi xanh, chú CSGT áo vàng, cọc tiêu cam và vạch đứt cam ngang đường): một trên Đường Hoa Sữa giữa Phố Chợ và Đường Cầu Vồng, một trên Đường Cầu Vồng giữa hai ngã tư. Đầu trần chạy qua chốt là bị thổi còi, giữ xe khoảng 2 giây và phạt 500.000đ (không trừ điểm). Đã đội mũ thì chú CSGT cho đi. Đầu trần chạy lâu thì người đi đường cũng nhắc.
- **Khách gọi điện:** cứ 2–3 chuyến thì điện thoại đổ chuông (ô "📞 Khách đang gọi…", nút xanh nhấp nháy **📞 Nghe máy**, hoặc phím **C**). Có 12 giây để nghe; không nghe thì khách gọi lại sau, không mất gì. **Tấp vào ô P rồi mới nghe**: hết cuộc gọi khách vui và boa 20.000đ. **Vừa chạy vừa nghe (hoặc đứng giữa đường, kể cả dừng đèn đỏ) là vừa lái vừa cầm điện thoại**: xe lái khó hơn, trợ lái tắt, và nếu qua chốt CSGT hoặc qua vạch dừng ngã tư có camera lúc đó thì bị phạt 900.000đ và trừ 4 điểm GPLX (mỗi cuộc gọi phạt một lần). Điện thoại gắn trên xe để xem bản đồ thì không bị coi là vi phạm.
- **Phạt:** vượt đèn đỏ, chạy quá tốc độ, không đội mũ bảo hiểm khi qua chốt, cầm điện thoại khi lái, đi vào phố đi bộ có biển cấm xe máy, rẽ hoặc quay đầu không xi-nhan, đè vạch liền, chạy lâu bên phần đường ngược chiều, không nhường đường ở vòng xuyến. Gây va chạm khi đang vi phạm thì bị phạt nặng hơn nữa.
- **Nhắc nhở (không phạt tiền):** đỗ trong ô P mà đầu xe quay ngược chiều đi. Luật yêu cầu đỗ sát lề bên phải theo chiều đi, nhưng với xe máy không có mức phạt riêng, nên game chỉ nhắc. Chuyến đó không được tính là chuyến sạch.
- **Đền:** ai bị bạn làm kẹt xe hoặc đụng phải thì được đền tiền từ ví của bạn. Người bị ảnh hưởng hiện mặt 😤.
- **Hết điểm GPLX:** bị trừ hết 12 điểm thì xe dừng ngay, không lái tiếp được, đúng như luật. Muốn lái lại thì làm bài kiểm tra 5 câu về luật, đúng từ 4 câu là được phục hồi đủ 12 điểm. Nếu không muốn thi, bạn có thể chọn chơi lại từ đầu.
- **Âm thanh (nút 🔊):** tiếng máy xe theo loại xe bạn chọn trong bảng 🔊: **xe số** (có 4 số, máy kéo lên rồi tụt nhẹ mỗi lần lên số; ô tốc độ hiện bạn đang ở số mấy) hoặc **xe tay ga** (tiếng cao, đều, kèm tiếng rít nhẹ của dây curoa); tiếng "tít tít" khi bạn lao tới đèn vàng; tiếng "ting" khi đèn chuyển xanh lúc bạn đang chờ; tiếng còi CSGT, và tiếng máy ảnh khi vượt đèn đỏ; NPC bị bạn chặn đường sẽ bấm còi, càng chờ lâu càng bấm nhiều; tiếng nhạc thưởng khi giao hàng, chuỗi chuyến sạch càng dài thì nốt càng cao. Bảng 🔊 có nút bật tắt, chọn loại xe, ba thanh chỉnh âm lượng (tiếng động, giọng chỉ đường, giọng NPC) và nút **▶ Nghe thử**.
- **Giọng đọc chỉ đường:** game đọc chỉ dẫn bằng giọng tiếng Việt có sẵn trong trình duyệt, ví dụ "100 mét nữa, rẽ phải vào Đường Cầu Vồng". Nếu bảng 🔊 báo máy chưa có giọng tiếng Việt thì game chỉ hiện chữ. Trên Windows có thể thêm giọng tiếng Việt: Settings → Time & language → Speech → Add voices → Tiếng Việt, rồi mở lại trình duyệt.
- **Giọng NPC:** khi người trong phố nói, chữ hiện dần trong khung lời thoại kèm tiếng "líu lo" kiểu game. Mỗi tiếng nói là một tiếng bíp, uốn lên xuống theo dấu thanh (sắc đi lên, huyền đi xuống…). Mỗi kiểu nhân vật một giọng: bác xe ôm trầm, cô bán xôi cao, bác tài xe buýt ồm ồm. Khi giọng chỉ đường đang đọc thì NPC chỉ hiện chữ.
- **📘 Sổ tay:** xem lại luật, mức phạt, căn cứ pháp lý, và bạn đã mắc mỗi lỗi bao nhiêu lần.

## Bản 0.12 đổi gì so với bản 0.11

1. Có thêm **ô tô**: chọn ở đầu màn hình mở đầu, đổi lúc nào cũng được ở nút ❔.
2. Bằng lái riêng cho mỗi xe (A1 cho xe máy, B cho ô tô), mỗi bằng 12 điểm.
3. Luật ô tô theo Điều 6 Nghị định 168/2024: mức phạt riêng, dây an toàn thay mũ bảo hiểm, đỗ ngược chiều bị phạt.
4. Chỉ đường dẫn ô tô đi vòng thay vì quay đầu tại chỗ.
5. Sổ tay và bài kiểm tra phục hồi điểm theo loại xe đang lái (thêm 5 câu hỏi cho ô tô).

**Chưa có, sẽ làm ở bản 0.12.1:** vô lăng và đồng hồ ô tô ở góc nhìn sau vô lăng (bây giờ vẫn thấy chiếc ô tô từ phía sau), tiếng máy ô tô riêng, nút số lùi riêng trên điện thoại.

**Nhờ bạn chơi thử:** ô tô có dễ lái trên điện thoại không, nhất là khi rẽ ở ngã tư? Xe có to quá so với đường không? Bạn muốn chỉ đường dẫn đi vòng như bây giờ hay bảo quay đầu tại chỗ? Mức phạt ô tô rất cao so với tiền giao hàng, chơi có thấy nặng quá không?

## Bản 0.11 đổi gì so với bản 0.10.3

1. Mũ bảo hiểm: nút 🪖 Đội mũ (phím H), đội một lần cho cả buổi chơi; đầu trần qua chốt CSGT bị phạt 500.000đ.
2. Hai chốt CSGT cố định (Đường Hoa Sữa và Đường Cầu Vồng).
3. Khách gọi điện: nút 📞 Nghe máy (phím C); đỗ trong ô P rồi nghe thì được boa, vừa lái vừa nghe bị phạt 900.000đ và trừ 4 điểm tại chốt hoặc camera.
4. Hai câu hỏi mới trong bài kiểm tra phục hồi điểm; điện thoại cầm ngang gọn hơn.

**Nhờ bạn chơi thử:** hai nút 🪖 và 📞 ở góc phải có dễ bấm trên điện thoại không? Chốt CSGT có dễ thấy từ xa không? Bị giữ xe 2 giây có bực quá không? Cứ 2–3 chuyến có một cuộc gọi như vậy thì nhiều hay ít?

*Lưu ý pháp lý:* số khoản/điểm của hai lỗi mới được đối chiếu qua nhiều nguồn tổng hợp, chưa đối chiếu toàn văn Nghị định 168/2024 (ghi ở mục 8 của `docs/THIET-KE.md`).

## Bản 0.10.3 đổi gì so với bản 0.10.2

1. Quay đầu dễ hơn: giữ nút rẽ là xe tự chạy chậm và quay vòng gọn; trợ lái không giành lái khi bạn vừa nhả nút rẽ hay đang bật xi-nhan.
2. Nút trên điện thoại: bỏ nút ▲, hai nút rẽ ◀ ▶ to hơn nằm cạnh nhau, trượt ngón vẫn giữ nút.

**Nhờ bạn chơi thử:** quay đầu ở đoạn vạch đứt trên điện thoại giờ đã dễ chưa? Hai nút ◀ ▶ có đủ to, ngón cái có với tới thoải mái không?

## Bản 0.10.2 đổi gì so với bản 0.10.1

1. Hết phạt giữa đường. Quá tốc độ giữa hai ngã tư chỉ bị nhắc nhở, không mất chuyến sạch.
2. Camera phạt nguội trên cột đèn ba ngã tư có đèn: bị phạt theo tốc độ lúc xe qua vạch dừng.
3. Cả khối Phố Bánh Mì giữa hai ngã tư giới hạn 30 km/h, biển 30 và biển "Trẻ em" đặt ngay sau mỗi ngã tư.

## Bản 0.10 đổi gì so với bản 0.9.1

1. Xe chạy nhanh hơn, tối đa 55 km/h (trước đây khoảng 38 km/h). Quá 38 km/h thì tăng tốc chậm lại một chút.
2. Biển giới hạn tốc độ 40 km/h trên đường thường; 30 km/h ở khối trường mầm non kèm biển "Trẻ em".
3. Chạy quá tốc độ là lỗi mới với ba bậc phạt (xem mục **Tốc độ** ở trên). Ô tốc độ và đồng hồ đổi màu khi quá, có dòng nhắc.
4. Bài kiểm tra phục hồi điểm có thêm 3 câu hỏi (biển tốc độ, biển "Trẻ em", mức phạt vượt tốc độ).
5. Tiếng máy xe và đồng hồ sau tay lái chỉnh theo tốc độ mới.

## Bản 0.9.1 đổi gì so với bản 0.9

1. Vòng tròn quanh xe nhỏ lại; gặp người đi bộ thì xe chỉ chậm lại một lần rồi lách tránh được.
2. Vạch vàng giữa đường dừng ở vạch dừng, không chạy vào vạch người đi bộ ở ngã tư.
3. Nhắc lại: **Q** là xi-nhan trái, **E** là xi-nhan phải trên bàn phím.

## Bản 0.9 đổi gì so với bản 0.8

1. **Biển chỉ dẫn hướng đi** (nền xanh, chữ trắng) trước các ngã tư.
2. **Phố Chợ thành phố đi bộ:** lát gạch, có người dạo chợ, hai đầu cắm biển cấm xe máy và cấm ô tô. Xe máy vào là bị phạt 2–3 triệu và trừ 2 điểm GPLX (điểm b khoản 6 Điều 7 NĐ 168/2024). Vì vậy game tạm không còn phố một chiều; phố một chiều sẽ có lại khi mở rộng bản đồ.
3. **Xi-nhan:** phím Q, E; hai nút nhỏ trên chữ thập ở điện thoại; đèn nháy và tiếng tích-tắc; phạt 600–800 nghìn khi rẽ ở ngã tư hoặc quay đầu không xi-nhan (điểm a khoản 3 Điều 7, không trừ điểm).
4. Bài kiểm tra có thêm 2 câu hỏi: biển cấm xe máy và xi-nhan khi rẽ.
5. Chợ Hoa Sữa đổi chỗ giao hàng ra bãi đỗ xe cổng chợ (đường Me Chua).

**Nhờ bạn chơi thử:** hai nút xi-nhan nhỏ trên điện thoại có dễ bấm không? Biển xanh có đủ to để đọc khi đang chạy không? Có lần nào bạn bị phạt xi-nhan mà thấy oan, hoặc rẽ không bật mà không bị phạt không?

## Bản 0.8 đổi gì so với bản 0.7

1. Thêm góc nhìn "sau tay lái" có ghi đông và đồng hồ tốc độ. Bấm nút đầu tiên ở góc phải (🏍️) để chuyển.

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

Nếu màn hình dẫn đường hoặc sau tay lái bị giật trên máy bạn, bấm nút đổi kiểu nhìn tới khi về **bản đồ** để dùng kiểu nhìn nhẹ hơn và báo lại cho Claude.

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
