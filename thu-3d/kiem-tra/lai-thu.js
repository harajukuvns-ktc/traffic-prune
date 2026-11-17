/* Lái thử bản thử 3D bằng "bộ não" thật của game (qua window.__TP và window.__T3D):
   1. vượt đèn đỏ ở ngã tư Hoa Sữa × Bánh Mì phải bị ghi lỗi và trừ tiền;
   2. đỗ vào ô P của điểm giao phải giao được hàng, đơn mới vẫn nằm trong khu phố cũ;
   3. đổi qua lại ba góc nhìn và hai loại xe không sinh lỗi;
   4. giữ mát máy: giới hạn khung hình, tự hạ độ nét khi máy chậm, mất ngữ cảnh WebGL rồi có lại vẫn vẽ tiếp.
   Chạy: node lai-thu.js [địa chỉ gốc, ví dụ http://127.0.0.1:8123/thu-3d/]  (không ghi thì mở bằng file://) */
'use strict';
const path = require('path');
const {moTrinhDuyet} = require('./trinh-duyet.js');
(async () => {
  const B = await moTrinhDuyet(); let hong = 0;
  const kiem = (ten, dung, them) => { console.log((dung ? 'ĐẠT   ' : 'HỎNG  ') + ten + (them ? ' · ' + them : '')); if (!dung) hong++; };
  try {
    await B.kho(640, 400, false, 1);
    const GOC = process.argv[2] ? process.argv[2].replace(/\/?$/, '/') + 'index.html' : 'file://' + path.resolve(__dirname, '..', 'index.html');
    await B.mo(GOC + '?q=thap&tu=0&fps=60'); await B.cho(600);
    await B.chay('document.getElementById("go").click(); __TP.putOnHelmet(); 1');
    const tt = await B.chay('__T3D.sanSang()');
    kiem('dựng xong mọi ô bản đồ', tt.soO > 0, tt.soO + ' ô, ' + tt.tamGiacTinh + ' tam giác tĩnh, ảnh khoảng ' + tt.boNhoAnhMB + ' MB, sẵn sàng sau ' + tt.msSanSang + ' ms');
    for (const goc of ['nav', 'bike']){
      // --- 1. vượt đèn đỏ ---
      await B.chay(`__T3D.gocNhin('${goc}'); __T3D.datXe(560, 280, Math.PI, 0); 1`);
      const truoc = await B.chay('JSON.stringify({red: __TP.S.stats.red || 0, tien: __TP.S.money})');
      // chờ tới lúc đèn của mình vừa đỏ (tối đa 25 giây)
      await B.chay(`new Promise(xong => { const t0 = Date.now(), f = () => { const la = __TP.playerLightAhead(400); if ((la && la.state === 'red') || Date.now() - t0 > 25000) xong(); else setTimeout(f, 100); }; f(); })`);
      const den = await B.chay('(__TP.playerLightAhead(400) || {}).state');
      // giữ ga tới khi xe qua hẳn ngã tư (Chrome vẽ bằng CPU chạy chậm nên chờ theo vị trí xe, tối đa 15 giây)
      await B.chay(`new Promise(xong => { __TP.keys.up = true; const t0 = Date.now(), f = () => { if (__TP.player.x < 420 || Date.now() - t0 > 15000){ __TP.keys.up = false; xong(); } else setTimeout(f, 50); }; f(); })`);
      const sau = await B.chay('JSON.stringify({red: __TP.S.stats.red || 0, tien: __TP.S.money, x: Math.round(__TP.player.x)})');
      const a = JSON.parse(truoc), b = JSON.parse(sau);
      kiem(`[${goc}] vượt đèn đỏ bị ghi lỗi và phạt tiền`, den === 'red' && b.red === a.red + 1 && b.tien < a.tien, `đèn ${den}, lỗi ${a.red}→${b.red}, tiền ${a.tien}→${b.tien}, xe tới x=${b.x}`);
      // --- 2. giao hàng ở ô P ---
      const gh = await B.chay(`(async () => { const S = __TP.S, b = S.trip.dest.bay, ten = S.trip.dest.name, chuyen = S.trips;
        // đặt xe ở đầu ô đỗ, đúng chiều đỗ, đang chạy chậm: xe trôi vào giữa ô rồi dừng
        __T3D.datXe(b.cx - b.dir.x * 20, b.cy - b.dir.y * 20, Math.atan2(b.dir.y, b.dir.x), 30);
        await new Promise(r => setTimeout(r, 2500));
        return JSON.stringify({ten, chuyen, sau: S.trips, moi: S.trip.dest.name, trongKhu: __T3D.diemKhu.includes(S.trip.dest), inBay: S.inBay}); })()`);
      const g = JSON.parse(gh);
      kiem(`[${goc}] đỗ vào ô P thì giao được hàng, đơn mới ở trong khu cũ`, g.sau === g.chuyen + 1 && g.trongKhu, `giao "${g.ten}", số chuyến ${g.chuyen}→${g.sau}, đơn mới "${g.moi}"`);
    }
    // --- 3. mọi đơn mới đều trong khu cũ (nhận 60 đơn liên tiếp) ---
    const ngoai = await B.chay('(() => { let n = 0; for (let i = 0; i < 60; i++){ __TP.S.trip = null; newTrip(); if (!__T3D.diemKhu.includes(__TP.S.trip.dest)) n++; } return n + "/" + __T3D.diemKhu.length + "/" + __TP.DESTS.length; })()');
    kiem('60 đơn liên tiếp đều ở trong khu cũ, danh sách điểm giao của game còn nguyên', ngoai.startsWith('0/') && ngoai.endsWith('/21'), 'số đơn ngoài khu / số điểm trong khu / tổng số điểm = ' + ngoai);
    // --- 4. đổi góc nhìn, đổi xe ---
    for (const xe of ['car', 'bike']) for (const goc of ['nav', 'bike', 'map', 'nav']){ await B.chay(`__T3D.doiXe('${xe}'); __T3D.gocNhin('${goc}'); 1`); await B.cho(250); }
    await B.chay('document.getElementById("viewBtn").click(); 1'); await B.cho(250);
    kiem('bấm nút đổi góc nhìn chuyển từ nav sang bike', (await B.chay('__TP.S.view')) === 'bike');
    kiem('bản thử lưu vào khoá riêng, không ghi vào khoá của bản chơi chính', await B.chay('(() => { const P = Object.getPrototypeOf(localStorage); try { return Object.keys(localStorage).includes("trafficPrune.thu3d") && !Object.keys(localStorage).includes("trafficPrune.v1"); } catch (e){ return false; } })()'));
    // --- 5. mũ bảo hiểm: người chơi đầu trần khi chưa đội mũ, có mũ khi đã đội (theo S.helmet của game) ---
    await B.chay(`__T3D.doiXe('bike'); __T3D.gocNhin('nav'); __TP.S.helmet = false; 1`); await B.cho(300);
    const mu0 = await B.chay('JSON.stringify([__T3D.TP3.xe.xeToi.mu.visible, __T3D.TP3.xe.xeToi.toc.visible])');
    await B.chay('__TP.S.helmet = true; 1'); await B.cho(300);
    const mu1 = await B.chay('JSON.stringify([__T3D.TP3.xe.xeToi.mu.visible, __T3D.TP3.xe.xeToi.toc.visible])');
    kiem('xe máy người chơi: chưa đội mũ thì đầu trần, đội rồi thì có mũ', mu0 === '[false,true]' && mu1 === '[true,false]', mu0 + ' → ' + mu1);
    // --- 6. đèn phanh và xi-nhan của xe người chơi ---
    await B.chay('__TP.player.v = 60; __TP.keys.brake = true; __TP.setSignal(1); 1'); await B.cho(300);
    const ph = await B.chay('__T3D.TP3.xe.xeToi.phanh.visible'); await B.chay('__TP.keys.brake = false; 1');
    const nh = await B.chay('new Promise(x => { let thay = 0, n = 0; const f = () => { if (__T3D.TP3.xe.xeToi.nhay[1].visible) thay++; if (++n < 40) setTimeout(f, 50); else x(thay); }; f(); })');
    await B.chay('__TP.setSignal(1); __TP.player.v = 0; 1');
    kiem('đèn phanh sáng khi bóp phanh, xi-nhan phải nháy khi bật', ph === true && nh > 3 && nh < 37, 'phanh ' + ph + ', xi-nhan sáng ' + nh + '/40 lần xem');
    // --- 7. mất ngữ cảnh WebGL rồi có lại ---
    const mat = await B.chay('__T3D.thuMatNguCanh(600)'); await B.cho(500);
    const sauMat = await B.chay('__T3D.do(5)');
    kiem('mất ngữ cảnh WebGL rồi có lại: dựng lại các ô và vẽ tiếp', mat.mat >= 1 && !mat.dangMat && sauMat.lenhVe > 10 && sauMat.tamGiac > 1000, 'mất ' + mat.mat + ' lần, sau đó ' + sauMat.lenhVe + ' lệnh vẽ, ' + sauMat.tamGiac + ' tam giác');
    // --- 8. giới hạn khung hình và tự hạ độ nét ---
    await B.kho(360, 300, false, 1);
    await B.mo(GOC + '?q=thap&tu=0&fps=30'); await B.cho(500); await B.chay('document.getElementById("go").click(); 1'); await B.chay('__T3D.sanSang()'); await B.cho(500);
    const g30 = await B.chay('__T3D.do(40)');
    kiem('giới hạn 30 khung/giây (?fps=30)', g30.fps > 24 && g30.fps < 33, g30.fps + ' khung/giây');
    await B.kho(1280, 800, false, 1);
    await B.mo(GOC + '?q=cao&fps=60'); await B.cho(500); await B.chay('document.getElementById("go").click(); 1'); await B.chay('__T3D.sanSang()');
    const nac0 = await B.chay('__T3D.nac()'); await B.cho(9000); const nac1 = await B.chay('__T3D.nac()');
    kiem('máy chậm (Chrome vẽ bằng CPU ở mức cao) thì tự hạ độ nét', nac1 > nac0, 'nấc ' + nac0 + ' → ' + nac1 + ', khung vẽ ' + (await B.chay('__T3D.thongTin.diemAnh')));
    kiem('không có lỗi JS trong trang', B.loi.length === 0, B.loi.join(' | '));
    console.log(hong ? hong + ' mục HỎNG' : 'Tất cả đều đạt');
  } finally { await B.dong(); }
  process.exit(hong ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
