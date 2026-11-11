/* =========================================================
   Traffic Prune · am-thanh.js: ÂM THANH (tạo bằng Web Audio, không cần file âm thanh)
   Dùng các biến của game.js (S, player, npcs, keys...) khi chạy, nên phải nạp trước game.js.
   ========================================================= */
'use strict';

const SND = (function(){
  let ac = null, master = null, fxBus = null, eng = null, noiseBuf = null;
  let hornBudget = 0, yellowCool = 0, lastLight = null, voiceCool = 0;
  const nav = {key: '', stage: 0, t: -99};
  let viVoice = null, voiceChecked = false;
  const can = () => ac && S.sound.on && !S.paused;
  function init(){
    if (ac){ if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      ac = new AC();
      master = ac.createGain(); master.connect(ac.destination);
      fxBus = ac.createGain(); fxBus.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
      // tiếng máy xe của bạn
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      const lfo = ac.createOscillator(), lg = ac.createGain(), am = ac.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 9;
      lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 2;
      am.gain.value = 1; lfo.frequency.value = 20; lg.gain.value = 0.35;
      lfo.connect(lg); lg.connect(am.gain);
      o1.connect(lp); o2.connect(lp); lp.connect(am); am.connect(g); g.connect(fxBus);
      g.gain.value = 0;
      o1.start(); o2.start(); lfo.start();
      eng = {o1, o2, lp, g, lfo};
      applyVolume();
    } catch(e){ ac = null; }
  }
  function applyVolume(){ if (fxBus) fxBus.gain.value = S.sound.on ? S.sound.fx : 0; }
  function tone(freq, dur, type, vol, when, glideTo){
    if (!can()) return;
    const t = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(fxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, hp, when){
    if (!can()) return;
    const t = ac.currentTime + (when || 0), src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || 300;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(fxBus); src.start(t); src.stop(t + dur + 0.05);
  }
  // B. còi CSGT "tuýt" và máy ảnh phạt nguội
  function whistle(){
    if (!can()) return;
    const t = ac.currentTime, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = 2750; lfo.frequency.value = 28; lg.gain.value = 140;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.setValueAtTime(0.16, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    o.connect(g); g.connect(fxBus); o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
  }
  function shutter(){ noise(0.05, 0.35, 2500, 0.15); noise(0.07, 0.3, 1800, 0.23); }
  function thud(){ tone(95, 0.3, 'sine', 0.5, 0, 38); noise(0.18, 0.25, 0, 0); }
  // E. thưởng: nốt nhạc cao dần theo chuỗi chuyến sạch
  function reward(streak){
    const k = Math.pow(2, Math.min(streak || 0, 8) / 12), notes = streak ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25];
    notes.forEach((f, i) => { tone(f*k, 0.35, 'triangle', 0.18, i*0.09); tone(f*k*2, 0.25, 'sine', 0.05, i*0.09); });
  }
  // D. NPC bấm còi khi bị bạn chặn
  function horn(vol, pitch){
    const p = pitch || 1;
    tone(415*p, 0.17, 'square', 0.06*vol); tone(520*p, 0.17, 'square', 0.05*vol);
    if (Math.random() < 0.55){ tone(415*p, 0.15, 'square', 0.06*vol, 0.24); tone(520*p, 0.15, 'square', 0.05*vol, 0.24); }
  }
  // F. giọng đọc chỉ đường
  function findVoice(){
    if (voiceChecked && viVoice) return viVoice;
    const ss = window.speechSynthesis; if (!ss) return null;
    const vs = ss.getVoices(); if (!vs.length) return null;
    voiceChecked = true;
    viVoice = vs.find(v => /^vi/i.test(v.lang)) || null;
    return viVoice;
  }
  function speak(text, force){
    const ss = window.speechSynthesis;
    if (!ss || !S.sound.on || S.sound.voice <= 0 || S.paused) return;
    const v = findVoice(); if (!v) return;
    if (!force && voiceCool > 0) return;
    try {
      ss.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v; u.lang = v.lang; u.rate = 1.05; u.volume = S.sound.voice;
      ss.speak(u); voiceCool = 1.2;
    } catch(e){}
  }
  function voiceStatus(){
    if (!window.speechSynthesis) return 'Trình duyệt này không hỗ trợ giọng đọc.';
    const v = findVoice();
    return v ? 'Giọng đọc: ' + v.name : 'Máy này chưa có giọng đọc tiếng Việt, nên chỉ hiện chữ. (Thường có sẵn trên Chrome hoặc Edge của Windows.)';
  }
  function mstr(m){ return m >= 15 ? m + ' mét nữa, ' : ''; }
  function navSpeech(){
    const r = S.route, t = S.trip; if (!r || !t || S.inBay) return;
    const i = r.instr, m = Math.max(0, Math.round(i.dist / 4 / 5) * 5);
    const key = i.type + '|' + (i.street || '') + '|' + (i.exitNo || '') + '|' + (i.side || '');
    let what = '';
    if (i.type === 'left' || i.type === 'right') what = (i.type === 'left' ? 'rẽ trái' : 'rẽ phải') + ' vào ' + i.street;
    else if (i.type === 'ring') what = 'vào vòng xuyến, ra ở lối thứ ' + i.exitNo + ', ' + i.street;
    else if (i.type === 'ringexit') what = 'ra khỏi vòng xuyến vào ' + i.street;
    else if (i.type === 'uturn') what = 'quay đầu xe khi đường trống';
    else what = 'điểm giao ở bên ' + i.side;
    if (key !== nav.key){
      if (S.now - nav.t < 2.5) return;   // chờ chỉ dẫn ổn định rồi mới đọc
      nav.key = key; nav.stage = 0; nav.t = S.now;
      if (i.type === 'arrive') speak(m > 30 ? 'Đi thẳng ' + m + ' mét, ' + what : 'Tấp vào ô đỗ bên ' + i.side);
      else speak(cap(mstr(m) + what));
      nav.stage = m > 45 ? 1 : 2;
      return;
    }
    if (nav.stage === 1 && m <= 30){
      nav.stage = 2;
      speak(i.type === 'arrive' ? 'Tấp vào ô đỗ bên ' + i.side + ', rồi dừng lại' : cap(what), true);
    }
  }
  function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
  function announceTrip(){
    if (!S.trip) return;
    nav.key = ''; nav.t = S.now - 1.5;
    setTimeout(() => speak('Đơn mới: giao tới ' + S.trip.dest.name, true), 1600);
  }
  function update(dt){
    if (!ac) return;
    const on = S.sound.on && !S.paused;
    const sp = Math.abs(player.v), t = ac.currentTime;
    // A. tiếng máy: cao dần khi tăng ga
    eng.o1.frequency.setTargetAtTime(42 + sp * 0.75 + (keys.up ? 6 : 0), t, 0.08);
    eng.o2.frequency.setTargetAtTime(42 + sp * 0.75 + (keys.up ? 6 : 0), t, 0.08);
    eng.lfo.frequency.setTargetAtTime(16 + sp * 0.18, t, 0.1);
    eng.lp.frequency.setTargetAtTime(380 + sp * 4 + (keys.up ? 220 : 0), t, 0.1);
    eng.g.gain.setTargetAtTime(on && !S.suspended ? 0.035 + sp * 0.00045 + (keys.up ? 0.012 : 0) : 0, t, 0.08);
    if (!on) return;
    voiceCool -= dt; yellowCool -= dt; hornBudget = Math.min(3, hornBudget + dt * 2.5);
    // B. đèn vàng phía trước khi đang lao tới: "tít tít"; đèn chuyển xanh lúc đang chờ: "ting"
    const la = playerLightAhead(130);
    if (la && la.state === 'yellow' && sp > 25 && yellowCool <= 0){ tone(1050, 0.07, 'square', 0.07); tone(1050, 0.07, 'square', 0.07, 0.13); yellowCool = 1.6; }
    const waiting = sp < 3 && la;
    if (waiting && lastLight && lastLight !== 'green' && la.state === 'green'){ tone(1568, 0.5, 'sine', 0.14); tone(2093, 0.6, 'sine', 0.08, 0.08); }
    lastLight = waiting ? la.state : null;
    // D. NPC bị chặn thì bấm còi, càng chờ lâu càng bấm nhiều
    const annoying = S.now < S.faultUntil || S.stopT > 2;
    for (const n of npcs){
      if (n.hidden || n.v > 4 || chainRoot(n) !== player || !annoying){ n.hornT = 0.8 + Math.random(); continue; }
      n.hornT = (n.hornT || 1) - dt;
      if (n.hornT <= 0 && hornBudget >= 1){
        const d = Math.hypot(n.x - player.x, n.y - player.y);
        if (d < 420){ horn(Math.max(0.15, 1 - d/420), n.kind === 'bus' ? 0.62 : 0.9 + (n.id % 5) * 0.06); hornBudget -= 1; }
        n.hornT = Math.max(0.7, 3.2 - n.waitT * 0.45) + Math.random() * 0.8;
      }
    }
    // F. đọc chỉ đường
    navSpeech();
  }
  if (window.speechSynthesis) try { window.speechSynthesis.onvoiceschanged = () => { voiceChecked = false; findVoice(); }; } catch(e){}
  return {init, update, whistle, shutter, thud, reward, applyVolume, voiceStatus, announceTrip, speak,
    stopVoice(){ try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){} }};
})();
