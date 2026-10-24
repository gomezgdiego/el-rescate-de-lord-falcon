// historia3.js — Historias de la PARTE 3 "We Are a Team".
// Creado por Juanjo (Diseñador Jefe, 10 años) y Papá (Productor).
// Dueño: historia-cine-a (contrato técnico de la Parte 3, §14 y §8.1).
// Define: G.storyData (s3_*), G.flow3 y G.p3chapterNames.
// Solo DEFINE datos al cargar; no llama a funciones de otros archivos.
// Narradores: 'juanjo' y 'papa' se turnan. Personajes: 'director', 'falcon',
// 'mikey', 'peter', 'secuaz' (Dark Secuaz, que ahora es BUENO) y 'robovill'.
// Fiel a la hoja de Juanjo del 13-oct-2026 (Archivo de Juanjo/LEEME.md) y al GDD:
// primero entrenan, "Tres meses después" están listos y DESPUÉS eligen sus armas.
window.G = window.G || {};

(function () {
  'use strict';
  var G = window.G;

  G.storyData = G.storyData || {};
  Object.assign(G.storyData, {

    // ---- Capítulo 1: Entrenamiento en el cielo ------------------------------
    // Los robots que no se volvieron buenos crean a Robovill. Llegan Mikey y Peter,
    // Falcon los entrena con la ayuda de Dark Secuaz, "Tres meses después" están
    // listos y eligen sus armas. El capítulo 1 es el EXAMEN FINAL.
    's3_cap1': [
      { who: 'juanjo', text: 'Después de que Dark Secuaz se volviera bueno, muchos de sus robots también se volvieron buenos... pero otros no.' },
      { who: 'papa', text: 'Los que no se volvieron buenos se fueron a la fábrica y crearon un robot más grande que Dark Secuaz. Se llamaba ROBOVILL.' },
      { who: 'juanjo', text: 'Robovill podía volar, ir bajo tierra y destruir cosas grandes. Tenía más armas de las que te imaginas... ¡y podía vencer a Dark Toros y a Dark Secuaz de un golpe!' },
      { who: 'papa', text: 'Pero Lord Falcon y el Director conocieron a Mikey Stark y a Peter Rogers, dos jóvenes que querían unirse a su equipo.' },
      { who: 'falcon', text: '¡Yo os entrenaré! Y Dark Secuaz nos ayudará con sus robots de práctica, aquí, en su fortaleza del cielo: ¡nuestra nueva base!' },
      { who: 'juanjo', text: 'Tres meses después, Mikey y Peter habían entrenado suficiente. Ya estaban listos, y se comprometieron a ayudar a derrotar a Robovill.' },
      { who: 'papa', text: 'Después, cada uno eligió su arma. Peter, un escudo. Mikey, 3 lanzadores (francotirador, pistola y metralleta) de bolas de energía azul.' },
      { who: 'secuaz', text: '¡En solo tres meses habéis aprendido muchísimo! Probad vuestras armas nuevas: ¡examen final en la base del cielo!' }
    ],

    // ---- Tras el capítulo 1: el dron espía y la gema copia ------------------
    's3_tras1': [
      { who: 'papa', text: 'El gran robot de práctica se sentó, mareado, entre una lluvia de confeti. ¡Examen superado!' },
      { who: 'secuaz', text: '¡Bravo, ya sois un equipo! Pero tengo noticias: he descubierto de dónde sacó Robovill su poder.' },
      { who: 'juanjo', text: '¿Os acordáis del dron espía que escaneó la Gema del Poder? Con ese escaneo, los robots malos fabricaron una gema copia.' },
      { who: 'papa', text: 'Una copia de la Gema del Poder hecha de máquina, con circuitos por dentro. ¡Y Robovill la llevaba en el pecho!' },
      { who: 'director', text: '¡Mi reloj detecta temblores bajo tierra! Robovill está excavando un túnel enorme... ¡hacia la ciudad!' },
      { who: 'mikey', text: '¡Pues vamos tras él! ¡Nuestra primera misión de verdad!' }
    ],

    // ---- Capítulo 2: Túneles bajo tierra ------------------------------------
    // El Director hackea dos robots de Robovill: la robot-moto y el submarino-nave.
    // El equipo se divide en dos parejas.
    's3_cap2': [
      { who: 'juanjo', text: 'A la entrada de los túneles los esperaban dos robots de Robovill: uno con ruedas y otro con aletas.' },
      { who: 'director', text: '¡Son robots que se transforman, como mi coche! Si los hackeo, ¡serán nuestros!' },
      { who: 'papa', text: 'Bip, bip, ¡CLIC! El primero se convirtió en una robot-moto superrápida... y el segundo, en un submarino-nave.' },
      { who: 'mikey', text: '¡La robot-moto es para mí! ¡Agárrate, que esto corre muchísimo!' },
      { who: 'peter', text: 'Y yo me quedo el submarino-nave: ¡va bajo el agua y hasta puede volar!' },
      { who: 'juanjo', text: 'El equipo se dividió en dos parejas: Mikey y el Director, por los túneles; Peter y Falcon, por el río subterráneo.' },
      { who: 'papa', text: '¡Arranca, Mikey! Robovill excava ahí delante. ¡A toda velocidad tras él!' }
    ],

    // ---- Tras el capítulo 2: la Gran Excavadora hace pop --------------------
    's3_tras2': [
      { who: 'papa', text: 'Con un ¡PUM! final de la fusión terrestre, la Gran Excavadora hizo ¡pop! en mil tuercas y engranajes.' },
      { who: 'mikey', text: '¡Lo hemos conseguido! ¡Juntos somos imparables!' },
      { who: 'director', text: '¡Robovill se escapó por otro túnel y nos dejó a su Gran Excavadora! Mira sus marcas de taladro: no iba a la ciudad... ¡vuelve a la fábrica!' },
      { who: 'juanjo', text: 'La vieja fábrica de robots de Dark Secuaz. Ahora era la guarida de Robovill.' },
      { who: 'secuaz', text: '¡Conozco esa fábrica como mis propios tornillos! Pero tened cuidado: ahora es más grande y peligrosa.' },
      { who: 'papa', text: 'Mientras tanto, Peter y Falcon seguían por el río subterráneo. ¿Llegarían a tiempo?' }
    ],

    // ---- Capítulo 3: Río subterráneo y vuelo --------------------------------
    's3_cap3': [
      { who: 'juanjo', text: 'Muy lejos de allí, bajo tierra, corría un río oscuro lleno de cristales brillantes.' },
      { who: 'peter', text: '¡Submarino-nave, al agua! Yo voy por debajo.' },
      { who: 'falcon', text: 'Y yo vuelo por encima con mi mecha-halcón. ¡Te cubro, Peter!' },
      { who: 'papa', text: 'Bajo el agua nadaban peces-robot y minas; por arriba zumbaban los drones de Robovill.' },
      { who: 'secuaz', text: 'Las minas estallan con un disparo. ¡Y al final del río, el submarino-nave puede despegar!' },
      { who: 'juanjo', text: '¡Adelante, Peter y Falcon! El río lleva hasta la salida de la cueva... ¡y hasta el cielo!' }
    ],

    // ---- Tras el capítulo 3: el equipo se reúne ante la fábrica oscura ------
    's3_tras3': [
      { who: 'papa', text: 'La fusión voladora de Peter y Falcon venció al Dron Nodriza, que hizo ¡pop! y cayó al río con un gran ¡CHOF!' },
      { who: 'peter', text: '¡Lo hicimos, Falcon! ¡Mi escudo y tus plumas forman un gran equipo!' },
      { who: 'juanjo', text: 'Volaron hasta la fábrica, y allí los esperaban Mikey y el Director. ¡El equipo volvía a estar junto!' },
      { who: 'director', text: '¡Bien hecho, chicos! Ahí está: la fábrica oscura, la guarida de Robovill.' },
      { who: 'papa', text: 'Era la misma fábrica de robots de antes... pero ahora más grande, más oscura y mucho más peligrosa.' },
      { who: 'falcon', text: 'Juntos hemos llegado hasta aquí. ¡Y juntos entraremos!' }
    ],

    // ---- Capítulo 4: La fábrica oscura ---------------------------------------
    's3_cap4': [
      { who: 'juanjo', text: 'Dentro de la fábrica oscura había puertas cerradas, láseres, dianas y palancas por todas partes.' },
      { who: 'secuaz', text: 'Os ayudaré: conozco a estos robots y sus puntos débiles. ¡Escuchad mis pistas!' },
      { who: 'director', text: 'Las consolas son cosa mía: ¡yo las hackeo!' },
      { who: 'mikey', text: 'Las dianas lejanas, para mi francotirador. ¡Ni un fallo!' },
      { who: 'peter', text: 'Los láseres, para mi escudo. ¡Y Falcon salta a las palancas más altas!' },
      { who: 'papa', text: 'Y al fondo, los guardianes de Robovill vigilaban la puerta. ¡A trabajar en equipo!' }
    ],

    // ---- Tras el capítulo 4: Robovill espera en el corazón de la fábrica ----
    's3_tras4': [
      { who: 'papa', text: 'El gran Guardián se tambaleó, se le apagó el escudo e hizo ¡pop!, con todos sus guardias.' },
      { who: 'falcon', text: 'Peter paró el puño, el Director hackeó el escudo, Mikey le dio a la batería... ¡y yo salté a su botón!' },
      { who: 'juanjo', text: 'Detrás de los guardianes había una puerta enorme. Al otro lado, algo gigante respiraba: ¡FSSSS!' },
      { who: 'secuaz', text: 'Es el corazón de la fábrica. Robovill os espera ahí dentro...' },
      { who: 'papa', text: 'Los cuatro héroes se miraron y asintieron. Había llegado la hora.' }
    ],

    // ---- Capítulo 5: Robovill ------------------------------------------------
    // Robovill presume de sus armas; el plan del equipo; el lema.
    's3_cap5': [
      { who: 'juanjo', text: 'En el corazón de la fábrica, bajo un techo enorme y roto, los esperaba Robovill.' },
      { who: 'robovill', text: '¡JA, JA! ¿CUATRO HEROECITOS? ¡Tengo más armas de las que te imaginas: martillo, sierra, cañón y TALADRO!' },
      { who: 'papa', text: 'La gema copia brillaba en su pecho. Su taladro giraba y sus alas de metal se abrían con un ¡CLANC!' },
      { who: 'director', text: 'Este es el plan: Peter protege, Mikey dispara a la gema, yo hackeo y Falcon ataca.' },
      { who: 'peter', text: '¡De mi escudo no pasa nadie!' },
      { who: 'mikey', text: '¡Francotirador listo! Apunto a la gema copia.' },
      { who: 'falcon', text: '¡Todos juntos! ¡WE ARE A TEAM!' }
    ],

    // ---- El final -------------------------------------------------------------
    // La fusión final gana, la gema copia se agrieta y se apaga, Robovill SE ESCAPA
    // (no se destruye). La última línea es LITERAL (pista de la Parte 4).
    's3_final': [
      { who: 'papa', text: 'Robovill se hizo gigante... ¡pero el equipo se unió en la fusión final: los cuatro vehículos y Dark Secuaz, en un mismo robot!' },
      { who: 'juanjo', text: '¡ATAQUE EN EQUIPO! Un rayo de todos los colores dio de lleno en la gema copia.' },
      { who: 'papa', text: 'La gema copia se agrietó... y se apagó. Robovill cayó de rodillas.' },
      { who: 'robovill', text: '¡NOOO! ¡ESTO NO ACABA AQUÍ, HÉROES!' },
      { who: 'juanjo', text: 'Abrió sus alas de metal y salió volando por el agujero del techo, cada vez más lejos...' },
      { who: 'falcon', text: 'Mikey, Peter: ya sois de nuestro equipo. ¡Para siempre!' },
      { who: 'papa', text: 'Esa noche hubo fiesta en la base del cielo. Y todos gritaron a la vez: ¡WE ARE A TEAM!' },
      { who: 'juanjo', text: '…pero Robovill se escapó. ¿Volverá algún día?' }
    ]
  });

  // ---------------------------------------------------------------------------
  // G.flow3 — EXACTO según el contrato §8.1.
  // ---------------------------------------------------------------------------
  G.flow3 = {
    chapters: {
      1: { story: 's3_cap1', scene: 'levelP3_1', prep: 'equipo' },
      2: { story: 's3_cap2', scene: 'levelP3_2', prep: 'moto' },
      3: { story: 's3_cap3', scene: 'levelP3_3', prep: 'submarino' },
      4: { story: 's3_cap4', scene: 'levelP3_4', prep: 'equipo' },
      5: { story: 's3_cap5', scene: 'levelP3_5', prep: 'equipo' }
    },
    after: {
      1: { story: 's3_tras1' },
      2: { story: 's3_tras2' },
      3: { story: 's3_tras3' },
      4: { story: 's3_tras4' },
      5: { story: 's3_final', next: 'creditsP3' }
    }
  };

  G.p3chapterNames = {
    1: 'Entrenamiento en el cielo',
    2: 'Túneles bajo tierra',
    3: 'Río subterráneo y vuelo',
    4: 'La fábrica oscura',
    5: 'Robovill'
  };
})();
