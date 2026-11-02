/* ------------------------------------------------------------------
   hero-fx.js — efectos compartidos del hero de Cine Mar de Fondo

   · montarShader()    → fondo de rayos de luz con Paper Shaders
   · animarTitulo()    → subida de letras con GSAP SplitText
   · animarSubtitulo() → descifrado de texto con GSAP ScrambleText

   Lo usa index.html (js/hero.js).
   El punto de entrada se empaqueta con construir.sh.
   ------------------------------------------------------------------ */

import { ShaderMount } from '../lib/paper-shaders/dist/shader-mount.js';
import { godRaysFragmentShader } from '../lib/paper-shaders/dist/shaders/god-rays.js';
import { getShaderColorFromString } from '../lib/paper-shaders/dist/get-shader-color-from-string.js';
import { getShaderNoiseTexture } from '../lib/paper-shaders/dist/get-shader-noise-texture.js';

/* Paletas del shader «god rays» (rayos de luz, como un proyector).
   Solo se usa la activa en js/hero-ajustes.js. */
export const PRESETS = {
	/* «abismo»: teal profundo, el color del sitio, sala a oscuras */
	abismo: {
		colorBack: '#020608',
		colorBloom: '#0d5b73',
		colors: ['#0a4a63f2', '#1b87a3e6', '#26b5ceff', '#8fe7f5'],
		density: 0.32,
		spotty: 0.28,
		midSize: 0.22,
		midIntensity: 0.55,
		intensity: 1,
		bloom: 0.6,
		speed: 0.45
	},
	/* «estreno»: cálido, luz de proyector encendido */
	estreno: {
		colorBack: '#07070a',
		colorBloom: '#ff7a2f',
		colors: ['#ffb35ccc', '#ff5e3ae6', '#fff1d6', '#ff9a3c88'],
		density: 0.32,
		spotty: 0.28,
		midSize: 0.22,
		midIntensity: 0.55,
		intensity: 0.9,
		bloom: 0.55,
		speed: 0.6
	}
};

/* ¿El usuario ha pedido reducir animaciones en su sistema? */
export function prefiereMenosMovimiento() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Monta el shader de rayos dentro de la caja indicada.
   Devuelve una promesa con el ShaderMount (o null si no se pudo crear).
   Deja el resultado en caja.dataset.estado ('ok' | 'sin-webgl' | 'fallo'),
   caja.dataset.motivo y caja.dataset.renderer para poder diagnosticar. */
export function montarShader(caja, preset) {
	return new Promise((resolve) => {
		if (!caja) {
			resolve(null);
			return;
		}

		/* Retoques del usuario (js/hero-ajustes.js) por encima del preset */
		const retoques = (window.HERO_AJUSTES && window.HERO_AJUSTES.rayos) || {};
		preset = Object.assign({}, preset, retoques);

		/* La textura de ruido del shader se carga antes de montarlo
		   para que los rayos salgan bien desde el primer fotograma. */
		let ruido = null;
		try {
			ruido = getShaderNoiseTexture();
		} catch (error) {
			ruido = null;
		}

		const fallar = (error) => {
			const motivo = String((error && error.message) || error || 'error desconocido').slice(0, 160);
			caja.dataset.estado = /webgl/i.test(motivo) ? 'sin-webgl' : 'fallo';
			caja.dataset.motivo = motivo;
			caja.classList.add('sin-shader');
			console.warn('Hero: no se pudo crear el shader ·', motivo);
			resolve(null);
		};

		const montar = () => {
			try {
				const uniforms = {
					u_colorBack: getShaderColorFromString(preset.colorBack),
					u_colorBloom: getShaderColorFromString(preset.colorBloom),
					u_colors: preset.colors.map((color) => getShaderColorFromString(color)),
					u_colorsCount: preset.colors.length,
					u_density: preset.density,
					u_spotty: preset.spotty,
					u_midSize: preset.midSize,
					u_midIntensity: preset.midIntensity,
					u_intensity: preset.intensity,
					u_bloom: preset.bloom,
					u_noiseTexture: ruido
				};
				const velocidad = prefiereMenosMovimiento() ? 0 : preset.speed;
				const mount = new ShaderMount(caja, godRaysFragmentShader, uniforms, undefined, velocidad, 0, 2, 1920 * 1080 * 2);
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
				resolve(mount);
			} catch (error) {
				fallar(error);
			}
		};

		if (ruido && !ruido.complete) {
			ruido.addEventListener('load', montar, { once: true });
			ruido.addEventListener('error', montar, { once: true });
		} else {
			montar();
		}
	});
}

