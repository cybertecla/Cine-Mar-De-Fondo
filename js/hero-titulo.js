/* ------------------------------------------------------------------
   hero-titulo.js — el titular del hero dibujado con Blotter.ts.

   El <h1> «Cine Mar de Fondo» se queda en el documento (lectores de
   pantalla, selección, validación), pero cuando Blotter arranca su
   texto se vuelve transparente y encima se dibuja el mismo texto con
   ChannelSplitMaterial: los canales R/G/B se separan y la separación
   sigue al ratón.

   La configuración es la del demo de blotter.ts de webdev.teknium.io
   («Channel»), copiada de su código:
     · tipografía Anton 400 + relleno #f6f6f6 sobre la banda negra
     · padding proporcional al tamaño (0.3 / 0.2 / 0.14 / 0.14) y leading 1
     · uOffset = 0.012 + min(0.7, distancia al centro) * 0.07 + velocidad * 0.025
     · uRotation = ángulo del ratón respecto al centro (en grados)
     · si el ratón no se mueve 2.2 s, el «puntero» pasea solo (Lissajous)
     · ratio de píxeles limitado a 2

   - Devuelve false (sin tocar nada) si WebGL no está o algo falla;
     js/hero.js lo interpreta como «el titular va con GSAP».
   - Retoques sin compilar: js/hero-ajustes.js → titulo:{ … }.
   - Se empaqueta dentro de js/hero.bundle.js (sh construir.sh).
   ------------------------------------------------------------------ */

import { Blotter, Text, isWebGLSupported } from '../lib/blotter/index.js';
import { ChannelSplitMaterial } from '../lib/blotter/materials.js';
import { prefiereMenosMovimiento } from './hero-fx.js';

/* Valores del demo de teknium; se retocan desde js/hero-ajustes.js */
const OPCIONES_TITULO = {
	efecto: true,     // false = no usar Blotter (hero.js cae a GSAP)
	base: 0.012,      // separación mínima, en fracción del alto del lienzo
	radio: 0.07,      // cuánto crece con la distancia del ratón al centro
	velocidad: 0.025, // extra cuando el ratón va rápido
	paseo: true       // si no hay ratón, el efecto se mueve solo
};

/* Segundos sin ratón antes de que empiece el paseo automático */
const ESPERA_PASEO = 2.2;

/* Copia los ajustes de js/hero-ajustes.js sobre los de arriba */
function ajustesTitulo() {
	const retoques = (window.HERO_AJUSTES && window.HERO_AJUSTES.titulo) || {};
	return Object.assign({}, OPCIONES_TITULO, retoques);
}

/* Propiedades base del texto: las del CSS real del <h1> (familia,
   tamaño y grosor calculados en vivo, así siguen a los media queries). */
function propiedadesBase(titulo) {
	const estilo = window.getComputedStyle(titulo);
	return {
		family: estilo.fontFamily || 'Anton, Impact, sans-serif',
		weight: estilo.fontWeight || '400',
		size: Math.max(24, Math.round(parseFloat(estilo.fontSize) || 74))
	};
}

/* Espera a que la fuente del titular esté cargada: si se mide antes,
   el ancho sale con la fuente de reserva y el tamaño queda mal. */
