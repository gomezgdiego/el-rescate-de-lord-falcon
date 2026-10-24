// historia2.js — Historias de la PARTE 2 "La Gema Robada".
// Creado por Juanjo (Diseñador Jefe, 10 años) y Papá (Productor).
// Define: G.storyData (s2_*), G.flow2 y G.p2chapterNames (contrato §5 y §8).
// Solo DEFINE datos al cargar; no usa funciones de otros archivos.
// Narradores: 'juanjo' y 'papa' se turnan. Personajes: 'director', 'falcon',
// 'secuaz' (Dark Secuaz) y 'toros'. Fiel a los manuscritos de Juanjo.
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  G.storyData = G.storyData || {};
  Object.assign(G.storyData, {

    // ---- Capítulo 1: Ciudad atacada -----------------------------------------
    // La gema "apagada" seguía viva; un secuaz esclavo la coge y huye bajo tierra a la ciudad.
    's2_cap1': [
      { who: 'juanjo', text: 'Dark Toros había caído y la Gema del Poder se apagó... o eso creían todos.' },
      { who: 'papa', text: 'Pero la gema solo parecía apagada. Seguía viva: un brillo rojo latía muy despacito en el suelo.' },
      { who: 'juanjo', text: 'Entonces, del suelo asomó un enorme puño de acero: era un secuaz de Dark Toros, un esclavo obligado a obedecerle siempre.' },
      { who: 'papa', text: 'Agarró la gema y se hundió bajo tierra... ¡rumbo a la ciudad!' },
      { who: 'falcon', text: '¡Se ha llevado la gema! ¿Y ahora qué hacemos?' },
      { who: 'director', text: 'Lo que mejor sabemos hacer, amigo: recuperarla juntos. ¡Vamos tras él!' },
      { who: 'juanjo', text: 'Pero al llegar, la ciudad estaba llena de robots y drones atacando por todas partes. ¡Al rescate, héroes!' }
    ],

    // ---- Tras el capítulo 1: ¡la revelación! --------------------------------
    // Las torretas eran la cabeza de un robot gigante enterrado.
    's2_tras1': [
      { who: 'papa', text: 'Los robots de la ciudad hicieron ¡pop! uno tras otro. Pero, de repente, el suelo empezó a temblar.' },
      { who: 'juanjo', text: '¡CRAAAC! Las viejas torretas de Dark Toros se movieron todas a la vez...' },
      { who: 'papa', text: '¡No eran torretas normales! Eran la cabeza de un robot gigante enterrado bajo tierra. ¡Y se estaba levantando!' },
      { who: 'secuaz', text: '¡Soy DARK SECUAZ, el que se llevó la gema! Su poder me ha despertado del todo. ¡Nadie podrá pararme!' },
      { who: 'falcon', text: '¡Es enorme! Mira esos puños... y en su barriga brilla algo rojo.' },
      { who: 'secuaz', text: '¡Adiós, heroecitos! ¡Mis robots se encargarán de vosotros! ¡JA, JA, JA!' },
      { who: 'juanjo', text: 'Y Dark Secuaz salió corriendo, haciendo temblar la carretera con cada paso.' },
      { who: 'director', text: '¿Adónde vas tan deprisa? Mi reloj ya te ha localizado. ¡Va hacia la autopista!' }
    ],

    // ---- Capítulo 2: Carrera en robot ---------------------------------------
    // Un robot transformable les cierra el paso: hay que hackearlo.
    's2_cap2': [
      { who: 'papa', text: 'En la autopista, un robot gigantesco les cerró el paso. ¡Un robot transformable!' },
      { who: 'director', text: 'Ese robot se convierte en coche... Si lo hackeo, ¡podremos perseguir a Dark Secuaz con él!' },
      { who: 'juanjo', text: 'Bip, bip, ¡CLIC! El robot se plegó con un ¡clac, clac, clac! y se convirtió en un coche superrápido.' },
      { who: 'falcon', text: '¡Yo me subo al techo! Tú conduce, que yo me encargo de los robots con mis flechas.' },
      { who: 'director', text: '¡Agárrate fuerte, amigo! ¡Turbo a tope!' },
      { who: 'papa', text: '¡A toda velocidad tras Dark Secuaz! Esquiva los obstáculos y no pierdas su rastro.' }
    ],

    // ---- Tras el capítulo 2: la fábrica -------------------------------------
    's2_tras2': [
      { who: 'juanjo', text: 'Con un último acelerón, los héroes vieron a Dark Secuaz a lo lejos.' },
      { who: 'papa', text: 'Iba directo a un edificio enorme, con chimeneas que echaban humo y chispas.' },
      { who: 'director', text: 'Es una fábrica de robots. ¡Ahí construye a todo su ejército!' },
      { who: 'secuaz', text: '¡Bienvenidos a mi fábrica! Aquí dentro mis robots son súper fuertes. ¡No llegaréis ni a la mitad!' },
      { who: 'juanjo', text: 'Las enormes puertas se cerraron tras él con un ¡CLONC! metálico.' },
      { who: 'falcon', text: 'Pues habrá que entrar. ¡Juntos, como siempre!' }
    ],

    // ---- Capítulo 3: Fábrica de robots --------------------------------------
    's2_cap3': [
      { who: 'papa', text: 'Dentro de la fábrica todo se movía: cintas transportadoras, prensas gigantes y chispas por todas partes.' },
      { who: 'falcon', text: '¡Cuidado con las prensas! Cuando tiemblan y sale un «!», es que van a bajar.' },
      { who: 'director', text: 'Y esas mini-torretas con patitas son como hijas de Dark Secuaz. Si las hackeo, lucharán a nuestro lado.' },
      { who: 'juanjo', text: 'Robots araña en el techo, robots con escudo, boxeadores... ¡Robots súper fuertes, casi como su jefe!' },
      { who: 'director', text: 'Esta vez no hay naves, sino robots. Da igual: paso a paso, y siempre juntos.' },
      { who: 'papa', text: '¡Adelante, héroes! Dark Secuaz os espera al fondo de la fábrica.' }
    ],

    // ---- Tras el capítulo 3: el problema y el plan --------------------------
    // La gema está en un bolsillo blindado: no se puede hackear. Huye al cielo.
    's2_tras3': [
      { who: 'juanjo', text: 'Al fondo de la fábrica, por fin lo alcanzaron. La gema brillaba en su barriga, en un bolsillo con candado.' },
      { who: 'director', text: 'La hackearé como el martillo de Dark Toros... ¿Qué? ¡Mi reloj dice ERROR!' },
      { who: 'secuaz', text: '¡JA! Ya no está en un martillo. Mi bolsillo está blindado: ¡no se puede hackear!' },
      { who: 'papa', text: 'Y con la fuerza de sus puños, quitársela iba a ser casi imposible.' },
      { who: 'falcon', text: 'Si no podemos hackearla, habrá que quitársela. Pero... ¿cómo? Necesitamos un plan.' },
      { who: 'director', text: 'Tengo una idea, Falcon. Acércate, que te lo cuento en secreto...' },
      { who: 'secuaz', text: '¡Planead lo que queráis! ¡Os espero en mi fortaleza del cielo, donde nadie puede llegar!' },
      { who: 'juanjo', text: 'Dark Secuaz encendió sus propulsores y despegó hacia las nubes. ¡Tocaba volar!' }
    ],

    // ---- Capítulo 4: Vuelo al cielo -----------------------------------------
    // Falcon hackea un robot halcón y el Director se pone el jetpack.
    's2_cap4': [
      { who: 'papa', text: 'La fortaleza flotaba sobre las nubes. ¿Cómo iban a llegar hasta allí arriba?' },
      { who: 'falcon', text: '¡Mira, un robot halcón! Esta vez me toca a mí hackear. ¡Me enseñaste bien, amigo!' },
      { who: 'juanjo', text: 'Bip, bip, ¡CLIC! El mecha-halcón abrió sus alas de metal con un brillo verde. Falcon saltó a los mandos.' },
      { who: 'director', text: '¡Y yo me pongo el jetpack! Volaré a tu lado.' },
      { who: 'falcon', text: '¡Ojo con los drones! Avisan con un «!» antes de atacar.' },
      { who: 'papa', text: '¡Arriba, más arriba! ¡Rumbo a la fortaleza en el cielo!' }
    ],

    // ---- Tras el capítulo 4: llegada a la fortaleza -------------------------
    's2_tras4': [
      { who: 'juanjo', text: 'Entre nubes doradas apareció la fortaleza, con estandartes que llevaban los cuernos de Dark Toros.' },
      { who: 'papa', text: 'El mecha-halcón aterrizó con suavidad y el Director apagó su jetpack.' },
      { who: 'director', text: 'Ya estamos aquí. ¿Te acuerdas del plan?' },
      { who: 'falcon', text: '¡Como si lo hubiera inventado yo! Vamos a recuperar esa gema.' },
      { who: 'juanjo', text: 'Las puertas se abrieron despacio. Al fondo, un ojo rojo brillaba en la oscuridad.' }
    ],

    // ---- Capítulo 5: Fortaleza en el cielo (jefe final) ---------------------
    // El plan: uno distrae y el otro le quita la gema. Dark Secuaz se burla.
    's2_cap5': [
      { who: 'papa', text: 'En lo más alto de la fortaleza los esperaba Dark Secuaz, más grande y fuerte que nunca.' },
      { who: 'secuaz', text: '¿Otra vez vosotros? ¡Mis puños aplastan montañas! ¡Nunca me quitaréis la gema!' },
      { who: 'director', text: 'Falcon, es la hora. Como lo planeamos.' },
      { who: 'falcon', text: '¡Eh, cabeza de torreta! ¡A que no me pillas!' },
      { who: 'juanjo', text: 'Ese era el plan: Falcon lo distraería y el Director se acercaría a escondidas para quitarle la gema.' },
      { who: 'secuaz', text: '¡JA, JA, JA! ¿Ese es vuestro gran plan? ¡Qué plan más ridículo!' },
      { who: 'papa', text: 'Cuidado con sus puñetazos, héroes. ¡Que empiece la batalla final!' }
    ],

    // ---- El final -----------------------------------------------------------
    // Dark Secuaz queda libre y se hace amigo; la gema se destruye para siempre.
    // La última línea es LITERAL (pista de la Parte 3, sin nombrar a nadie).
    's2_final': [
      { who: 'papa', text: '¡PUM! El Titán Halcón ganó la pelea de gigantes y las torretas de Dark Secuaz se desarmaron una a una.' },
      { who: 'juanjo', text: 'Sin la gema y sin sus torretas, el ojo de Dark Secuaz pasó de rojo a verde. Y, por primera vez, sonrió.' },
      { who: 'secuaz', text: 'Gracias, amigos. Yo nunca quise ser malo: me obligaron a obedecer. ¡Por fin soy libre!' },
      { who: 'falcon', text: 'Entonces ya no eres nuestro enemigo. ¡Bienvenido al equipo, amigo!' },
      { who: 'papa', text: 'Juntos, los héroes y su nuevo amigo rompieron la gema: ¡PUM! Estalló en mil estrellas. Destruida para siempre.' },
      { who: 'juanjo', text: 'Esa noche hubo fiesta en la ciudad: fuegos artificiales, música... ¡y un robot gigante bailando!' },
      { who: 'papa', text: 'Porque con amistad y trabajo en equipo no hay nada imposible. Y así terminó la aventura...' },
      { who: 'juanjo', text: '…pero no todos sus robots se volvieron buenos.' }
    ]
  });

  // ---------------------------------------------------------------------------
  // G.flow2 — EXACTO según el contrato §5.
  // ---------------------------------------------------------------------------
  G.flow2 = {
    chapters: {
      1: { story: 's2_cap1', scene: 'levelP2_1', arsenal: 'armas' },
      2: { story: 's2_cap2', scene: 'levelP2_2', arsenal: 'vehiculo', vehicle: 'transformable' },
      3: { story: 's2_cap3', scene: 'levelP2_3', arsenal: 'armas' },
      4: { story: 's2_cap4', scene: 'levelP2_4', arsenal: 'vehiculo', vehicle: 'mechahalcon' },
      5: { story: 's2_cap5', scene: 'levelP2_5', arsenal: 'armas' }
    },
    after: {
      1: { story: 's2_tras1' },
      2: { story: 's2_tras2' },
      3: { story: 's2_tras3' },
      4: { story: 's2_tras4' },
      5: { story: 's2_final', next: 'creditsP2' }
    }
  };

  G.p2chapterNames = {
    1: 'Ciudad atacada',
    2: 'Carrera en robot',
    3: 'Fábrica de robots',
    4: 'Vuelo al cielo',
    5: 'Fortaleza en el cielo'
  };
})();
