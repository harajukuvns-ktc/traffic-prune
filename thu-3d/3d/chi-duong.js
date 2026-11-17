/* =========================================================
   Traffic Prune · thu-3d/3d/chi-duong.js: VẠCH CHỈ ĐƯỜNG VÀ Ô ĐÍCH
   Dữ liệu của game: S.route.pts (như drawRoute của bản 2D) và S.trip.dest.bay (như drawDest).
   ========================================================= */
'use strict';
(function(){
const TP3 = window.TP3; if (!TP3 || TP3.hong) return;
const T = TP3.T, CD = TP3.chiDuong = {};
(TP3.dong = TP3.dong || []).push({
  tao(scene){
    // các mũi tên dẹt màu xanh dán trên mặt đường
    { const g = new T.BufferGeometry(), y = 0.3;
      g.setAttribute('position', new T.BufferAttribute(new Float32Array([3, y, 0, -0.4, y, 2.9, -2.6, y, 2.9, 0.8, y, 0, -2.6, y, -2.9, -0.4, y, -2.9]), 3)); g.setIndex([0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4]);
      CD.muiTen = new T.InstancedMesh(g, new T.MeshBasicMaterial({color: 0x2f7bff, transparent: true, opacity: 0.82, depthWrite: false, side: T.DoubleSide, toneMapped: false}), 64);
      CD.muiTen.instanceMatrix.setUsage(T.DynamicDrawUsage); CD.muiTen.frustumCulled = false; CD.muiTen.matrixAutoUpdate = false; CD.muiTen.count = 0; CD.muiTen.renderOrder = 2; scene.add(CD.muiTen); }
    // ô đích: tấm xanh nhấp nháy phủ lên ô đỗ và một mốc hình thoi lơ lửng phía trên cho dễ thấy từ xa
    { const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(new Float32Array([-0.5, 0.24, -0.5, 0.5, 0.24, -0.5, 0.5, 0.24, 0.5, -0.5, 0.24, 0.5]), 3)); g.setIndex([0, 2, 1, 0, 3, 2]);
      CD.oDich = new T.Mesh(g, new T.MeshBasicMaterial({color: 0x2fd884, transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide, toneMapped: false}));
      CD.oDich.frustumCulled = false; CD.oDich.renderOrder = 2; scene.add(CD.oDich);
      const G = new TP3.Gom(); G.tru(0, 0, 0, 0.01, 3.4, 5, 4, '#2fc878'); G.tru(0, 5, 0, 3.4, 0, 2.6, 4, '#49e294');
      CD.moc = new T.Mesh(G.hinh(), new T.MeshLambertMaterial({vertexColors: true, fog: false, emissive: 0x1f8f58})); CD.moc.frustumCulled = false; scene.add(CD.moc); }
  },
  capNhat(){
    const r = S.route, arr = CD.muiTen.instanceMatrix.array; let k = 0;
    if (r && r.pts.length > 1){
      const pts = [{x: player.x, y: player.y}].concat(r.pts.slice(1)), nho = S.view === 'bike' ? 0.62 : 1;   // nhìn từ sau tay lái mũi tên ở sát mắt nên vẽ nhỏ lại, bắt đầu xa hơn
      let acc = S.view === 'bike' ? 24 : 14, tong = 0;
      for (let i = 1; i < pts.length && k < 64 && tong < 760; i++){
        const a = pts[i-1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 0.01) continue;
        const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, c = ux * nho, s = uy * nho;
        while (acc <= L && k < 64){ const o = k++ * 16;
          arr[o] = c; arr[o+1] = 0; arr[o+2] = s; arr[o+3] = 0; arr[o+4] = 0; arr[o+5] = 1; arr[o+6] = 0; arr[o+7] = 0; arr[o+8] = -s; arr[o+9] = 0; arr[o+10] = c; arr[o+11] = 0;
          arr[o+12] = a.x + ux*acc; arr[o+13] = 0; arr[o+14] = a.y + uy*acc; arr[o+15] = 1; acc += 13; }
        acc -= L; tong += L;
      }
    }
    CD.muiTen.count = k; CD.muiTen.instanceMatrix.needsUpdate = true;
    const t = S.trip; CD.oDich.visible = CD.moc.visible = !!t;
    if (t){ const b = t.dest.bay, n = 0.5 + 0.5 * Math.sin(S.now * 5), a = Math.atan2(b.dir.y, b.dir.x);
      CD.oDich.position.set(b.cx, 0, b.cy); CD.oDich.rotation.y = -a; CD.oDich.scale.set(b.L, 1, b.D); CD.oDich.material.opacity = 0.3 + 0.35 * n;
      CD.moc.position.set(b.cx + b.n.x*6, 22 + Math.sin(S.now * 2.4) * 1.6, b.cy + b.n.y*6); CD.moc.rotation.y = S.now * 1.5; }
  }
});
})();