async function cargarFuente(familia, frase) {
	if (!document.fonts || !document.fonts.load) {
		return;
	}
	const primera = (familia.split(',')[0] || 'Anton').replace(/["']/g, '').trim();
	try {
		await document.fonts.load('400 100px ' + primera, frase);
	} catch (error) {
		/* sin fuente propia se sigue con la de reserva */
	}
}

/* Recorta el tamaño si el titular no cabe a lo ancho (p. ej. en
   móviles, donde el CSS lo partiría en varias líneas): se mide el
   texto y se reduce la fuente lo justo para que quepa en una línea. */
function tamanoQueCabe(prop, titulo) {
	const frase = titulo.textContent.trim().toUpperCase();
	const disponible = Math.max(220, (titulo.getBoundingClientRect().width || window.innerWidth) - 24);
	const muestra = document.createElement('canvas').getContext('2d');
	if (!muestra) {
		return prop.size;
	}
	muestra.font = prop.weight + ' ' + prop.size + 'px ' + prop.family;
	const ancho = muestra.measureText(frase).width || 0;
	if (ancho > disponible) {
		return Math.max(22, Math.floor(prop.size * disponible / ancho));
	}
	return prop.size;
}

/* Propiedades completas del texto, con el padding proporcional del demo
   de teknium (0.3 arriba, 0.2 abajo, 0.14 a los lados).

   OJO: en Blotter, escribir texto.properties sustituye el objeto entero
   (no lo fusiona), así que siempre se pasa todo: si faltara el fill, el
   titular se volvería negro sobre la banda negra y desaparecería. */
function propiedadesTexto(titulo) {
	const prop = propiedadesBase(titulo);
	const size = tamanoQueCabe(prop, titulo);
	return {
		family: prop.family,
		weight: prop.weight,
		size: size,
		fill: '#f6f6f6',
		leading: 1,
		paddingTop: Math.round(size * 0.3),
		paddingRight: Math.round(size * 0.14),
		paddingBottom: Math.round(size * 0.2),
		paddingLeft: Math.round(size * 0.14)
	};
}

/* Monta el titular con Blotter. Devuelve true si quedó funcionando. */
export async function montarTituloBlotter(titulo) {
	if (!titulo || !titulo.textContent || prefiereMenosMovimiento()) {
		return false;
	}
	if (typeof isWebGLSupported === 'function' && !isWebGLSupported()) {
		return false;
	}

	const ajustes = ajustesTitulo();
	if (ajustes.efecto === false) {
		return false;
	}

	await cargarFuente(propiedadesBase(titulo).family, titulo.textContent.trim().toUpperCase());

	const propiedades = propiedadesTexto(titulo);
	const texto = new Text(titulo.textContent.trim().toUpperCase(), propiedades);
	const material = new ChannelSplitMaterial();
	material.uniforms.uOffset.value = ajustes.base;
	material.uniforms.uRotation.value = 0;
	if (material.uniforms.uBlendColor) {
		material.uniforms.uBlendColor.value = [0, 0, 0, 1];   /* la banda es negra */
	}

	const blotter = new Blotter(material, {
		texts: texto,
		ratio: Math.min(window.devicePixelRatio || 1, 2)
	});
	const alcance = blotter.forText(texto);
	if (!alcance) {
		throw new Error('Blotter no reconoció el texto');
	}
	alcance.appendTo(titulo);   /* el lienzo va dentro del propio <h1> */
	await blotter.ready;        /* atlas medido y listo */

	const lienzo = titulo.querySelector('canvas');
	if (!lienzo) {
		throw new Error('Blotter no dejó lienzo en el titular');
	}

	/* El texto real se vuelve transparente (sigue ahí, ocupando su
	   sitio, y los lectores de pantalla lo siguen leyendo); encima
	   aparece el lienzo con un fundido. */
	titulo.classList.add('blotter-activo');
	titulo.setAttribute('data-efecto', 'blotter');   /* para comprobarlo en el inspector */
	window.requestAnimationFrame(() => lienzo.classList.add('listo'));

	seguirRaton(material, titulo, lienzo, ajustes);
	reescalar(texto, titulo);

	return true;
}

/* El ratón manda, igual que en el demo de teknium: la distancia al
   centro del lienzo fija cuánto se separan los canales, la dirección
   fija el ángulo y la velocidad del puntero añade un extra. */
function seguirRaton(material, titulo, lienzo, ajustes) {
	const escucha = titulo.closest('.hero') || titulo;
	const uniformes = material.uniforms;
	const puntero = {
		x: 0.5, y: 0.5,       /* posición suavizada */
		tx: 0.5, ty: 0.5,     /* posición objetivo */
		v: 0,                 /* velocidad normalizada 0–1 */
		ultimoTiempo: 0,
		ultimoMovimiento: -Infinity
	};
	let reloj = 0;
	let anterior = performance.now();

	function mover(evento) {
		const caja = lienzo.getBoundingClientRect();
		if (!caja.width || !caja.height) {
			return;
		}
		const nx = (evento.clientX - caja.left) / caja.width;
		const ny = (evento.clientY - caja.top) / caja.height;
		const dt = Math.max(8, evento.timeStamp - (puntero.ultimoTiempo || 0));
		const rapidez = Math.hypot(nx - puntero.tx, ny - puntero.ty) / (dt / 1000);
		puntero.v = Math.min(1, puntero.v * 0.6 + Math.min(1, rapidez / 4) * 0.4);
		puntero.tx = nx;
		puntero.ty = ny;
		puntero.ultimoTiempo = evento.timeStamp;
		puntero.ultimoMovimiento = performance.now();
	}

	escucha.addEventListener('pointermove', mover, { passive: true });
	escucha.addEventListener('pointerdown', mover, { passive: true });

	function marco(ahora) {
		const dt = Math.min(0.05, (ahora - anterior) / 1000);
		anterior = ahora;
		reloj += dt;

		const sinRaton = ahora - puntero.ultimoMovimiento > ESPERA_PASEO * 1000;
		const paseando = sinRaton && ajustes.paseo !== false;

		if (paseando) {
			/* paseo automático del demo: dos senos desfasados */
			puntero.tx = 0.5 + Math.sin(reloj * 0.7) * 0.42;
			puntero.ty = 0.5 + Math.sin(reloj * 1.1) * 0.32;
			puntero.v += (0.18 + 0.12 * Math.sin(reloj * 0.9) - puntero.v) * dt * 2;
		} else {
			/* sin paseo (o con el ratón cerca) la velocidad se enfría */
			puntero.v *= Math.pow(0.25, dt);
		}

		const suavizado = Math.min(1, dt * 7);
		puntero.x += (puntero.tx - puntero.x) * suavizado;
		puntero.y += (puntero.ty - puntero.y) * suavizado;

		const nx = puntero.x - 0.5;
		const ny = puntero.y - 0.5;
		const distancia = Math.min(0.7, Math.hypot(nx, ny));

		uniformes.uOffset.value = ajustes.base + distancia * ajustes.radio + puntero.v * ajustes.velocidad;
		uniformes.uRotation.value = (Math.atan2(-ny, nx) * 180 / Math.PI + 360) % 360;

		window.requestAnimationFrame(marco);
	}
	window.requestAnimationFrame(marco);
}

/* Al cambiar el tamaño de la ventana se recalcula la fuente (como en
   el CSS) y se rehace el atlas; con un pequeño retardo para no rehacer
   el trabajo en cada píxel de arrastre. */
function reescalar(texto, titulo) {
	let temporizador = null;
	window.addEventListener('resize', () => {
		window.clearTimeout(temporizador);
		temporizador = window.setTimeout(() => {
			texto.properties = propiedadesTexto(titulo);
		}, 250);
	});
}
