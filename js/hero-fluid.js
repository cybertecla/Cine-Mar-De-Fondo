/* ------------------------------------------------------------------
   hero-fluid.js — fondo de «tinta líquida» del hero (efecto del preview)

   Es la simulación de fluidos de PavelDoGreat (Navier-Stokes en GPU,
   con brillo y rayos de sol) empaquetada como webgl-fluid: una llamada
   y a correr. La tinta se remueve al pasar el ratón y además suelta
   chorros automáticos cada pocos segundos (AUTO + INTERVAL), así el
   hero está vivo sin tocar nada.

   Los valores se pueden retocar SIN compilar desde js/hero-ajustes.js
   (window.HERO_AJUSTES.fluido). Lista completa en TOCAR-EL-HERO.md.
   ------------------------------------------------------------------ */

import WebGLFluid from '../lib/webgl-fluid/webgl-fluid.mjs';
import { prefiereMenosMovimiento } from './hero-fx.js';

export const OPCIONES_FLUIDO = {
	TRIGGER: 'hover',
	IMMEDIATE: true,
	AUTO: true,
	INTERVAL: 2600,
	DENSITY_DISSIPATION: 0.9,
	CURL: 38,
	SPLAT_RADIUS: 0.28,
	BACK_COLOR: { r: 2, g: 6, b: 8 },
	BLOOM: true,
	SUNRAYS: true
};

function fallar(caja, motivo) {
	caja.dataset.estado = /webgl/i.test(motivo) ? 'sin-webgl' : 'fallo';
	caja.dataset.motivo = motivo;
	caja.classList.add('sin-shader');
	console.warn('Hero: no se pudo montar la tinta líquida ·', motivo);
}

/* Monta la tinta dentro de la caja indicada.
   Devuelve una promesa con el canvas (o null si no se pudo crear). */
export function montarFluido(caja, opciones) {
	return new Promise((resolve) => {
		if (!caja) {
			resolve(null);
			return;
		}

		const hayWebGL = (() => {
			try {
				const prueba = document.createElement('canvas');
				return !!(prueba.getContext('webgl2') || prueba.getContext('webgl'));
			} catch (error) {
				return false;
			}
		})();
		if (!hayWebGL) {
			fallar(caja, 'este navegador no tiene WebGL');
			resolve(null);
			return;
		}

		/* Retoques del usuario (js/hero-ajustes.js) por encima de lo de arriba */
		const retoques = (window.HERO_AJUSTES && window.HERO_AJUSTES.fluido) || {};
		const ajustes = Object.assign({}, OPCIONES_FLUIDO, opciones || {}, retoques);
		if (prefiereMenosMovimiento()) {
			ajustes.AUTO = false;
		}

		const canvas = document.createElement('canvas');
		canvas.setAttribute('aria-hidden', 'true');
		canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1;';
		caja.appendChild(canvas);

		try {
			WebGLFluid(canvas, ajustes);
			caja.dataset.estado = 'ok';
			resolve(canvas);
		} catch (error) {
			fallar(caja, String((error && error.message) || error || 'error desconocido').slice(0, 160));
			resolve(null);
		}
	});
}
