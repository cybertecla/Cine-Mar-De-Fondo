/* ------------------------------------------------------------------
   reserva-hero.js — el titular de la cabecera de reserva, con vida.
------------------------------------------------------------------ */

(function () {
	'use strict';

	var SELECTOR_TITULO = '.cabecera .hero-titulo';
	var ESPERA_PASEO = 2.2;   /* segundos sin ratón antes del paseo */
	var BASE = 0.012;         /* separación mínima (fracción del alto) */
	var RADIO = 0.07;         /* cuánto crece con la distancia al centro */
	var VELOCIDAD = 0.025;    /* extra cuando el ratón va rápido */
	var DURACION_INTRO = 0.9; /* segundos del descifrado inicial */

	var estado = {
		titulo: null,
		lienzo: null,
		contexto: null,
		frase: '',
		fuente: '',
		anchoTexto: 0,
		ancho: 0,
		alto: 0,
		reloj: 0,
		anterior: 0,
		marco: 0,
		activo: false,
		temporizador: null,
		tActivo: 0,
		puntero: null
	};

	function prefiereMenosMovimiento() {
		return !!(window.matchMedia &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	}

	/* Crea el <canvas> en el namespace XHTML para que también
	   funcione si la página se sirve como application/xhtml+xml. */
	function crearLienzo() {
		var lienzo;
		if (document.createElementNS) {
			lienzo = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		} else {
			lienzo = document.createElement('canvas');
		}
		lienzo.className = 'titulo-lienzo';
		lienzo.setAttribute('aria-hidden', 'true');
		return lienzo;
	}

	/* Mide el titular real y prepara el lienzo a la misma escala.
	   La familia, el tamaño y el grosor se copian en vivo del CSS,
	   así los media queries siguen funcionando. */
	function redimensionar() {
		var titulo = estado.titulo;
		var lienzo = estado.lienzo;
		var contexto = estado.contexto;
		if (!titulo || !lienzo || !contexto) {
			return;
		}

		var estilo = window.getComputedStyle(titulo);
		var caja = titulo.getBoundingClientRect();
		var tamano = parseFloat(estilo.fontSize) || 24;
		var dpr = Math.min(window.devicePixelRatio || 1, 2);
		var padX = Math.round(tamano * 0.42);
		var padY = Math.round(tamano * 0.30);
		var ancho = Math.max(48, Math.round(caja.width + padX * 2));
		var alto = Math.max(Math.round(tamano * 1.3), Math.round(caja.height + padY * 2));

		lienzo.style.width = ancho + 'px';
		lienzo.style.height = alto + 'px';
		lienzo.width = Math.round(ancho * dpr);
		lienzo.height = Math.round(alto * dpr);
		contexto.setTransform(dpr, 0, 0, dpr, 0, 0);

		estado.ancho = ancho;
		estado.alto = alto;
		estado.fuente = (estilo.fontWeight || '400') + ' ' + tamano + 'px ' +
			(estilo.fontFamily || 'Anton, Impact, sans-serif');

		contexto.font = estado.fuente;
		estado.anchoTexto = contexto.measureText(estado.frase.toUpperCase()).width;
	}

	/* Pinta el titular tres veces: blanco en el centro y rojo y azul
	   desplazados a cada lado con mezcla aditiva. Donde los tres
	   coinciden el resultado es blanco; en los bordes queda el fleco
	   cromático del channel-split. El ángulo y la separación salen
	   del puntero, como en el material de Blotter. */
	function dibujar() {
		var contexto = estado.contexto;
		if (!contexto) {
			return;
		}

		var ancho = estado.ancho;
		var alto = estado.alto;
		contexto.clearRect(0, 0, ancho, alto);
		contexto.globalCompositeOperation = 'lighter';
		contexto.textAlign = 'left';
		contexto.textBaseline = 'middle';
		contexto.font = estado.fuente;

		var puntero = estado.puntero;
		var dx = puntero.x - 0.5;
		var dy = puntero.y - 0.5;
		var distancia = Math.min(0.7, Math.sqrt(dx * dx + dy * dy));
		var separacion = (BASE + distancia * RADIO + puntero.v * VELOCIDAD) * alto;

		/* Los primeros ~0,9 s desde que aparece el lienzo la
		   separación es mayor: el glitch se asienta. */
		var edad = estado.tActivo ? (performance.now() - estado.tActivo) / 1000 : 1;
		var asentar = Math.max(0, 1 - edad / DURACION_INTRO);
		separacion += asentar * alto * 0.16;

		var angulo = Math.atan2(-dy, dx);
		var desplazamientoX = Math.cos(angulo) * separacion;
		var desplazamientoY = Math.sin(angulo) * separacion;

		var inicioX = (ancho - estado.anchoTexto) / 2;
		var lineaBase = alto / 2;
		var texto = estado.frase.toUpperCase();

		/* Blanco en el centro (mantiene el titular legible) y rojo y
		   azul desplazados a cada lado con mezcla aditiva: el fleco
		   cromático solo se ve fuera del glifo, como en Blotter. */
		var canales = [
			{ color: 'rgb(255, 255, 255)', signo: 0 },
			{ color: 'rgb(255, 0, 40)', signo: 1 },
			{ color: 'rgb(0, 80, 255)', signo: -1 }
		];

		var canal;
		for (canal = 0; canal < canales.length; canal += 1) {
			contexto.fillStyle = canales[canal].color;
			contexto.fillText(
				texto,
				inicioX + desplazamientoX * canales[canal].signo,
				lineaBase + desplazamientoY * canales[canal].signo
			);
		}
		contexto.globalCompositeOperation = 'source-over';
	}

	/* Bucle de dibujo: suaviza el puntero y, si lleva 2,2 s quieto,
	   lo pasea solo con dos senos desfasados (igual que la portada). */
	function iniciarBucle() {
		estado.activo = true;
		estado.anterior = performance.now();
		estado.puntero = {
			x: 0.5, y: 0.5,
			tx: 0.5, ty: 0.5,
			v: 0,
			ultimoTiempo: 0,
			ultimoMovimiento: -Infinity
		};

		function marco(ahora) {
			if (!estado.activo) {
				return;
			}
			var dt = Math.min(0.05, (ahora - estado.anterior) / 1000);
			estado.anterior = ahora;
			estado.reloj += dt;

			var puntero = estado.puntero;
			var sinRaton = ahora - puntero.ultimoMovimiento > ESPERA_PASEO * 1000;
			if (sinRaton) {
				puntero.tx = 0.5 + Math.sin(estado.reloj * 0.7) * 0.42;
				puntero.ty = 0.5 + Math.sin(estado.reloj * 1.1) * 0.32;
				puntero.v += (0.18 + 0.12 * Math.sin(estado.reloj * 0.9) - puntero.v) * dt * 2;
			} else {
				puntero.v *= Math.pow(0.25, dt);
			}

			var suavizado = Math.min(1, dt * 7);
			puntero.x += (puntero.tx - puntero.x) * suavizado;
			puntero.y += (puntero.ty - puntero.y) * suavizado;

			if (!document.hidden) {
				dibujar();
			}
			estado.marco = window.requestAnimationFrame(marco);
		}

		estado.marco = window.requestAnimationFrame(marco);
	}

	function seguirRaton() {
		var titulo = estado.titulo;
		var lienzo = estado.lienzo;
		var puntero = estado.puntero;
		if (!titulo || !lienzo || !puntero) {
			return;
		}
		var escucha = titulo.closest('.cabecera') || titulo;

		function mover(evento) {
			var caja = lienzo.getBoundingClientRect();
			if (!caja.width || !caja.height) {
				return;
			}
			var nx = (evento.clientX - caja.left) / caja.width;
			var ny = (evento.clientY - caja.top) / caja.height;
			var dt = Math.max(8, evento.timeStamp - (puntero.ultimoTiempo || 0));
			var rapidez = Math.sqrt(
				(nx - puntero.tx) * (nx - puntero.tx) +
				(ny - puntero.ty) * (ny - puntero.ty)
			) / (dt / 1000);
			puntero.v = Math.min(1, puntero.v * 0.6 + Math.min(1, rapidez / 4) * 0.4);
			puntero.tx = nx;
			puntero.ty = ny;
			puntero.ultimoTiempo = evento.timeStamp;
			puntero.ultimoMovimiento = performance.now();
		}

		escucha.addEventListener('pointermove', mover, { passive: true });
		escucha.addEventListener('pointerdown', mover, { passive: true });
	}

	/* Cuando termina el descifrado, el texto real se vuelve
	   transparente y el lienzo aparece con un fundido.
	   El lienzo se añade AQUÍ y no antes: ScrambleText reescribe el
	   contenido del <h1> y se llevaría por delante el canvas. */
	function activarLienzo() {
		var titulo = estado.titulo;
		var lienzo = estado.lienzo;
		if (!titulo) {
			return;
		}
		titulo.style.width = '';
		titulo.style.whiteSpace = '';

		if (!lienzo || !estado.contexto) {
			return;   /* sin lienzo, el titular se queda como estaba */
		}
		/* Si la red de seguridad saltó a mitad del descifrado, se
		   remata el texto final antes de montar el lienzo. */
		if (window.gsap) {
			try {
				window.gsap.killTweensOf(titulo);
			} catch (error) {
				/* sin GSAP no hay nada que matar */
			}
		}
		titulo.textContent = estado.frase;
		if (!lienzo.parentNode) {
			titulo.appendChild(lienzo);
		}
		redimensionar();
		iniciarBucle();
		seguirRaton();

		estado.tActivo = performance.now();
		titulo.classList.add('titulo-efecto');
		titulo.setAttribute('data-efecto', 'glitch-canal');
		lienzo.classList.add('listo');
	}

	/* Entrada con ScrambleText. Si GSAP o el plugin no están (o algo
	   falla), se pasa directo al lienzo: el efecto sigue, sin glitch. */
	function iniciarIntro() {
		var titulo = estado.titulo;
		var gsap = window.gsap;
		var plugin = window.ScrambleTextPlugin;
		var terminado = false;
		var terminar;

		if (!titulo) {
			return;
		}
		if (!gsap || !plugin) {
			activarLienzo();
			return;
		}

		terminar = function () {
			if (terminado) {
				return;
			}
			terminado = true;
			if (estado.temporizador) {
				window.clearTimeout(estado.temporizador);
				estado.temporizador = null;
			}
			activarLienzo();
		};

		/* Red de seguridad: si el plugin se atasca, el titular no se
		   queda a medias. */
		estado.temporizador = window.setTimeout(terminar, 1600);

		try {
			gsap.registerPlugin(plugin);
			gsap.to(titulo, {
				duration: DURACION_INTRO,
				ease: 'none',
				scrambleText: {
					text: estado.frase,
					chars: 'AÁBCDEÉFGHIÍJKLMNOPQRSTUÚVWXYZ0123456789·—/#%&',
					revealDelay: 0.2,
					speed: 0.5,
					tweenLength: false
				},
				onComplete: terminar
			});
		} catch (error) {
			terminar();
		}
	}

	function arrancar() {
		if (estado.titulo || prefiereMenosMovimiento()) {
			return;
		}

		var titulo = document.querySelector(SELECTOR_TITULO);
		if (!titulo) {
			return;
		}
		estado.titulo = titulo;
		estado.frase = (titulo.textContent || '').replace(/\s+/g, ' ').trim();
		if (!estado.frase) {
			estado.titulo = null;
			return;
		}

		/* Se fija el ancho durante la entrada para que el glitch no
		   empuje el menú de al lado. */
		var caja = titulo.getBoundingClientRect();
		if (caja.width) {
			titulo.style.width = caja.width + 'px';
			titulo.style.whiteSpace = 'nowrap';
		}

		estado.lienzo = crearLienzo();
		estado.contexto = estado.lienzo.getContext ? estado.lienzo.getContext('2d') : null;
		if (!estado.contexto) {
			estado.lienzo = null;
			estado.titulo = null;
			titulo.style.width = '';
			titulo.style.whiteSpace = '';
			return;
		}

		iniciarIntro();
	}

	/* La fuente es local (data URI), pero hasta que el navegador no la
	   tiene medida, el <h1> ocupa otro ancho y el canvas mediría con la
	   fuente de reserva. Se espera a document.fonts.ready con un tope
	   de 700 ms: nunca se retrasa la página más que eso. */
	function conFuenteLista(continuar) {
		var hecho = false;
		function seguir() {
			if (hecho) {
				return;
			}
			hecho = true;
			continuar();
		}
		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(seguir);
			window.setTimeout(seguir, 700);
		} else {
			seguir();
		}
	}

	function destruir() {
		estado.activo = false;
		if (estado.marco) {
			window.cancelAnimationFrame(estado.marco);
			estado.marco = 0;
		}
		if (estado.temporizador) {
			window.clearTimeout(estado.temporizador);
			estado.temporizador = null;
		}
		if (window.gsap && estado.titulo) {
			try {
				window.gsap.killTweensOf(estado.titulo);
			} catch (error) {
				/* sin GSAP no hay nada que matar */
			}
		}
		if (estado.titulo) {
			estado.titulo.textContent = estado.frase;
			estado.titulo.style.width = '';
			estado.titulo.style.whiteSpace = '';
			estado.titulo.classList.remove('titulo-efecto');
			estado.titulo.removeAttribute('data-efecto');
		}
		if (estado.lienzo && estado.lienzo.parentNode) {
			estado.lienzo.parentNode.removeChild(estado.lienzo);
		}
		estado.titulo = null;
		estado.lienzo = null;
		estado.contexto = null;
		estado.puntero = null;
	}

	function alCambiarMovimiento() {
		if (prefiereMenosMovimiento()) {
			destruir();
		} else {
			arrancar();
		}
	}

	function iniciar() {
		var consulta = window.matchMedia ?
			window.matchMedia('(prefers-reduced-motion: reduce)') : null;

		if (consulta) {
			if (consulta.addEventListener) {
				consulta.addEventListener('change', alCambiarMovimiento);
			} else if (consulta.addListener) {
				consulta.addListener(alCambiarMovimiento);
			}
		}

		var temporizadorResize = null;
		window.addEventListener('resize', function () {
			window.clearTimeout(temporizadorResize);
			temporizadorResize = window.setTimeout(function () {
				if (estado.titulo) {
					redimensionar();
				}
			}, 250);
		});

		conFuenteLista(arrancar);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', iniciar);
	} else {
		iniciar();
	}
}());
