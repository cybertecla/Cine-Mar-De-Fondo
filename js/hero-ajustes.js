/* ============================================================
   AJUSTES DEL HERO — edita este archivo y recarga el navegador (F5).
   No hay que compilar nada: los cambios entran solos.

   La explicación de cada número está en TOCAR-EL-HERO.md
   ============================================================ */
window.HERO_AJUSTES = {

	/* Retoques del titular (Blotter.ts channel-split: los canales R/G/B
	   se separan siguiendo al ratón). Los valores de abajo son los del
	   demo de webdev.teknium.io, tal cual.
	   Defaults: base:0.012 · radio:0.07 · velocidad:0.025 · paseo:true

	   titulo: {
	       efecto: true,      // false = titular sin efecto (texto plano)
	       base: 0.012,       // separación mínima (en fracción del lienzo)
	       radio: 0.07,       // cuánto crece según la distancia al centro
	       velocidad: 0.025,  // extra cuando el ratón va rápido
	       paseo: true        // si no mueves el ratón, se mueve solo
	   },                                                              */
	titulo: {
	},

	/* Retoques de la trama dither, encima de los valores por defecto.
	   Defaults: shape:'warp' · type:'8x8' · size:2 · steer:0.15 · speed:1

	   dither: {
	       shape: 'swirl',         // simplex | warp | dots | wave | ripple | swirl | sphere
	       type: '4x4',            // random | 2x2 | 4x4 | 8x8
	       size: 3,                // tamaño del grano en píxeles (1–8)
	       colorFront: '#8fe7f5',  // tinta de la trama (admite alfa: #rrggbbaa)
	       colorBack: '#020608',   // fondo entre tramas
	       steer: 0.15,            // cuánto dirige el ratón la trama (0 = nada)
	       speed: 1                // velocidad de la animación
	   },                                                              */
	dither: {
	}

};
