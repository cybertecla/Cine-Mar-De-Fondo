/* ------------------------------------------------------------------
   entrada.js — la entrada de cine que se pela en la esquina del hero

   Peel.js (lib/peel/peel.js, MIT) recorta la capa de arriba con un
   clip-path, como si se levantara papel, y voltea la esquina.

   Cómo reacciona:
     · Arrastrar: el doblez sigue al puntero desde el primer píxel,
       en cualquier punto de la entrada (ratón o dedo).
     · Se puede pelar ENTERA: el doblez llega a la esquina opuesta y la
       capa de arriba se desvanece, así que no queda una esquinita
       pegada encima del horario.
     · Al soltar a medias se va sola al extremo más cercano: doblada
       o pelada del todo.
     · Clic seco: pela del todo o vuelve al doblez. Con un clic basta:
       la animación sale siempre de donde está el papel, nunca del
       punto donde has hecho clic (si saliera de ahí, el primer
       fotograma daba un salto y parecía que no respondía).
     · Pasar el ratón por encima abre un poco la esquinita.

   Ojo, dos trampas de la librería, ya sorteadas aquí:

   1) peel.getAmountClipped() NO devuelve lo que se ha pelado, sino el
      área de la capa de arriba que TODAVÍA QUEDA (1 = entera, 0 =
      pelada del todo). El nombre engaña. Por eso el estado se mide con
      progreso(), a partir de la posición del doblez.

   2) NO se usa peel.handleDrag() porque calcula las coordenadas con
      offsetLeft/offsetTop, y esta entrada está anclada arriba a la
      derecha: saldrían desplazadas. Aquí se miden con
      getBoundingClientRect(), que siempre acierta.

   Si el navegador no soporta clip-path, o Peel.js no está, la entrada
   se queda entera y quieta: no se pierde nada de información.
   ------------------------------------------------------------------ */

/* Píxeles de doblez en reposo (la esquinita que dice «esto se pela»). */
const DOBLEZ = 34;

/* Cuánto se abre esa esquinita al pasar el ratón por encima. */
const DOBLEZ_ENCIMA = 54;

/* Movimiento (px) para que cuente como arrastre y no como clic. */
const UMBRAL = 5;

/* Dónde queda el doblez cuando está pelada del todo, en tanto por uno:
   la esquina opuesta. Ahí no queda papel. */
const ABIERTA_X = 0;
const ABIERTA_Y = 1;

/* A partir de qué tanto por uno de pelado se enseña el horario de debajo. */
const ASOMA = 0.12;

/* Cuánto pelo se ve cubriendo el horario antes de desvanecerse. */
const FUNDIDO = 0.10;

