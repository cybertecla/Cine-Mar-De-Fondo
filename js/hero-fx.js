/* ------------------------------------------------------------------
   hero-fx.js — efectos compartidos del hero de Cine Mar de Fondo
   ------------------------------------------------------------------ */

/* ¿El usuario ha pedido reducir animaciones en su sistema? */
export function prefiereMenosMovimiento() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
