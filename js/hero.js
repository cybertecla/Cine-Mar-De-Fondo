/* ------------------------------------------------------------------
   hero.js — arranque del hero de la cartelera (index.html)

   1. Monta el fondo animado dentro de #hero-shader. Hay tres, y se
      elige en js/hero-ajustes.js (window.HERO_AJUSTES.fondo):
      · «dither» → trama tramada Bayer (Paper Shaders, el del preview)
      · «fluido» → tinta líquida interactiva (webgl-fluid)
      · «rayos»  → haces de luz god rays (Paper Shaders)
      Si el elegido falla, prueba los otros por orden; si ninguno
      arranca, queda el resplandor estático. La página nunca se queda
      en negro muerto.
   2. El titular (#arriba) lo dibuja Blotter.ts con ChannelSplitMaterial
      (js/hero-titulo.js): los canales R/G/B se separan y la separación
      sigue al ratón. Si WebGL o Blotter fallan, cae a la animación
      GSAP SplitText de siempre.
   3. El subtítulo se anima con GSAP (ScrambleText).

   Se empaqueta en js/hero.bundle.js (ver construir.sh o vigilar.sh).
   ------------------------------------------------------------------ */

import {
	PRESETS,
	montarShader,
	prefiereMenosMovimiento,
	animarTitulo,
	animarSubtitulo
} from './hero-fx.js';
import { montarFluido } from './hero-fluid.js';
import { montarDither } from './hero-dither.js';
import { montarTituloBlotter } from './hero-titulo.js';
import { montarEntrada } from './entrada.js';

const ajustes = window.HERO_AJUSTES || {};
const sinMovimiento = prefiereMenosMovimiento();
const cajaShader = document.getElementById('hero-shader');
const presetRayos = PRESETS[ajustes.preset] || PRESETS.abismo;

/* Cada fondo se monta con su función; el primero que arranque, gana. */
const montadores = {
	dither: () => montarDither(cajaShader),
	fluido: () => montarFluido(cajaShader),
	rayos: () => montarShader(cajaShader, presetRayos)
};
const ordenes = {
	dither: ['dither', 'fluido', 'rayos'],
	fluido: ['fluido', 'dither', 'rayos'],
	rayos: ['rayos', 'fluido', 'dither']
};

async function arrancarFondo() {
	if (!cajaShader) {
		return;
	}
	const orden = ordenes[ajustes.fondo || 'fluido'] || ordenes.fluido;
	for (const nombre of orden) {
		if (await montadores[nombre]()) {
			return;
		}
	}
	console.warn('Hero: sin WebGL; queda el resplandor estático ·', cajaShader.dataset.motivo || 'WebGL no disponible');
}

/* El titular: primero Blotter.ts (channel-split); si no, GSAP SplitText. */
async function arrancarTitulo() {
	const titulo = document.getElementById('arriba');
	if (!titulo || sinMovimiento) {
		return;
	}
	try {
		if (await montarTituloBlotter(titulo)) {
			return;
		}
	} catch (error) {
		console.warn('Hero: Blotter no arrancó; el titular va con GSAP.', error);
	}
	titulo.setAttribute('data-efecto', 'gsap');   /* para comprobarlo en el inspector */
	animarTitulo(titulo);
}

arrancarFondo();
arrancarTitulo();
montarEntrada();   /* la entrada de cine que se pela en la esquina */

if (!sinMovimiento) {
	const subtitulo = document.getElementById('hero-sub');
	if (subtitulo) {
		animarSubtitulo(subtitulo, 0.75);
	}

	if (window.gsap) {
		window.gsap.from('.hero-scroll', {
			autoAlpha: 0,
			y: 12,
			duration: 0.8,
			delay: 1.5,
			ease: 'power2.out'
		});
	}
}