function sinMovimiento() {
	return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* En pantallas táctiles no hay ratón: nada de abrir la esquina al pasar. */
function conRaton() {
	return !window.matchMedia || window.matchMedia('(hover: hover)').matches;
}

export function montarEntrada() {
	const caja = document.getElementById('entrada');
	if (!caja) {
		return false;
	}
	if (!window.Peel || !window.Peel.supported) {
		caja.className += ' entrada-quieta';   /* se ve entera, sin doblar */
		return false;
	}

	const peel = new window.Peel(caja, {
		corner: window.Peel.Corners.TOP_RIGHT,
		/* La capa es un rectángulo y la entrada no: una sombra de caja
		   delataría el rectángulo, así que solo sombras «de dentro». */
		topShadow: false,
		backShadow: true,
		backShadowSize: 0.05,
		backReflection: true,
		backReflectionAlpha: 0.1,
		bottomShadow: true,
		bottomShadowSize: 2.2,
		bottomShadowDarkAlpha: 0.6
	});

	/* Dónde está el doblez AHORA: la fuente de verdad para animar. */
	const posicion = { x: 0, y: 0 };
	let tween = null;
	let arrastrando = false;
	let movido = false;

	function doblada() {
		return { x: caja.offsetWidth - DOBLEZ, y: DOBLEZ };
	}

	function encima() {
		return { x: caja.offsetWidth - DOBLEZ_ENCIMA, y: DOBLEZ_ENCIMA };
	}

	function abierta() {
		return { x: caja.offsetWidth * ABIERTA_X, y: caja.offsetHeight * ABIERTA_Y };
	}

	/* Cuánto se ha pelado: 0 = doblada, 1 = pelada del todo.
	   Se mide con la distancia recorrida por el doblez hasta la esquina
	   opuesta, que crece de forma monótona al arrastrar. */
	function progreso() {
		const desde = doblada();
		const hasta = abierta();
		const largo = Math.hypot(hasta.x - desde.x, hasta.y - desde.y);
		if (!largo) {
			return 1;
		}
		const andado = Math.hypot(posicion.x - desde.x, posicion.y - desde.y);
		return Math.max(0, Math.min(1, andado / largo));
	}

	/* El marco de arriba es translúcido: el horario de debajo solo se enseña
	   cuando ya hay papel levantado, o se leerían los dos a la vez. */
	function sincronizar() {
		if (progreso() > ASOMA) {
			caja.classList.add('entrada-abierta');
		} else {
			caja.classList.remove('entrada-abierta');
		}
	}

	function poner(x, y) {
		posicion.x = x;
		posicion.y = y;
		peel.setPeelPosition(x, y);
		sincronizar();
		/* En el último tramo la capa de arriba se va desvaneciendo: así la
		   entrada no se queda como una esquinita encima del horario. */
		const visto = Math.min(1, Math.max(0, (1 - progreso()) / FUNDIDO));
		caja.style.setProperty('--entrada-visible', visto.toFixed(3));
	}

	function parar() {
		if (tween) {
			tween.kill();
			tween = null;
		}
	}

	/* Animación hacia un destino, saliendo de donde está el papel de verdad. */
	function irA(destino, duracion) {
		parar();
		if (!window.gsap || sinMovimiento()) {
			poner(destino.x, destino.y);
			return;
		}
		const punto = { x: posicion.x, y: posicion.y };
		let acabada = false;
		const animacion = window.gsap.to(punto, {
			x: destino.x,
			y: destino.y,
			duration: duracion,
			ease: 'power2.out',
			onUpdate: function () {
				poner(punto.x, punto.y);
			},
			onComplete: function () {
				acabada = true;
				tween = null;
			}
		});
		/* Si GSAP la ha terminado en el acto (duración 0), no la dejamos
		   apuntada como si siguiera en marcha. */
		tween = acabada ? null : animacion;
	}

	/* Clic seco: pela del todo o vuelve al doblez. */
	function alternar() {
		if (progreso() > 0.5) {
			irA(doblada(), 0.5);
		} else {
			irA(abierta(), 0.55);
		}
	}

	/* Posición del puntero dentro de la entrada, en píxeles de la entrada. */
	function local(evt) {
		const cajaRect = caja.getBoundingClientRect();
		return {
			x: evt.clientX - cajaRect.left,
			y: evt.clientY - cajaRect.top
		};
	}

	function alBajar(evt) {
		if (evt.pointerType === 'mouse' && evt.button !== 0) {
			return;
		}
		parar();
		arrastrando = true;
		movido = false;
		if (caja.setPointerCapture) {
			caja.setPointerCapture(evt.pointerId);
		}
		if (evt.cancelable) {
			evt.preventDefault();      /* sin seleccionar texto al arrastrar */
		}
	}

	function alMover(evt) {
		if (!arrastrando) {
			return;
		}
		const punto = local(evt);
		if (Math.abs(punto.x - posicion.x) > UMBRAL || Math.abs(punto.y - posicion.y) > UMBRAL) {
			movido = true;
		}
		if (evt.cancelable) {
			evt.preventDefault();
		}
		poner(punto.x, punto.y);
	}

	function alSoltar(evt) {
		if (!arrastrando) {
			return;
		}
		arrastrando = false;
		if (caja.releasePointerCapture && evt.pointerId !== undefined) {
			try {
				caja.releasePointerCapture(evt.pointerId);
			} catch (error) {
				/* el puntero ya se había ido: da igual */
			}
		}
		if (!movido) {
			alternar();
			return;
		}
		/* Soltada a medias: se va siempre al extremo más cercano, para que no
		   se quede a medio abrir. */
		if (progreso() < 0.5) {
			irA(doblada(), 0.35);
		} else {
			irA(abierta(), 0.5);
		}
	}

	/* Al pasar el ratón, la esquinita se abre un poco: invita a tirar de ella. */
	function alEntrar(evt) {
		if (arrastrando || tween || !conRaton()) {
			return;
		}
		if (evt && evt.pointerType && evt.pointerType !== 'mouse') {
			return;
		}
		/* Solo si está doblada: pelada o a medio pelar, ni caso. */
		if (progreso() > 0.2) {
			return;
		}
		irA(encima(), 0.28);
	}

	function alSalir() {
		if (arrastrando || tween || !conRaton()) {
			return;
		}
		if (progreso() > 0.2) {
			return;
		}
		irA(doblada(), 0.28);
	}

	poner(doblada().x, doblada().y);

	caja.addEventListener('pointerdown', alBajar, false);
	caja.addEventListener('pointermove', alMover, false);
	caja.addEventListener('pointerup', alSoltar, false);
	caja.addEventListener('pointercancel', alSoltar, false);
	caja.addEventListener('mouseenter', alEntrar, false);
	caja.addEventListener('mouseleave', alSalir, false);

	/* Peel.js mide el elemento una sola vez: si cambia el tamaño hay que
	   volver a decirle las medidas y recolocar el doblez. */
	let espera = 0;
	window.addEventListener('resize', function () {
		window.clearTimeout(espera);
		espera = window.setTimeout(function () {
			peel.setupDimensions();
			peel.setCorner(window.Peel.Corners.TOP_RIGHT);
			if (progreso() < 0.2) {
				poner(doblada().x, doblada().y);
			}
		}, 150);
	});

	return true;
}
