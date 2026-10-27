/* ------------------------------------------------------------------
   hero-lab.js — página de pruebas del hero (hero-lab.html)

   Banner superior: ¿hay WebGL en este navegador? (resumen de todo).
   Sección 1: título y subtítulo animados con GSAP (SplitText + ScrambleText).
   Sección 2: el mismo título dibujado con Blotter.ts (ChannelSplitMaterial,
              efecto de separación de canales que sigue al cursor).

   Cada sección va aislada en su propio try/catch: si una falla, la otra
   sigue funcionando. Cada sección informa de su estado en pantalla
   («Shader ✓ / ✗», «GSAP ✓ / ✗», «Blotter ✓ / ✗») para poder ver
   qué funciona sin abrir la consola.

   Esta página no forma parte de la entrega: sirve para comparar.
   Se empaqueta en js/hero-lab.bundle.js (ver construir.sh).
   ------------------------------------------------------------------ */

import { PRESETS, montarShader, animarTitulo, animarSubtitulo } from './hero-fx.js';
import { Blotter, Text, isWebGLSupported } from '../lib/blotter/index.js';
import { ChannelSplitMaterial } from '../lib/blotter/materials.js';

/* Piezas de estado en pantalla */
function pieza(id, texto, fallo) {
	const el = document.getElementById(id);
	if (el) {
		el.textContent = texto;
		el.style.color = fallo ? '#ffb35c' : '#8fe7f5';
	}
}

/* ---------- Banner: ¿WebGL en este navegador? ---------- */

(() => {
	let dato = '';
	let ok = false;
	try {
		const prueba = document.createElement('canvas');
		const gl = prueba.getContext('webgl2') || prueba.getContext('webgl');
		ok = !!gl;
		if (gl) {
			const dbg = gl.getExtension('WEBGL_debug_renderer_info');
			dato = String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '');
		}
	} catch (error) {
		dato = String((error && error.message) || error);
	}
	pieza(
		'lab-webgl',
		ok
			? 'WebGL ✓' + (dato ? ' · ' + dato : '')
			: 'WebGL ✗ — sin WebGL no se pueden ver ni el shader ni la tinta' + (dato ? ' · ' + dato : ''),
		!ok
	);
})();

function estadoShader(caja, id, preset) {
	montarShader(caja, preset).then((mount) => {
		const info = caja ? caja.dataset : {};
		if (mount) {
			pieza(id, 'Shader ✓' + (info.renderer ? ' (' + info.renderer + ')' : ''), false);
		} else {
			pieza(id, 'Shader ✗ · ' + (info.motivo || 'WebGL no disponible'), true);
		}
	});
}

/* ---------- Sección 1 · GSAP ---------- */

estadoShader(document.getElementById('lab-shader-gsap'), 'lab-estado-1-shader', PRESETS.abismo);

try {
	const tituloGsap = document.getElementById('lab-gsap-titulo');
	const animacionTitulo = animarTitulo(tituloGsap);
	pieza('lab-estado-1-gsap', animacionTitulo ? 'GSAP ✓' : 'GSAP ✗ (SplitText no cargó)', !animacionTitulo);

	animarSubtitulo(document.getElementById('lab-gsap-sub'), 1.1);

	const botonRepetir = document.getElementById('lab-repetir');
	if (botonRepetir && animacionTitulo) {
		botonRepetir.addEventListener('click', () => {
			animacionTitulo.reproducir();
		});
	}
} catch (error) {
	console.warn('Hero lab · sección GSAP:', error);
	pieza('lab-estado-1-gsap', 'GSAP ✗ · ' + error.message, true);
}

/* ---------- Sección 2 · Blotter.ts ---------- */

const montaje = document.getElementById('lab-blotter-mount');
const escena = document.getElementById('lab-blotter-escena');
estadoShader(document.getElementById('lab-shader-blotter'), 'lab-estado-2-shader', PRESETS.estreno);

function tamanoFuente() {
	return Math.max(34, Math.min(92, Math.round(window.innerWidth * 0.075)));
}

async function montarBlotter() {
	if (typeof isWebGLSupported === 'function' && !isWebGLSupported()) {
		throw new Error('este navegador no tiene WebGL');
	}

	const texto = new Text('Cine Mar de Fondo', {
		family: 'Arial, Helvetica, sans-serif',
		size: tamanoFuente(),
		weight: 700,
		fill: '#ffffff',
		padding: 30
	});

	const material = new ChannelSplitMaterial();
	const blotter = new Blotter(material, { texts: texto });

	const alcance = blotter.forText(texto);
	if (alcance && montaje) {
		alcance.appendTo(montaje);
	}

	await blotter.ready;

	/* El efecto sigue al ratón: uOffset según la distancia al centro
	   y uRotation según el ángulo del cursor. */
	const uniformes = material.uniforms;
	if (escena && uniformes && uniformes.uOffset && uniformes.uRotation) {
		escena.addEventListener('pointermove', (evento) => {
			const caja = escena.getBoundingClientRect();
			const x = (evento.clientX - caja.left) / caja.width - 0.5;
			const y = (evento.clientY - caja.top) / caja.height - 0.5;
			const distancia = Math.min(1, Math.sqrt(x * x + y * y) * 2);
			const angulo = Math.atan2(y, x) * (180 / Math.PI) + 180;
			uniformes.uOffset.value = 0.02 + distancia * 0.16;
			uniformes.uRotation.value = angulo;
		});
	}

	/* Al redimensionar la ventana, el texto de Blotter se reconstruye
	   con el nuevo tamaño de fuente (con un pequeño retardo). */
	let temporizador = null;
	window.addEventListener('resize', () => {
		clearTimeout(temporizador);
		temporizador = setTimeout(() => {
			/* OJO: en Blotter, escribir properties SUSTITUYE el objeto
			   entero (no lo fusiona); hay que repetir aquí todos los
			   valores o el texto vuelve a negro/sin padding. */
			texto.properties = {
				family: 'Arial, Helvetica, sans-serif',
				size: tamanoFuente(),
				weight: 700,
				fill: '#ffffff',
				padding: 30
			};
		}, 250);
	});
}

montarBlotter().then(() => {
	pieza('lab-estado-2-blotter', 'Blotter ✓', false);
}).catch((error) => {
	console.warn('Hero lab: Blotter no arrancó.', error);
	pieza('lab-estado-2-blotter', 'Blotter ✗ · ' + error.message, true);
	if (montaje) {
		montaje.textContent = 'Blotter no arrancó: ' + error.message;
		montaje.style.cssText = 'color:#ffb35c;font-size:0.9rem;letter-spacing:0.05em;padding:1rem 0;';
	}
});