/* Busca GSAP y sus plugins (cargados como <script> clásicos). */
function buscarGsap() {
	const gsap = window.gsap;
	if (!gsap) {
		return null;
	}
	return {
		gsap: gsap,
		SplitText: window.SplitText || gsap.SplitText,
		ScrambleTextPlugin: window.ScrambleTextPlugin || gsap.ScrambleTextPlugin
	};
}

/* El título sube letra a letra desde detrás de una máscara (SplitText).
   Devuelve un objeto con .reproducir() para repetir la animación, o null. */
export function animarTitulo(elemento) {
	const lib = buscarGsap();
	if (!elemento || !lib || !lib.SplitText) {
		return null;
	}

	const gsap = lib.gsap;
	const SplitText = lib.SplitText;
	gsap.registerPlugin(SplitText);

	let reproducir = null;
	let primeraVez = true;

	try {
		SplitText.create(elemento, {
			type: 'lines,words,chars',
			mask: 'lines',
			autoSplit: true,
			onSplit: (instancia) => {
				reproducir = () => gsap.fromTo(
					instancia.chars,
					{ yPercent: 115, rotate: 8 },
					{ yPercent: 0, rotate: 0, duration: 0.9, ease: 'expo.out', stagger: 0.022 }
				);
				if (!primeraVez) {
					return null;
				}
				primeraVez = false;
				return reproducir();
			}
		});
	} catch (error) {
		console.warn('Hero: SplitText no disponible.', error);
		return null;
	}

	return {
		reproducir: () => {
			if (reproducir) {
				reproducir();
			}
		}
	};
}

/* El cargador (js/cargador.js) deja <html data-cargando="si"> mientras su
   overlay tapa la página y quita el atributo justo al retirarlo. El
   subtítulo espera a esa señal: si arrancara antes, el descifrado correría
   debajo del overlay y no lo vería nadie. Red de seguridad: 13 s. */
function cuandoSeVayaElCargador(listo) {
	const raiz = document.documentElement;
	if (
		!raiz ||
		!raiz.hasAttribute('data-cargando') ||
		typeof window.MutationObserver !== 'function'
	) {
		listo();
		return;
	}

	let observador = null;
	const red = window.setTimeout(() => {
		if (observador) {
			observador.disconnect();
			observador = null;
		}
		listo();
	}, 13000);

	observador = new window.MutationObserver(() => {
		if (raiz.hasAttribute('data-cargando')) {
			return;
		}
		observador.disconnect();
		observador = null;
		window.clearTimeout(red);
		listo();
	});
	observador.observe(raiz, { attributes: true, attributeFilter: ['data-cargando'] });
}

/* Texto del mismo largo con caracteres del juego del descifrado, para que
   el primer fotograma visible ya esté cifrado y no se lea el definitivo. */
function cifrarTexto(texto, chars) {
	let salida = '';
	for (let i = 0; i < texto.length; i += 1) {
		salida += texto.charAt(i) === ' ' ? ' ' : chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return salida;
}

/* El subtítulo se «descifra» con caracteres aleatorios (ScrambleText).
   Empieza en cuanto el cargador suelta la página (retardo 0) y el
   descifrado se reparte por igual en toda la duración: sin tramos
   muertos y sin fundido, visible desde el primer fotograma. */
export function animarSubtitulo(elemento, retardo) {
	const lib = buscarGsap();
	if (!elemento || !lib || !lib.ScrambleTextPlugin) {
		return;
	}

	const gsap = lib.gsap;
	gsap.registerPlugin(lib.ScrambleTextPlugin);

	const chars = 'AÁBCDEÉFGHIÍJKLMNOPQRSTUÚVWXYZ·—/';
	const textoFinal = elemento.textContent;

	/* Se oculta mientras carga: el fundido del overlay dura 450 ms y, sin
	   esto, el texto final se leería entero justo antes de volver a
	   cifrarse. Vuelve a verse en el primer fotograma ya cifrado. */
	gsap.set(elemento, { autoAlpha: 0 });

	cuandoSeVayaElCargador(() => {
		/* Se cifra a mano antes de mostrarlo: el primer fotograma visible
		   lleva caracteres aleatorios, nunca el texto final. */
		elemento.textContent = cifrarTexto(textoFinal, chars);
		gsap.to(elemento, {
			duration: 1.6,
			delay: retardo || 0,
			ease: 'none',
			scrambleText: {
				text: textoFinal,
				chars: chars,
				revealDelay: 0,
				speed: 0.35
			}
		});
		/* Sin fundido: aparece opaco en el mismo instante en que arranca. */
		gsap.set(elemento, { autoAlpha: 1 });
	});
}
