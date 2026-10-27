/* ------------------------------------------------------------------
   hero-dither.js — fondo de «trama tramada» (dithering) del hero.

   Es el shader Dithering de Paper Shaders (el mismo del preview:
   «move to steer · pick shape, matrix, ink»): dos tintas, una trama
   ordenada Bayer (2×2 / 4×4 / 8×8) o aleatoria, sobre siete formas
   animadas (simplex, warp, dots, wave, ripple, swirl, sphere).
   El ratón «dirige» la trama moviéndola (u_offsetX / u_offsetY).

   Ajustes sin compilar: js/hero-ajustes.js → dither:{ … }
   Lista completa en TOCAR-EL-HERO.md.
   ------------------------------------------------------------------ */

import { ShaderMount } from '../lib/paper-shaders/dist/shader-mount.js';
import {
	ditheringFragmentShader,
	DitheringShapes,
	DitheringTypes
} from '../lib/paper-shaders/dist/shaders/dithering.js';
import { getShaderColorFromString } from '../lib/paper-shaders/dist/get-shader-color-from-string.js';
import { prefiereMenosMovimiento } from './hero-fx.js';

export const OPCIONES_DITHER = {
	colorBack: '#020608',
	colorFront: '#26b5ce',
	shape: 'warp',
	type: '8x8',
	size: 2,
	speed: 1,
	steer: 0.15
};

function fallar(caja, motivo) {
	caja.dataset.estado = /webgl/i.test(motivo) ? 'sin-webgl' : 'fallo';
	caja.dataset.motivo = motivo;
	caja.classList.add('sin-shader');
	console.warn('Hero: no se pudo montar el dither ·', motivo);
}

/* El ratón dirige la trama: se guarda un objetivo y se persigue con
   suavizado (lerp) para que el movimiento no sea brusco. */
function conectarRaton(escucha, caja, mount, fuerza) {
	let objetivoX = 0;
	let objetivoY = 0;
	let actualX = 0;
	let actualY = 0;
	let rafId = null;

	const paso = () => {
		rafId = null;
		actualX += (objetivoX - actualX) * 0.08;
		actualY += (objetivoY - actualY) * 0.08;
		mount.setUniforms({ u_offsetX: actualX, u_offsetY: actualY });
		if (Math.abs(objetivoX - actualX) + Math.abs(objetivoY - actualY) > 0.0005) {
			rafId = requestAnimationFrame(paso);
		}
	};

	escucha.addEventListener('pointermove', (evento) => {
		const caja2 = caja.getBoundingClientRect();
		if (!caja2.width || !caja2.height) {
			return;
		}
		objetivoX = ((evento.clientX - caja2.left) / caja2.width - 0.5) * fuerza;
		objetivoY = ((evento.clientY - caja2.top) / caja2.height - 0.5) * fuerza;
		if (rafId === null) {
			rafId = requestAnimationFrame(paso);
		}
	});
}

/* Monta el dither dentro de la caja indicada.
   Devuelve una promesa con el ShaderMount (o null si no se pudo crear). */
export function montarDither(caja, preset) {
	return new Promise((resolve) => {
		if (!caja) {
			resolve(null);
			return;
		}

		/* Retoques del usuario (js/hero-ajustes.js) por encima de lo de arriba */
		const retoques = (window.HERO_AJUSTES && window.HERO_AJUSTES.dither) || {};
		const ajustes = Object.assign({}, OPCIONES_DITHER, preset || {}, retoques);

		try {
			const uniforms = {
				u_colorBack: getShaderColorFromString(ajustes.colorBack),
				u_colorFront: getShaderColorFromString(ajustes.colorFront),
				u_shape: DitheringShapes[ajustes.shape] || DitheringShapes.warp,
				u_type: DitheringTypes[ajustes.type] || DitheringTypes['8x8'],
				u_pxSize: ajustes.size,
				/* OJO: estos no pueden quedarse a cero. El shader divide
				   por u_scale y usa el origen para centrar la forma. */
				u_scale: 1,
				u_rotation: 0,
				u_offsetX: 0,
				u_offsetY: 0,
				u_originX: 0.5,
				u_originY: 0.5,
				u_worldWidth: 0,
				u_worldHeight: 0,
				u_fit: 0
			};

			const sinMovimiento = prefiereMenosMovimiento();
			const mount = new ShaderMount(
				caja,
				ditheringFragmentShader,
				uniforms,
				undefined,
				sinMovimiento ? 0 : ajustes.speed,
				0,
				2,
				1920 * 1080 * 2
			);
			caja.dataset.estado = 'ok';
			try {
				const dbg = mount.gl.getExtension('WEBGL_debug_renderer_info');
				caja.dataset.renderer = String(
					(dbg && mount.gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) ||
					mount.gl.getParameter(mount.gl.RENDERER) || ''
				);
			} catch (error) {
				caja.dataset.renderer = '';
			}

			if (!sinMovimiento && ajustes.steer > 0) {
				conectarRaton(caja.parentElement || caja, caja, mount, ajustes.steer);
			}

			resolve(mount);
		} catch (error) {
			fallar(caja, String((error && error.message) || error || 'error desconocido').slice(0, 160));
			resolve(null);
		}
	});
}
