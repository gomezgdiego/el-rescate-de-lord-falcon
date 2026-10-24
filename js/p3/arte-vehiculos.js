// vehiculos.js — PROTOTIPO Parte 3: los vehículos de Mikey y Peter.
// Como en la Parte 2, son robots del ejército de Robovill que los héroes HACKEAN:
// al hackearlos toman los colores de su piloto, con un toque VERDE de "hackeado"
// (ojo-luz verde, cuernos verdes y sonrisa) y el piloto se ve en la cabina.
//   ROBOT-MOTO de Mikey (hermano del robot transformable del Director):
//     A "Rayo"   → robot ágil con la rueda trasera a la espalda; moto deportiva baja.
//     B "Bestia" → robot fortachón que patina sobre sus ruedas-pie; moto gorda
//                  de ruedas huecas que brillan.
//     En los dos, los 3 lanzadores de Mikey (francotirador, pistola y metralleta)
//     van en el MANILLAR (en modo robot, en el antebrazo / el hombro).
//   SUBMARINO-NAVE de Peter (hermano del mecha-halcón de Falcon):
//     A "Cápsula-escudo" → submarino redondo con la PROA = el escudo de Peter;
//                          en vuelo despliega alas y la hélice se vuelve turbo.
//     B "Delfín-cohete"  → casco de delfín; la HÉLICE es el escudo de Peter y en
//                          vuelo las aletas se hacen alas y el escudo echa fuego.
//   Colores = variante A de cada héroe (prototipos-parte3/heroes.js):
//     Mikey A = bata blanca + naranja (lanzadores rosa, amarillo y violeta)
//     Peter A = amarillo + negro + verde, con la "rueda" de Juanjo (radios verdes y negros).
//     Ninguno se confunde con el Director (azul/cian), con Falcon (verde/marrón)
//     ni con el ejército (acero + rojo). En la cabina se dibuja al héroe real
//     (P2.fn.mikey / P2.fn.peter); si no existe, un busto de repuesto.
// Exporta:
//   P2.fn.robotMoto(c, x, piesY, {variant:'A'|'B', modo:'robot'|'moto', enemy, scale, facing, boost})
//   P2.fn.submarinoNave(c, x, y, {variant:'A'|'B', modo:'submarino'|'nave', enemy, scale, facing, estela})
//   P2.fn.escudoVehiculo(c, x, y, {scale, enemy, rot})      (centro; el escudo-proa/hélice)
(function () {
  'use strict';
  var O = P2.OUTLINE;
  var E = P2.PAL.enemy, H = P2.PAL.hacked;
  var SKIN = '#f2c49b';

  // Colores de los héroes nuevos (variante A provisional)
  var MK = { COAT: '#f8fafc', COAT2: '#cbd5e1', ORANGE: '#f97316', ORANGE_L: '#fdba74', HAIR: '#1f2433', PANTS: '#334155' };
  var PT = { SUIT: '#facc15', SUIT_D: '#eab308', BLACK: '#1f2937', GREEN: '#22c55e', GREEN_D: '#15803d' };

  // ---------- Paletas: enemigo (acero + rojo) o hackeado (colores del piloto + verde) ----------
  function palMoto(enemy) {
    if (enemy) {
      return { BODY: E.STEEL, BODY2: E.STEEL_D, DARK: E.STEEL_DD, DEEP: E.DARK, ACC: E.RED_L, ACC2: E.RED,
               EYE: E.EYE, MARK: E.BRONZE, GLASS0: '#334155', GLASS1: '#0f172a', TIRE: '#1f2430',
               ENERGY: '#fca5a5', RIM: E.RED_L, SN: E.RED_L, PI: E.STEEL_D, MG: E.RED };
    }
    return { BODY: MK.COAT, BODY2: MK.COAT2, DARK: MK.PANTS, DEEP: '#1f2937', ACC: MK.ORANGE, ACC2: '#c2410c',
             EYE: H.EYE, MARK: H.RED_L, GLASS0: '#e0f2fe', GLASS1: '#7dd3fc', TIRE: '#1f2430',
             ENERGY: '#60a5fa', RIM: MK.ORANGE, SN: '#f43f5e', PI: '#fbbf24', MG: '#a855f7' };
  }
  function palSub(enemy) {
    if (enemy) {
      return { BODY: E.STEEL, BODY2: E.STEEL_D, BELLY: '#94a3b8', DARK: E.STEEL_DD, DEEP: E.DARK,
               ACC: E.RED_L, ACC2: E.RED, EYE: E.EYE, MARK: E.BRONZE, GLASS0: '#334155', GLASS1: '#0f172a',
               SH0: '#cbd5e1', SH1: E.RED_L, SH2: E.DARK, HUB: E.RED_L, RIVET: '#fca5a5' };
    }
    return { BODY: PT.SUIT, BODY2: PT.SUIT_D, BELLY: '#fef9c3', DARK: '#3f3f46', DEEP: PT.BLACK,
             ACC: PT.GREEN, ACC2: PT.GREEN_D, EYE: H.EYE, MARK: H.RED_L, GLASS0: '#ecfeff', GLASS1: '#a5f3fc',
             SH0: '#e5e7eb', SH1: PT.GREEN, SH2: PT.BLACK, HUB: '#4ade80', RIVET: '#86efac' };
  }

  // ---------- Utilidades ----------
  function limb(c, x1, y1, x2, y2, w, fill, lw) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy);
    c.save(); c.translate(x1, y1); c.rotate(Math.atan2(dy, dx));
    P2.rf(c, -w / 2, -w / 2, L + w, w, w / 2, fill, O, lw || 3);
    c.restore();
  }
  function stroke2(c, pts, col, w) {   // trazo con contorno (franjas, tubos)
    [[O, w + 4], [col, w]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1]; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    });
  }
  // ceja enfadada (enemigo) o sonrisa (hackeado) junto al ojo-luz
  function face(c, enemy, ex, ey, r) {
    if (enemy) {
      P2.poly(c, [[ex - r * 1.9, ey - r * 2.3], [ex + r * 1.9, ey - r * 1.1], [ex + r * 1.9, ey - r * 0.4], [ex - r * 1.9, ey - r * 1.5]], E.DARK, O, 2.5);
    } else {
      c.strokeStyle = O; c.lineWidth = 2.5;
      c.beginPath(); c.arc(ex - r * 0.2, ey + r * 1.5, r * 1.05, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    }
  }
  function mark(c, x, y, s, P) { P2.horns(c, x, y, s, P.MARK); }

  // ---------- Pilotos (busto). (0,0) = base de los hombros; cabeza r=15 ----------
  function pilotMikey(c) {
    P2.rf(c, -17, -12, 34, 16, 7, MK.COAT, O, 2.5);
    P2.rf(c, -8, -14, 16, 5, 2, MK.ORANGE, O, 2);
    P2.circ(c, 0, -27, 15, SKIN, O, 3);
    // pelo de punta (despeinado de genio)
    P2.poly(c, [[-16, -26], [-18, -37], [-12, -41], [-12, -49], [-4, -44], [1, -52], [6, -44], [13, -48], [12, -40],
      [18, -36], [16, -26], [11, -33], [3, -30], [-5, -33], [-11, -29]], MK.HAIR, O, 2.5);
    // gafas-taller subidas a la frente
    P2.rf(c, -12, -42, 24, 9, 4, MK.ORANGE, O, 2);
    P2.circ(c, -5, -37.5, 3, '#fde68a', O, 1.5); P2.circ(c, 5, -37.5, 3, '#fde68a', O, 1.5);
    // ojos y sonrisa
    P2.circ(c, -5, -25, 2.4, O, null); P2.circ(c, 5, -25, 2.4, O, null);
    P2.circ(c, -4.2, -25.8, 0.8, '#fff', null); P2.circ(c, 5.8, -25.8, 0.8, '#fff', null);
    c.strokeStyle = O; c.lineWidth = 2.2; c.beginPath(); c.arc(0, -21, 4.5, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    // cascos con micrófono
    P2.rf(c, -19, -31, 7, 11, 3, '#2e1065', O, 2);
    c.strokeStyle = O; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-16, -21); c.quadraticCurveTo(-14, -14, -5, -15); c.stroke();
    c.strokeStyle = '#2e1065'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-16, -21); c.quadraticCurveTo(-14, -14, -5, -15); c.stroke();
    P2.circ(c, -4, -15, 2.2, MK.ORANGE, O, 1.5);
  }
  function pilotPeter(c) {
    P2.rf(c, -17, -12, 34, 16, 7, PT.SUIT, O, 2.5);
    P2.rf(c, -8, -14, 16, 5, 2, PT.BLACK, O, 2);
    P2.circ(c, 0, -27, 15, SKIN, O, 3);
    // casco negro con raya verde
    c.beginPath(); c.arc(0, -29, 16.5, Math.PI, 0); c.closePath();
    c.fillStyle = PT.BLACK; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    c.strokeStyle = PT.GREEN; c.lineWidth = 3.5; c.beginPath(); c.arc(0, -29, 13, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
    P2.circ(c, -13, -28, 4, PT.BLACK, O, 2); P2.circ(c, -13, -28, 1.6, PT.GREEN, null);
    // ojos decididos
    P2.circ(c, -5, -22.5, 2.4, O, null); P2.circ(c, 5, -22.5, 2.4, O, null);
    P2.circ(c, -4.2, -23.3, 0.8, '#fff', null); P2.circ(c, 5.8, -23.3, 0.8, '#fff', null);
    P2.line(c, -8, -26.5, -2.5, -25.5, O, 2); P2.line(c, 8, -26.5, 2.5, -25.5, O, 2);
    c.strokeStyle = O; c.lineWidth = 2.2; c.beginPath(); c.arc(0, -18.5, 4, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  }
  function pilot(c, who, x, by, k) {
    c.save(); c.translate(x, by); c.scale(k, k); c.lineJoin = 'round'; c.lineCap = 'round';
    if (who === 'peter') pilotPeter(c); else pilotMikey(c);
    c.restore();
  }

  // Piloto en una cabina de alto h cuyo borde de arriba está en y: el héroe real
  // de heroes.js (cabeza y hombros) o, si no está cargado, el busto de repuesto.
  function hero(c, who, x, y, h) {
    var fn = P2.fn && P2.fn[who === 'peter' ? 'peter' : 'mikey'];
    if (typeof fn === 'function') {
      var top = who === 'peter' ? 66 : 72, k = h / (top - 18);
      fn(c, x - 1.5 * k, y + 2 + top * k, { variant: 'A', scale: k, facing: 1 });
    } else {
      pilot(c, who, x, y + h + 2, h / 50);
    }
  }

  // Cabina con cristal: dentro, el piloto (o vacía y tintada si es enemiga)
  function cockpit(c, x, y, w, h, r, P, enemy, who) {
    c.save();
    P2.rr(c, x, y, w, h, r);
    var g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, P.GLASS0); g.addColorStop(1, P.GLASS1);
    c.fillStyle = g; c.fill();
    c.clip();
    if (!enemy) {
      hero(c, who, x + w * 0.5, y, h);
    } else {
      c.globalAlpha = 0.55; P2.circ(c, x + w * 0.6, y + h * 0.6, h * 0.24, E.RED_L, null); c.globalAlpha = 1;
    }
    c.globalAlpha = 0.45; c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x + w * 0.84, y); c.lineTo(x + w * 0.96, y); c.lineTo(x + w * 0.9, y + h * 0.55); c.lineTo(x + w * 0.78, y + h * 0.55);
    c.closePath(); c.fill();
    c.globalAlpha = 1;
    c.restore();
    P2.rr(c, x, y, w, h, r); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
  }
  // Cabina redonda (ojo de buey) para los submarinos
  function porthole(c, x, y, r, P, enemy) {
    c.save();
    P2.circ(c, x, y, r + 4, P.DEEP, O, 3);
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    var g = c.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, P.GLASS0); g.addColorStop(1, P.GLASS1);
    c.fillStyle = g; c.fill(); c.clip();
    if (!enemy) hero(c, 'peter', x, y - r, r * 2);
    else { c.globalAlpha = 0.55; P2.circ(c, x + r * 0.2, y + r * 0.2, r * 0.45, E.RED_L, null); c.globalAlpha = 1; }
    c.globalAlpha = 0.45; c.fillStyle = '#fff';
    c.lineWidth = Math.max(1.5, r * 0.16); c.strokeStyle = '#fff'; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, r * 0.78, -1.25, -0.35); c.stroke();
    c.globalAlpha = 1;
    c.restore();
    P2.circ(c, x, y, r, null, O, 2.5);
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3 + 0.3;
      P2.circ(c, x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), 1.4, P.RIVET, null);
    }
  }

  // ---------- Ruedas de la moto ----------
  // 'radios': llanta naranja con 5 radios (A) · 'hueca': rueda gorda sin centro, aro brillante (B)
  function wheel(c, x, y, r, P, style) {
    c.save();
    if (style === 'hueca') {
      var n = 12;
      for (var i = 0; i < n; i++) {
        c.save(); c.translate(x, y); c.rotate(i * Math.PI * 2 / n + 0.1);
        P2.rf(c, r - 3, -r * 0.16, 6, r * 0.32, 2, P.TIRE, O, 2);
        c.restore();
      }
      P2.circ(c, x, y, r, P.TIRE, O, 3);
      // el centro está vacío: se ve un aro de energía
      c.globalAlpha = 0.35; P2.circ(c, x, y, r * 0.62, P.RIM, null); c.globalAlpha = 1;
      P2.circ(c, x, y, r * 0.52, '#120a24', O, 2.5);
      c.strokeStyle = P.RIM; c.lineWidth = Math.max(2, r * 0.12);
      c.beginPath(); c.arc(x, y, r * 0.66, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = '#fff7ed'; c.lineWidth = Math.max(1, r * 0.04);
      c.beginPath(); c.arc(x, y, r * 0.66, -2.4, -1.4); c.stroke();
      P2.circ(c, x, y, r * 0.12, P.EYE, null);
    } else {
      P2.circ(c, x, y, r, P.TIRE, O, 3);
      c.strokeStyle = '#3a4152'; c.lineWidth = Math.max(1.5, r * 0.08);
      c.beginPath(); c.arc(x, y, r * 0.8, 0, Math.PI * 2); c.stroke();
      P2.circ(c, x, y, r * 0.62, P.DARK, O, 2.5);
      c.strokeStyle = P.RIM; c.lineWidth = Math.max(2, r * 0.14); c.lineCap = 'round';
      for (var b = 0; b < 5; b++) {
        var a = b * Math.PI * 2 / 5 - 1.2;
        c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
        c.lineTo(x + Math.cos(a) * r * 0.56, y + Math.sin(a) * r * 0.56); c.stroke();
      }
      P2.circ(c, x, y, r * 0.22, P.RIM, O, 2);
      P2.circ(c, x - r * 0.06, y - r * 0.06, r * 0.07, '#fff', null);
    }
    c.restore();
  }

  // ---------- Los 3 lanzadores de Mikey (francotirador, pistola, metralleta) ----------
  // (x,y) = parte trasera del bloque, apuntan hacia +x. s = tamaño
  function launchers(c, x, y, s, P) {
    c.save(); c.translate(x, y); c.scale(s, s);
    // francotirador: largo y fino, arriba
    P2.rf(c, 12, -15, 38, 5, 2.5, P.SN, O, 2);
    P2.rf(c, 20, -18, 8, 3, 1.5, P.DEEP, O, 1.5);
    P2.circ(c, 51, -12.5, 2.6, P.ENERGY, O, 1.5);
    // pistola: media, en el centro
    P2.rf(c, 12, -8, 22, 7, 3, P.PI, O, 2);
    P2.circ(c, 35, -4.5, 3, P.ENERGY, O, 1.5);
    // metralleta: varios cañoncitos, abajo
    P2.rf(c, 12, 0, 16, 9, 3, P.MG, O, 2);
    [1.5, 4.5, 7.5].forEach(function (yy) { P2.rf(c, 27, yy - 1.2, 9, 2.4, 1, '#cbd5e1', O, 1); });
    P2.circ(c, 37, 4.5, 2.4, P.ENERGY, O, 1.5);
    // bloque del manillar (empuñadura)
    P2.rf(c, 0, -18, 16, 29, 5, P.DARK, O, 2.5);
    P2.circ(c, 8, -3, 3, P.ACC, O, 1.5);
    c.restore();
  }
  // Manillar de verdad (modo moto): tubo que sale del bloque hacia la cabina,
  // empuñadura naranja y, si va Mikey, su brazo con guante agarrándola.
  // (bx,by) = salida del tubo en el bloque; (gx,gy) = empuñadura; (sx,sy) = hombro de Mikey
  function handlebar(c, bx, by, gx, gy, sx, sy, P, enemy) {
    stroke2(c, [[bx, by], [bx - 3, gy], [gx + 5, gy]], '#cbd5e1', 3);
    P2.rf(c, gx - 7, gy - 3, 13, 6, 3, enemy ? E.STEEL_DD : MK.ORANGE, O, 2);
    if (!enemy) {
      limb(c, sx, sy, gx - 2, gy + 1, 6, MK.COAT, 2);
      P2.circ(c, gx - 1, gy, 4.2, MK.ORANGE, O, 2);
    }
  }

  // =====================================================================
  //  ROBOT-MOTO A "RAYO" — modo robot (pies en 0,0, mira a la derecha). ~132 px
  // =====================================================================
  function motoRobotA(c, P, enemy) {
    P2.elli(c, -2, -1, 36, 6, 'rgba(0,0,0,0.25)', null);
    // rueda trasera de la moto, a la espalda (como una mochila)
    limb(c, -14, -88, -26, -86, 6, P.DEEP, 2.5);
    wheel(c, -28, -86, 18, P, 'radios');
    // pierna trasera con la rueda delantera en la pantorrilla
    limb(c, -5, -58, -13, -33, 12, P.DARK);
    limb(c, -13, -33, -10, -10, 12, P.DARK);
    P2.rf(c, -22, -12, 24, 12, 5, P.DEEP, O, 3);
    wheel(c, -17, -28, 13, P, 'radios');
    // brazo trasero
    limb(c, -10, -96, -16, -76, 10, P.BODY2, 2.5);
    P2.circ(c, -16, -72, 6, P.BODY2, O, 2.5);
    // caderas
    P2.rf(c, -14, -66, 28, 12, 5, P.DEEP, O, 3);
    // pierna delantera (rodilla adelantada)
    limb(c, 5, -58, 14, -34, 14, P.BODY2);
    limb(c, 14, -34, 10, -10, 14, P.BODY2);
    P2.circ(c, 14, -34, 5, P.ACC, O, 2);
    P2.rf(c, 0, -12, 29, 12, 6, P.DEEP, O, 3);
    P2.rf(c, 22, -10, 7, 7, 3, P.ACC, O, 2);
    // brazo delantero (por detrás del pecho, para que se vea a Mikey)
    P2.circ(c, -6, -94, 7, P.BODY2, O, 2.5);
    limb(c, -6, -94, 4, -66, 10, P.BODY2);
    limb(c, 4, -66, 22, -78, 10, P.BODY2);
    // torso = depósito + cabina
    P2.rf(c, -19, -106, 38, 46, 13, P.BODY, O, 3);
    P2.rf(c, -19, -74, 38, 7, 3, P.ACC, O, 2.5);
    cockpit(c, -6, -102, 23, 25, 8, P, enemy, 'mikey');
    // cuello y casco de motorista (con aleta)
    P2.rf(c, -5, -112, 10, 8, 3, P.DEEP, O, 2.5);
    P2.poly(c, [[-8, -128], [-24, -136], [-18, -118]], P.ACC, O, 2.5);
    mark(c, 1, -134, 0.48, P);
    P2.rf(c, -13, -136, 28, 26, 11, P.BODY, O, 3);
    P2.rf(c, 1, -129, 16, 11, 5, P.DEEP, O, 2.5);
    P2.eyeLight(c, 10, -123.5, 3.4, P.EYE);
    face(c, enemy, 10, -123.5, 3.4);
    // antebrazo con los 3 lanzadores (el manillar), por delante del pecho
    launchers(c, 20, -78, 0.85, P);
  }

  // =====================================================================
  //  ROBOT-MOTO A "RAYO" — modo moto (suelo en 0, centro en x=0). ~140 px
  // =====================================================================
  function motoMotoA(c, P, enemy, boost) {
    P2.elli(c, 0, -1, 68, 6, 'rgba(0,0,0,0.25)', null);
    if (boost) {
      c.save(); c.globalAlpha = 0.9;
      P2.poly(c, [[-70, -36], [-104, -31], [-70, -26]], enemy ? E.RED_L : P.ENERGY, O, 2);
      P2.poly(c, [[-70, -34], [-88, -31], [-70, -28]], '#ffffff', null);
      c.restore();
    }
    P2.rf(c, -74, -36, 32, 9, 4, '#cbd5e1', O, 2.5);           // escape
    limb(c, -46, -18, -8, -30, 9, P.DARK);                        // basculante
    wheel(c, -46, -18, 18, P, 'radios');
    P2.rf(c, -26, -42, 44, 24, 8, P.DEEP, O, 3);                 // motor
    [-16, -8, 0, 8].forEach(function (xx) { P2.line(c, xx, -36, xx, -24, P.ACC2, 2.5); });
    wheel(c, 50, -18, 18, P, 'radios');
    limb(c, 40, -50, 50, -18, 7, '#cbd5e1', 2.5);                 // horquilla
    // carrocería en cuña
    P2.poly(c, [[-72, -52], [-52, -52], [-30, -46], [0, -48], [24, -60], [46, -62], [66, -50], [64, -38],
      [42, -32], [10, -34], [-24, -36], [-58, -38]], P.BODY, O, 3);
    stroke2(c, [[-66, -46], [-30, -41], [0, -43], [24, -53], [50, -55]], P.ACC, 4);
    P2.rf(c, 34, -42, 32, 7, 3.5, P.BODY2, O, 2.5);             // guardabarros
    P2.eyeLight(c, 58, -50, 4.4, P.EYE);                          // faro = el ojo
    face(c, enemy, 58, -50, 4.4);
    mark(c, -60, -52, 0.42, P);
    // cabina (el casco del robot), un poco más baja: Mikey va inclinado hacia delante
    cockpit(c, -26, -76, 36, 30, 13, P, enemy, 'mikey');
    // parabrisas pequeño delante de Mikey
    P2.poly(c, [[12, -58], [18, -76], [24, -75], [20, -58]], 'rgba(186,230,253,0.6)', O, 2);
    // manillar con los 3 lanzadores
    launchers(c, 22, -70, 0.95, P);
    handlebar(c, 25, -76, 14, -66, 2, -54, P, enemy);
  }

  // =====================================================================
  //  ROBOT-MOTO B "BESTIA" — modo robot: fortachón que patina con ruedas-pie. ~150 px
  // =====================================================================
  function motoRobotB(c, P, enemy) {
    P2.elli(c, 0, -1, 44, 7, 'rgba(0,0,0,0.25)', null);
    // tubos de escape a la espalda
    P2.rf(c, -40, -138, 8, 34, 4, '#cbd5e1', O, 2.5); P2.rf(c, -42, -142, 12, 6, 3, '#94a3b8', O, 2);
    // brazo trasero
    limb(c, -24, -110, -30, -84, 13, P.DARK);
    P2.rf(c, -38, -86, 18, 17, 6, P.DARK, O, 3);
    // piernas cortas y fuertes, con ruedas en los pies (¡patina!)
    limb(c, -8, -62, -16, -34, 17, P.DARK);
    wheel(c, -18, -19, 19, P, 'hueca');
    limb(c, 8, -62, 16, -34, 19, P.BODY2);
    P2.circ(c, 15, -38, 6, P.ACC, O, 2);
    wheel(c, 18, -19, 19, P, 'hueca');
    // caderas
    P2.rf(c, -22, -72, 44, 14, 6, P.DEEP, O, 3);
    // torso grande
    P2.rf(c, -32, -124, 64, 58, 18, P.BODY, O, 3);
    P2.rf(c, -32, -84, 64, 8, 4, P.ACC, O, 2.5);
    cockpit(c, -12, -120, 30, 32, 11, P, enemy, 'mikey');
    P2.rf(c, -29, -116, 13, 26, 5, P.BODY2, O, 2.5);
    [-110, -102, -94].forEach(function (yy) { P2.line(c, -25, yy, -20, yy, P.ACC, 2.5); });
    // cabeza con casco y ojo
    P2.rf(c, -6, -130, 12, 8, 3, P.DEEP, O, 2.5);
    mark(c, -2, -150, 0.5, P);
    P2.rf(c, -18, -152, 32, 26, 11, P.BODY, O, 3);
    P2.rf(c, -1, -145, 17, 12, 5, P.DEEP, O, 2.5);
    P2.eyeLight(c, 8, -139, 3.6, P.EYE);
    face(c, enemy, 8, -139, 3.6);
    // manillar-cañón sobre el hombro con los 3 lanzadores
    P2.rf(c, 18, -128, 14, 14, 5, P.DARK, O, 2.5);
    launchers(c, 24, -122, 1.0, P);
    // brazo delantero con puño enorme
    P2.circ(c, 28, -104, 9, P.BODY2, O, 3);
    limb(c, 28, -104, 34, -82, 13, P.BODY2);
    P2.rf(c, 26, -84, 24, 22, 8, P.BODY, O, 3);
    P2.rf(c, 45, -81, 6, 16, 3, P.ACC, O, 2);
  }

  // =====================================================================
  //  ROBOT-MOTO B "BESTIA" — modo moto: gorda, ruedas huecas que brillan. ~146 px
  // =====================================================================
  function motoMotoB(c, P, enemy, boost) {
    P2.elli(c, 0, -1, 70, 7, 'rgba(0,0,0,0.25)', null);
    if (boost) {
      c.save(); c.globalAlpha = 0.9;
      [[-62], [-50]].forEach(function (yy) {
        P2.poly(c, [[-70, yy[0] - 4], [-98, yy[0]], [-70, yy[0] + 4]], enemy ? E.RED_L : MK.ORANGE_L, O, 2);
      });
      c.restore();
    }
    // escapes dobles
    P2.rf(c, -74, -70, 30, 8, 4, '#cbd5e1', O, 2.5);
    P2.rf(c, -74, -58, 30, 8, 4, '#cbd5e1', O, 2.5);
    // silueta "chopper": rueda trasera gorda, horquilla larga y rueda delantera más grande
    wheel(c, -46, -22, 22, P, 'hueca');
    limb(c, -46, -22, -10, -42, 9, P.DARK);                       // basculante
    // motor en V entre las ruedas
    P2.rf(c, -24, -54, 36, 26, 9, P.DEEP, O, 3);
    P2.rf(c, -20, -64, 12, 14, 4, '#94a3b8', O, 2); P2.rf(c, -2, -64, 12, 14, 4, '#94a3b8', O, 2);
    [-12, -2, 6].forEach(function (xx) { P2.line(c, xx, -48, xx, -34, P.ACC, 2.5); });
    // horquilla larga e inclinada hasta el buje delantero
    limb(c, 40, -76, 62, -26, 8, '#cbd5e1');
    wheel(c, 62, -26, 26, P, 'hueca');
    // aleta corta sobre la rueda trasera
    [[O, 11], [P.DARK, 6]].forEach(function (st) {
      c.strokeStyle = st[0]; c.lineWidth = st[1]; c.lineCap = 'round';
      c.beginPath(); c.arc(-46, -22, 28, Math.PI * 1.25, Math.PI * 1.6); c.stroke();
    });
    // carrocería acorazada: colín levantado, depósito gordo y morro (la panza más alta)
    P2.poly(c, [[-68, -64], [-72, -82], [-56, -84], [-34, -72], [-6, -70], [20, -84], [48, -82], [64, -68], [60, -58],
      [40, -56], [16, -60], [-24, -62], [-56, -60]], P.BODY, O, 3);
    stroke2(c, [[-64, -76], [-36, -66], [-6, -64], [20, -76], [50, -74]], P.ACC, 4);
    P2.eyeLight(c, 54, -70, 4.6, P.EYE);
    face(c, enemy, 54, -70, 4.6);
    mark(c, -62, -84, 0.45, P);
    // cabina, un poco más baja (Mikey inclinado hacia delante)
    cockpit(c, -32, -98, 36, 30, 13, P, enemy, 'mikey');
    P2.poly(c, [[6, -82], [12, -100], [18, -99], [14, -82]], 'rgba(186,230,253,0.6)', O, 2);
    // manillar con los 3 lanzadores (más grandes)
    launchers(c, 22, -92, 1.1, P);
    handlebar(c, 25, -98, 12, -88, -4, -76, P, enemy);
  }

  // =====================================================================
  //  ESCUDO DE PETER (idea de Juanjo): redondo, radios verdes y negros
  // =====================================================================
  function shield(c, x, y, r, P, rot) {
    c.save(); c.translate(x, y);
    P2.circ(c, 0, 0, r, P.SH2, O, 3);                 // borde negro grueso
    P2.circ(c, 0, 0, r * 0.8, P.SH0, O, 2);           // disco de metal claro
    c.save(); c.rotate(rot || 0);
    for (var i = 0; i < 8; i++) {                     // 8 radios: verde, negro, verde, negro…
      c.save(); c.rotate(i * Math.PI / 4);
      P2.rf(c, r * 0.15, -r * 0.1, r * 0.62, r * 0.2, r * 0.08, i % 2 ? P.SH2 : P.SH1, O, 1.6);
      c.restore();
    }
    c.restore();
    P2.circ(c, 0, 0, r * 0.25, P.SH2, O, 2);
    P2.circ(c, 0, 0, r * 0.12, P.HUB, null);
    for (var k = 0; k < 8; k++) {
      var b = k * Math.PI / 4 + Math.PI / 8 + (rot || 0);
      P2.circ(c, Math.cos(b) * r * 0.9, Math.sin(b) * r * 0.9, Math.max(1, r * 0.055), P.RIVET, null);
    }
    c.globalAlpha = 0.45; c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.5, r * 0.1);
    c.beginPath(); c.arc(0, 0, r * 0.66, Math.PI * 1.08, Math.PI * 1.42); c.stroke(); c.globalAlpha = 1;
    c.restore();
  }

  // Burbujas deterministas (estela del submarino)
  function bubbles(c, x, y, n, spread) {
    c.save();
    for (var i = 0; i < n; i++) {
      var bx = x - i * spread - (i % 3) * 4, by = y + Math.sin(i * 2.1 + P2.T) * 6 - i * 3.5;
      var br = 2.5 + (i * 7 % 5) * 0.9;
      c.globalAlpha = 0.85; P2.circ(c, bx, by, br, 'rgba(224,242,254,0.35)', '#e0f2fe', 1.5);
      P2.circ(c, bx - br * 0.35, by - br * 0.35, br * 0.25, '#ffffff', null);
    }
    c.restore();
  }
  function jetFlame(c, x, y, len, w, enemy) {
    c.save(); c.globalAlpha = 0.92;
    P2.poly(c, [[x, y - w], [x - len, y], [x, y + w]], enemy ? E.RED_L : '#fb923c', O, 2);
    P2.poly(c, [[x, y - w * 0.55], [x - len * 0.62, y], [x, y + w * 0.55]], '#fde68a', null);
    P2.poly(c, [[x, y - w * 0.25], [x - len * 0.3, y], [x, y + w * 0.25]], '#ffffff', null);
    c.restore();
  }

  // =====================================================================
  //  SUBMARINO-NAVE A "CÁPSULA-ESCUDO" (centro en 0,0; mira a la derecha). ~140 px
  // =====================================================================
  function subA(c, P, enemy, nave, estela) {
    // ala lejana (solo en vuelo), por detrás del casco
    if (nave) {
      P2.poly(c, [[-4, -14], [-34, -52], [-50, -52], [-36, -12]], P.BODY2, O, 3);
      P2.poly(c, [[-34, -52], [-50, -52], [-46, -44], [-30, -46]], P.ACC, O, 2);
    }
    // estela
    if (estela !== false) {
      if (nave) jetFlame(c, -72, 0, 40, 10, enemy);
      else bubbles(c, -78, 2, 6, 9);
    }
    // aletas de cola
    P2.poly(c, [[-46, -16], [-70, -36], [-62, -12]], P.DEEP, O, 2.5);
    P2.poly(c, [[-46, 16], [-70, 36], [-62, 12]], P.DEEP, O, 2.5);
    // popa: hélice (submarino) o turbo (nave)
    if (nave) {
      P2.rf(c, -74, -11, 18, 22, 6, P.DARK, O, 3);
      P2.circ(c, -72, 0, 5, '#fde68a', O, 2);
    } else {
      P2.rf(c, -68, -5, 10, 10, 3, P.DARK, O, 2.5);
      P2.elli(c, -72, -10, 4, 10, '#cbd5e1', O, 2);
      P2.elli(c, -72, 10, 4, 10, '#cbd5e1', O, 2);
      P2.circ(c, -72, 0, 4, P.DEEP, O, 2);
    }
    // torre con la cabina
    P2.rf(c, -24, -44, 42, 26, 11, P.BODY, O, 3);
    if (!nave) {   // periscopio
      P2.line(c, 8, -44, 8, -58, O, 7); P2.line(c, 8, -44, 8, -58, P.DARK, 3.5);
      P2.rf(c, 4, -62, 14, 7, 3, P.DARK, O, 2.5);
      P2.circ(c, 17, -58.5, 2.2, P.EYE, null);
    } else {       // antena-aleta de vuelo
      P2.poly(c, [[-18, -42], [-30, -58], [-6, -44]], P.DEEP, O, 2.5);
    }
    // casco redondo
    P2.rf(c, -62, -24, 114, 48, 24, P.BODY, O, 3);
    c.save(); P2.rr(c, -62, -24, 114, 48, 24); c.clip();
    c.fillStyle = P.BODY2; c.fillRect(-70, 9, 140, 20);
    c.fillStyle = P.DEEP; c.fillRect(-42, -30, 9, 60); c.fillRect(-28, -30, 5, 60);
    c.restore();
    P2.rr(c, -62, -24, 114, 48, 24); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
    P2.line(c, -62, 9, 52, 9, O, 2);
    // ventanitas
    [[-16, 1], [-2, 1]].forEach(function (p) { P2.circ(c, p[0], p[1], 5, P.GLASS1, O, 2); P2.circ(c, p[0] - 1.5, p[1] - 1.5, 1.4, '#fff', null); });
    mark(c, -48, -24, 0.42, P);
    // ojo-luz (faro), justo detrás del escudo-proa para que se vea su cara
    P2.eyeLight(c, 18, -8, 4.2, P.EYE);
    face(c, enemy, 18, -8, 4.2);
    // cabina (ojo de buey) en la torre
    porthole(c, -4, -37, 14, P, enemy);
    // aleta de inmersión (sub) o ala grande (nave)
    if (nave) {
      P2.poly(c, [[-2, 10], [-30, 44], [-52, 44], [-40, 10]], P.BODY, O, 3);
      P2.poly(c, [[-30, 44], [-52, 44], [-48, 36], [-26, 36]], P.ACC, O, 2);
      P2.line(c, -16, 16, -36, 38, P.DEEP, 3);
    } else {
      P2.poly(c, [[-14, 12], [16, 12], [0, 26], [-18, 22]], P.BODY2, O, 2.5);
    }
    // PROA = el escudo de Peter
    shield(c, 54, 0, 25, P, nave ? 0.2 : 0);
  }

  // =====================================================================
  //  SUBMARINO-NAVE B "DELFÍN-COHETE" (centro en 0,0; mira a la derecha). ~150 px
  // =====================================================================
  function dolphinPath(c) {
    // frente abombada (melón) + pico corto y redondeado a la altura de y≈+4
    c.beginPath();
    c.moveTo(58, -1);
    c.lineTo(70, 0);
    c.quadraticCurveTo(78, 0, 78, 5);
    c.quadraticCurveTo(78, 11, 70, 11);
    c.lineTo(60, 11);
    c.bezierCurveTo(46, 21, 26, 24, 4, 24);
    c.bezierCurveTo(-20, 24, -46, 14, -64, 6);
    c.lineTo(-64, -6);
    c.bezierCurveTo(-46, -16, -24, -26, 0, -30);
    c.bezierCurveTo(26, -35, 52, -32, 56, -14);
    c.quadraticCurveTo(57, -6, 58, -1);
    c.closePath();
  }
  // aleta caudal: dos lóbulos curvos detrás del escudo-hélice
  function flukes(c, P) {
    c.save();
    [-1, 1].forEach(function (k) {
      c.beginPath();
      c.moveTo(-60, 4 * k);
      c.quadraticCurveTo(-74, 14 * k, -96, 34 * k);
      c.quadraticCurveTo(-98, 22 * k, -86, 8 * k);
      c.quadraticCurveTo(-76, 2 * k, -60, -2 * k);
      c.closePath();
      c.fillStyle = P.DEEP; c.fill(); c.strokeStyle = O; c.lineWidth = 2.5; c.stroke();
    });
    c.restore();
  }
  function subB(c, P, enemy, nave, estela) {
    // ala lejana (nave)
    if (nave) {
      P2.poly(c, [[6, -18], [-22, -56], [-40, -56], [-26, -16]], P.BODY2, O, 3);
      P2.poly(c, [[-22, -56], [-40, -56], [-36, -48], [-18, -48]], P.DEEP, O, 2);
    }
    if (estela !== false) {
      if (nave) jetFlame(c, -84, 0, 44, 12, enemy);
      else bubbles(c, -104, 0, 6, 9);
    }
    // aleta dorsal curva (más alta en vuelo)
    c.beginPath();
    if (nave) { c.moveTo(-4, -29); c.quadraticCurveTo(-12, -52, -38, -62); c.quadraticCurveTo(-28, -44, -30, -23); }
    else { c.moveTo(-2, -29); c.quadraticCurveTo(-8, -44, -30, -50); c.quadraticCurveTo(-22, -38, -26, -23); }
    c.closePath(); c.fillStyle = P.DEEP; c.fill(); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
    // cola de delfín (detrás del escudo-hélice)
    flukes(c, P);
    // cuerpo de delfín
    dolphinPath(c); c.fillStyle = P.BODY; c.fill();
    c.save(); dolphinPath(c); c.clip();
    c.fillStyle = P.BELLY; c.beginPath(); c.ellipse(10, 22, 70, 14, 0, 0, Math.PI * 2); c.fill();
    // franja negra de "velocidad"
    c.fillStyle = P.DEEP;
    c.beginPath(); c.moveTo(-64, -2); c.quadraticCurveTo(-14, -6, 22, -2); c.lineTo(22, 4); c.quadraticCurveTo(-14, 2, -64, 6); c.closePath(); c.fill();
    c.restore();
    dolphinPath(c); c.strokeStyle = O; c.lineWidth = 3; c.stroke();
    // boca: del pico hacia atrás, curvándose hacia arriba bajo el ojo (sonrisa)
    c.save(); c.strokeStyle = O; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(76, 5.5); c.lineTo(60, 5.5);
    if (enemy) c.quadraticCurveTo(52, 5.5, 47, 9); else c.quadraticCurveTo(50, 5.5, 46, 0);
    c.stroke(); c.restore();
    // antifaz pequeño y ojo-luz
    P2.elli(c, 42, -11, 8, 6, P.DEEP, O, 2);
    P2.eyeLight(c, 43, -11, 3.8, P.EYE);
    if (enemy) face(c, true, 43, -11, 3.8);
    mark(c, -32, -20, 0.4, P);
    // cabina en la "frente"
    porthole(c, 14, -33, 14, P, enemy);
    // aleta pectoral (sub) o ala grande (nave)
    if (nave) {
      P2.poly(c, [[16, 10], [-18, 44], [-42, 46], [-20, 8]], P.BODY, O, 3);
      P2.poly(c, [[-18, 44], [-42, 46], [-38, 38], [-14, 36]], P.ACC, O, 2);
      P2.line(c, -2, 16, -24, 38, P.DEEP, 3);
    } else {
      P2.poly(c, [[14, 12], [-2, 32], [-12, 30], [-4, 12]], P.BODY2, O, 2.5);
    }
    // el escudo de Peter hace de HÉLICE (y de turbo en vuelo)
    P2.rf(c, -70, -8, 10, 16, 4, P.DARK, O, 2.5);
    shield(c, -72, 0, 18, P, nave ? 0 : 0.4);
    if (!nave) {   // giro de la hélice
      c.save(); c.globalAlpha = 0.6; c.strokeStyle = '#e0f2fe'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(-72, 0, 23, -2.4, -1.2); c.stroke();
      c.beginPath(); c.arc(-72, 0, 23, 0.8, 2.0); c.stroke();
      c.restore();
    }
  }

  // ---------- Exportadas ----------
  function run(fn, c, x, y, o, a, b, d) {
    try {
      var s = (typeof o.scale === 'number' && o.scale > 0) ? o.scale : 1;
      var f = (o.facing === -1) ? -1 : 1;
      c.save();
      try {
        c.translate(x, y); c.scale(s * f, s);
        c.lineJoin = 'round'; c.lineCap = 'round';
        fn(c, a, b, d, o.estela);
      } catch (e) { /* nunca lanzar */ }
      c.restore();
    } catch (e2) { /* nada */ }
  }
  P2.fn.robotMoto = function (c, x, y, o) {
    o = o || {};
    var B = o.variant === 'B', enemy = !!o.enemy, P = palMoto(enemy);
    var fn = (o.modo === 'moto') ? (B ? motoMotoB : motoMotoA) : (B ? motoRobotB : motoRobotA);
    run(fn, c, x, y, o, P, enemy, !!o.boost);
  };
  P2.fn.submarinoNave = function (c, x, y, o) {
    o = o || {};
    var enemy = !!o.enemy, P = palSub(enemy), nave = o.modo === 'nave';
    run(o.variant === 'B' ? subB : subA, c, x, y, o, P, enemy, nave);
  };
  P2.fn.escudoVehiculo = function (c, x, y, o) {
    o = o || {};
    try {
      var s = o.scale || 1;
      c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round'; c.lineCap = 'round';
      shield(c, 0, 0, 24, palSub(!!o.enemy), o.rot || 0);
      c.restore();
    } catch (e) { /* nada */ }
  };

  // ---------- Utilidades de los paneles ----------
  function arrow(c, x1, y1, cx, cy, x2, y2, col) {
    c.save(); c.lineCap = 'round';
    [[O, 9], [col, 5]].forEach(function (p) {
      c.strokeStyle = p[0]; c.lineWidth = p[1];
      c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(cx, cy, x2, y2); c.stroke();
    });
    var a = Math.atan2(y2 - cy, x2 - cx);
    c.translate(x2, y2); c.rotate(a);
    P2.poly(c, [[10, 0], [-6, -9], [-6, 9]], col, O, 2.5);
    c.restore();
  }
  function pointer(c, x1, y1, x2, y2) {
    P2.line(c, x1, y1, x2, y2, O, 4); P2.line(c, x1, y1, x2, y2, '#fef3c7', 2);
    P2.circ(c, x2, y2, 3, '#fef3c7', O, 1.5);
  }
  function inset(c, x, y, w, h, title, col, left) {
    P2.rf(c, x, y, w, h, 12, 'rgba(15,23,42,0.6)', col, 2);
    var tc = col === '#fbbf24' ? '#fbbf24' : '#fca5a5';
    if (left) P2.label(c, title, x + left, y + 17, 13, tc, 'left');
    else P2.label(c, title, x + w / 2, y + 17, 13, tc);
  }
  function speedLines(c, x, y, n, col) {
    c.save(); c.globalAlpha = 0.4;
    for (var i = 0; i < n; i++) {
      var len = 30 + (i * 37) % 40, yy = y + i * 14;
      P2.line(c, x - len - (i * 23) % 26, yy, x - (i * 23) % 26, yy, col || '#ffffff', 3);
    }
    c.restore();
  }
  // Túnel bajo tierra (capítulo 2)
  function tunnel(c, groundY) {
    c.save();
    c.globalAlpha = 0.18; c.strokeStyle = '#fde68a'; c.lineWidth = 10;
    c.beginPath(); c.arc(240, groundY + 40, 300, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    c.globalAlpha = 1;
    [128, 276].forEach(function (lx) {
      P2.line(c, lx, 64, lx, 80, '#1c1917', 3);
      c.globalAlpha = 0.25; P2.circ(c, lx, 86, 14, '#fbbf24', null); c.globalAlpha = 1;
      P2.circ(c, lx, 86, 5, '#fde68a', O, 2);
    });
    c.fillStyle = '#292018'; c.fillRect(0, groundY, 480, 480 - groundY);
    P2.line(c, 0, groundY, 480, groundY, '#78583a', 3);
    [[30, 8], [150, 6], [300, 9], [420, 7]].forEach(function (r) { P2.elli(c, r[0], groundY + 18, r[1] * 2, r[1], '#3b2b1d', null); });
    c.restore();
  }
  function water(c, surfY) {
    var g = c.createLinearGradient(0, surfY, 0, 480);
    g.addColorStop(0, '#0e7490'); g.addColorStop(1, '#0c1e4a');
    c.fillStyle = g; c.fillRect(0, surfY, 480, 480 - surfY);
    // rayos de luz
    c.save(); c.globalAlpha = 0.08; c.fillStyle = '#ffffff';
    [[60, 40], [200, 30], [360, 46]].forEach(function (r) {
      c.beginPath(); c.moveTo(r[0], surfY); c.lineTo(r[0] + r[1], surfY); c.lineTo(r[0] + r[1] - 60, 480); c.lineTo(r[0] - 60, 480); c.closePath(); c.fill();
    });
    c.restore();
    // olas
    c.save(); c.strokeStyle = '#a5f3fc'; c.lineWidth = 3;
    c.beginPath();
    for (var x = 0; x <= 480; x += 4) { var y = surfY + Math.sin(x * 0.06) * 2.5; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke(); c.restore();
    // fondo del río (rocas)
    c.fillStyle = '#1e293b'; c.fillRect(0, 462, 480, 18);
    [[40, 14], [170, 10], [330, 16], [450, 12]].forEach(function (r) { P2.elli(c, r[0], 464, r[1] * 1.8, r[1], '#334155', O, 2); });
  }
  function cloud(c, x, y, s) {
    c.save(); c.globalAlpha = 0.85;
    [[0, 0, 14], [14, -6, 17], [30, 0, 13]].forEach(function (b) { P2.circ(c, x + b[0] * s, y + b[1] * s, b[2] * s, '#f8fafc', null); });
    c.restore();
  }
  function splash(c, x, y) {
    // corona de agua y gotitas
    P2.poly(c, [[x - 30, y], [x - 26, y - 14], [x - 18, y - 6], [x - 12, y - 24], [x - 4, y - 10], [x + 4, y - 28],
      [x + 10, y - 10], [x + 18, y - 22], [x + 22, y - 6], [x + 30, y - 12], [x + 32, y]], '#cffafe', O, 2.5);
    [[-24, -26, 3], [-6, -38, 3.5], [14, -36, 3], [30, -24, 2.5]].forEach(function (d) {
      P2.circ(c, x + d[0], y + d[1], d[2], '#cffafe', O, 2);
    });
    P2.elli(c, x, y + 1, 36, 5, '#a5f3fc', O, 2);
  }

  // Nota de color (para que Juanjo no crea que hay un fallo): el vehículo va pintado
  // con los colores del héroe A; si elige al héroe B, se repinta con los suyos.
  // (x, y) = esquina de arriba a la izquierda de la tarjeta. Cada fila: texto + muestras.
  var NOTE_FONT = 'bold 12px system-ui, "Segoe UI", Arial, sans-serif';
  var NOTAS = {
    mikey: [
      { t: 'Colores de Mikey A', col: '#fdba74', sw: [MK.COAT, MK.ORANGE] },
      { t: 'Si eliges a Mikey B', col: '#c4b5fd', sw: ['#8b5cf6', '#fbbf24'] },
      { t: 'se pinta con sus colores', col: '#c4b5fd', sw: [] }
    ],
    peter: [
      { t: 'Colores de Peter A', col: '#fde047', sw: [PT.SUIT, PT.GREEN, PT.BLACK] },
      { t: 'Si eliges a Peter B', col: '#f9a8d4', sw: ['#db2777', '#f59e0b'] },
      { t: 'se pinta con sus colores', col: '#f9a8d4', sw: [] }
    ]
  };
  function colorNote(c, x, y, who) {
    var rows = NOTAS[who] || NOTAS.mikey, LH = 13.5, PAD = 7, R = 4.5, w = 0, i, k;
    c.save(); c.font = NOTE_FONT;
    var tw = rows.map(function (r) { return c.measureText(r.t).width; });
    c.restore();
    for (i = 0; i < rows.length; i++) w = Math.max(w, tw[i] + (rows[i].sw.length ? 6 + rows[i].sw.length * 11 : 0));
    w += PAD * 2;
    P2.rf(c, x, y, w, rows.length * LH + 9, 9, 'rgba(15,23,42,0.8)', '#fde68a', 2);
    for (i = 0; i < rows.length; i++) {
      var by = y + 4 + (i + 1) * LH - 2;
      P2.label(c, rows[i].t, x + PAD, by, 12, rows[i].col, 'left');
      for (k = 0; k < rows[i].sw.length; k++) P2.circ(c, x + PAD + tw[i] + 6 + R + k * 11, by - 4, R, rows[i].sw[k], O, 1.5);
    }
  }

  // Panel de robot-moto: arriba los dos modos ampliados; abajo, escala de juego + enemigo
  function sparks(c, x, y) {
    c.save();
    [[0, 0, 0.6], [12, -4, -0.3], [-10, -2, 1.1]].forEach(function (k) {
      c.save(); c.translate(x + k[0], y + k[1]); c.rotate(k[2]);
      P2.poly(c, [[0, -6], [2, -1], [7, 0], [2, 1.5], [0, 6], [-2, 1.5], [-7, 0], [-2, -1]], '#fb923c', O, 1.5);
      c.restore();
    });
    c.restore();
  }
  function motoPanel(v) {
    return function (c) {
      tunnel(c, 300);
      var B = v === 'B';
      // robot grande (izquierda) y moto grande (derecha)
      var RX = 120, RY = 292, RS = B ? 1.28 : 1.35;
      var MX = B ? 344 : 350, MY = 240, MS = B ? 1.25 : 1.45;
      speedLines(c, 268, 168, 4, '#fed7aa');
      if (B) { speedLines(c, 66, 254, 3, '#fed7aa'); sparks(c, 60, 292); }
      P2.fn.robotMoto(c, RX, RY, { variant: v, modo: 'robot', scale: RS });
      P2.fn.robotMoto(c, MX, MY, { variant: v, modo: 'moto', scale: MS });
      arrow(c, 170, 104, 212, 80, 254, 110, '#fdba74');
      P2.label(c, '¡se transforma!', 212, 80, 14, '#fed7aa');
      // rótulos
      var lx = B ? MX + 26 * MS : MX + 30 * MS, ly = B ? MY - 106 * MS : MY - 80 * MS;
      pointer(c, 404, 106, lx, ly);
      P2.label(c, '3 lanzadores en el manillar', 384, 92, 13, '#bfdbfe');
      pointer(c, 64, 116, RX + (B ? -12 : -6) * RS, RY - (B ? 108 : 92) * RS);
      P2.label(c, 'Mikey', 44, 96, 13, '#fef3c7'); P2.label(c, 'al volante', 44, 111, 13, '#fef3c7');
      if (B) {
        pointer(c, 446, 272, MX + 70 * MS, MY - 10 * MS);
        P2.label(c, 'ruedas huecas', 424, 286, 13, '#fed7aa');
        pointer(c, 206, 280, RX + 32 * RS, RY - 19 * RS);
        P2.label(c, '¡patina con', 248, 270, 13, '#fed7aa'); P2.label(c, 'sus ruedas-pie!', 248, 285, 13, '#fed7aa');
      } else {
        pointer(c, 436, 270, MX + 58 * MS, MY - 44 * MS);
        P2.label(c, 'ojo verde = faro', 412, 286, 13, '#86efac');
      }
      // banda inferior: escala de juego
      inset(c, 8, 300, 464, 174, 'Escala de juego', '#fbbf24', 160);
      P2.line(c, 18, 460, 352, 460, 'rgba(255,255,255,0.3)', 2);
      P2.director(c, 40, 460, { scale: 1 });
      P2.fn.robotMoto(c, 112, 460, { variant: v, modo: 'robot', scale: 1 });
      P2.fn.robotMoto(c, 272, 460, { variant: v, modo: 'moto', scale: 1 });
      P2.label(c, 'Director', 40, 472, 11 + 1, '#a5f3fc');
      // enemigo (antes de hackearlo)
      P2.rf(c, 364, 326, 100, 140, 10, 'rgba(15,23,42,0.75)', 'rgba(239,68,68,0.8)', 2);
      P2.label(c, 'Enemigo', 414, 344, 13, '#fca5a5');
      P2.fn.robotMoto(c, 412, 458, { variant: v, enemy: true, scale: B ? 0.7 : 0.78 });
      // flecha hasta la moto hackeada grande (su rueda trasera)
      var wx = MX + (B ? -46 : -46) * MS, wy = MY - (B ? 22 : 18) * MS;
      arrow(c, 372, 330, 330, 318, wx + 6, wy + (B ? 30 : 28), '#22c55e');
      P2.label(c, '¡hackeado!', 414, 316, 14, '#86efac');
      // aviso de colores (en el panel A, encima de la moto a escala de juego)
      if (!B) colorNote(c, 184, 324, 'mikey');
    };
  }

  // Panel del submarino-nave (sumergido abajo, volando arriba). El movimiento va de
  // izquierda a derecha: sumergido → sale por delante de su proa → vuela.
  function subPanel(v) {
    return function (c) {
      var SURF = 262, A = v === 'A';
      cloud(c, 180, 92, 1); cloud(c, 404, 214, 0.7);
      water(c, SURF);
      // enemigo
      inset(c, 10, 70, 128, 100, 'Enemigo', 'rgba(239,68,68,0.75)');
      P2.fn.submarinoNave(c, 76, 128, { variant: v, enemy: true, modo: 'nave', scale: 0.5, estela: false });
      arrow(c, 130, 188, 168, 208, 212, 194, '#22c55e');
      P2.label(c, '¡hackeado!', 72, 196, 16, '#86efac');
      // volando
      speedLines(c, 250, 122, 5, '#ffffff');
      P2.fn.submarinoNave(c, 342, 150, { variant: v, modo: 'nave', scale: 1.3 });
      P2.label(c, '¡volando!', 420, 84, 16, '#fef3c7');
      // bajo el agua (más pequeño, a la izquierda)
      var SX = 176, SY = 372, SS = 1.15;
      P2.fn.submarinoNave(c, SX, SY, { variant: v, modo: 'submarino', scale: SS });
      // despegue: de la proa, sube, salpica y vuela
      var x0 = A ? 262 : 272, y0 = 346;
      c.save(); c.setLineDash([7, 8]); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(312, 300, 318, 208); c.stroke();
      c.setLineDash([]); c.restore();
      splash(c, 310, SURF);
      P2.label(c, '¡sale y despega!', 404, 252, 14, '#fde68a');
      P2.label(c, 'bajo el agua', 70, 448, 15, '#a5f3fc');
      if (A) {
        pointer(c, 330, 368, SX + 74 * SS, SY + 6 * SS);
        P2.label(c, 'proa = escudo', 386, 368, 13, '#86efac');
      } else {
        pointer(c, 110, 424, SX - 76 * SS, SY + 16 * SS);
        P2.label(c, 'hélice = escudo', 172, 438, 13, '#86efac');
      }
      var px = SX + (A ? -4 : 14) * SS, py = SY - (A ? 37 : 33) * SS;
      pointer(c, 96, 304, px - 16 * SS, py);
      P2.label(c, 'Peter en la cabina', 82, 294, 13, '#fef3c7');
      // comparación a escala de juego (todo a la mitad)
      inset(c, 300, 386, 172, 86, 'A escala de juego (×½)', '#fbbf24');
      P2.line(c, 310, 462, 462, 462, 'rgba(255,255,255,0.3)', 2);
      if (P2.fn.peter) P2.fn.peter(c, 326, 462, { variant: 'A', scale: 0.5 });
      else P2.director(c, 326, 462, { scale: 0.5 });
      P2.fn.submarinoNave(c, 410, 446, { variant: v, modo: 'submarino', scale: 0.5, estela: false });
      // aviso de colores (en el panel A, en el cielo bajo «¡hackeado!»)
      if (A) colorNote(c, 12, 207, 'peter');
    };
  }

  P2.register({
    key: 'vehiculos',
    title: 'Los vehículos de Mikey y Peter',
    panels: [
      { title: 'Robot-moto A — robot y moto', subtitle: '«Rayo»: rueda a la espalda, moto deportiva superrápida',
        bg: ['#1f1b2e', '#4a3426'], render: motoPanel('A') },
      { title: 'Robot-moto B — robot y moto', subtitle: '«Bestia»: fortachón sobre ruedas, moto gorda que brilla',
        bg: ['#1c1a2b', '#3f2d22'], render: motoPanel('B') },
      { title: 'Submarino-nave A — bajo el agua y volando', subtitle: '«Cápsula-escudo»: la proa es el escudo de Peter',
        bg: ['#38bdf8', '#bae6fd'], render: subPanel('A') },
      { title: 'Submarino-nave B — bajo el agua y volando', subtitle: '«Delfín-cohete»: su hélice es el escudo de Peter',
        bg: ['#0ea5e9', '#bae6fd'], render: subPanel('B') }
    ]
  });
})();
