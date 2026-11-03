/* ------------------------------------------------------------------
   hero.js — arranque del hero de la cartelera (index.html)

   Se empaqueta en js/hero.bundle.js.
   ------------------------------------------------------------------ */

import {
	prefiereMenosMovimiento,
	animarTitulo,
	animarSubtitulo
} from './hero-fx.js';
import { montarDither } from './hero-dither.js';
import { montarTituloBlotter } from './hero-titulo.js';
import { montarEntrada } from './entrada.js';

const sinMovimiento = prefiereMenosMovimiento();
const cajaShader = document.getElementById('hero-shader');

async function arrancarFondo() {
	if (!cajaShader) {
		return;
	}
	if (await montarDither(cajaShader)) {
		return;
	}
	if (cajaShader.dataset.estado === 'estatico') {
		return;
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
		/* Sin retardo: el descifrado espera dentro a que el cargador
		   retire su overlay y arranca entonces, a la vista. */
		animarSubtitulo(subtitulo, 0);
	}
}

/* Los dos botones del hero no se animan nunca: se ven desde el primer
   fotograma, sin fundido ni retardo. Su estilo vive en estilos.css. */
