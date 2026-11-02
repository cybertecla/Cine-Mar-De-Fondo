/* ------------------------------------------------------------------
   pie-marca.js — «Cine Mar de Fondo» del pie con el efecto del
   titular de reserva.html, pero contenido: es un pie, no un hero.

   QUÉ HACE:
   · La primera vez que el pie entra en pantalla (IntersectionObserver)
     descifra la marca con GSAP ScrambleText durante 0,9 s.
   · Al terminar, un <canvas> 2D dibuja el mismo texto con fleco
     cromático (channel-split): blanco en el centro y los canales rojo
     y azul separados a cada lado. La separación sigue al ratón y, si
     el ratón se queda quieto, el puntero pasea solo (Lissajous).
   · El texto real del <p> sigue en el documento para lectores de
     pantalla, selección y buscadores; solo se vuelve transparente
     cuando el lienzo ya está pintado.

   QUÉ NO HACE:
   · No toca js/reserva-hero.js ni las páginas de reserva: la técnica
     se reutiliza aquí, adaptada al tamaño y al ritmo de un pie.
   · No crea canvas si prefers-reduced-motion está activo: en ese caso
     la marca se queda blanca, quieta y perfectamente legible.

   El canvas se añade después del scramble a propósito: ScrambleText
   reescribe el contenido del <p> y se llevaría por delante el lienzo.
   ------------------------------------------------------------------ */

(function () {
	'use strict';

	var SELECTOR_MARCA = '.pie-marca';
	var ESPERA_PASEO = 2.4;   /* segundos sin ratón antes del paseo */
	var BASE = 0.009;         /* separación mínima (fracción del alto) */
	var RADIO = 0.045;        /* cuánto crece con la distancia al centro */
	var VELOCIDAD = 0.015;    /* extra cuando el ratón va rápido */
	var DURACION_INTRO = 0.9; /* segundos del descifrado inicial */

	var estado = {
		marca: null,
		lienzo: null,
		contexto: null,
		frase: '',
		mayusculas: '',
		fuente: '',
		espaciado: 0,
		anchoTexto: 0,
		ancho: 0,
		alto: 0,
		tamano: 22,
		reloj: 0,
		anterior: 0,
		marco: 0,
		activo: false,
		temporizador: null,
		tActivo: 0,
		observador: null,
		empezado: false,
		puntero: null
	};

	function prefiereMenosMovimiento() {
		return !!(window.matchMedia &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches);
	}

	/* Crea el <canvas> en el namespace XHTML para que también funcione
	   si la página se sirve como application/xhtml+xml. */
	function crearLienzo() {
		var lienzo;
		if (document.createElementNS) {
			lienzo = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		} else {
			lienzo = document.createElement('canvas');
		}
		lienzo.className = 'pie-marca-lienzo';
		lienzo.setAttribute('aria-hidden', 'true');
		return lienzo;
	}

	/* Ancho real del texto contando el letter-spacing del CSS, que
	   Canvas no aplica por su cuenta. */
	function medirAncho(contexto, texto, espaciado) {
		var total = 0;
		var i;
		for (i = 0; i < texto.length; i += 1) {
			total += contexto.measureText(texto.charAt(i)).width;
		}
		total += espaciado * Math.max(0, texto.length - 1);
		return total;
	}

	/* Mide la marca real y prepara el lienzo a la misma escala.
	   La familia, el tamaño y el grosor se copian en vivo del CSS,
	   así los media queries siguen funcionando. */
	function redimensionar() {
		var marca = estado.marca;
		var lienzo = estado.lienzo;
		var contexto = estado.contexto;
		if (!marca || !lienzo || !contexto) {
			return;
		}

		var estilo = window.getComputedStyle(marca);
		var caja = marca.getBoundingClientRect();
		var tamano = parseFloat(estilo.fontSize) || 22;
		var dpr = Math.min(window.devicePixelRatio || 1, 2);
		var padX = Math.round(tamano * 0.5);
		var padY = Math.round(tamano * 0.35);
		var ancho = Math.max(48, Math.round(caja.width + padX * 2));
		var alto = Math.max(Math.round(tamano * 1.3), Math.round(caja.height + padY * 2));

		lienzo.style.width = ancho + 'px';
		lienzo.style.height = alto + 'px';
		lienzo.width = Math.round(ancho * dpr);
		lienzo.height = Math.round(alto * dpr);
		contexto.setTransform(dpr, 0, 0, dpr, 0, 0);

		estado.ancho = ancho;
		estado.alto = alto;
		estado.tamano = tamano;
		estado.espaciado = parseFloat(estilo.letterSpacing) || 0;
		estado.fuente = (estilo.fontWeight || '400') + ' ' + tamano + 'px ' +
			(estilo.fontFamily || 'Anton, Impact, sans-serif');

		contexto.font = estado.fuente;
		estado.anchoTexto = medirAncho(contexto, estado.mayusculas, estado.espaciado);
	}

	/* Pinta la marca tres veces: blanco en el centro y rojo y azul
	   desplazados a cada lado con mezcla aditiva. Donde los tres
	   coinciden el resultado es blanco; en los bordes queda el fleco
	   cromático. El ángulo y la separación salen del puntero. */
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
		var distancia = Math.min(0.6, Math.sqrt(dx * dx + dy * dy));
		var separacion = (BASE + distancia * RADIO + puntero.v * VELOCIDAD) * alto;

		/* Al aparecer el lienzo la separación es algo mayor y se
		   asienta en 0,9 s: el glitch se apaga sin aspavientos. */
		var edad = estado.tActivo ? (performance.now() - estado.tActivo) / 1000 : 1;
		var asentar = Math.max(0, 1 - edad / DURACION_INTRO);
		separacion += asentar * alto * 0.10;

		var angulo = Math.atan2(-dy, dx);
		var desplazamientoX = Math.cos(angulo) * separacion;
		var desplazamientoY = Math.sin(angulo) * separacion;

		var inicioX = (ancho - estado.anchoTexto) / 2;
		var lineaBase = alto / 2;
		var texto = estado.mayusculas;
		var espaciado = estado.espaciado;

		/* Blanco en el centro (mantiene la marca legible) y rojo y
		   azul desplazados a cada lado con mezcla aditiva. */
		var canales = [
			{ color: 'rgb(255, 255, 255)', signo: 0 },
			{ color: 'rgb(255, 0, 40)', signo: 1 },
			{ color: 'rgb(0, 80, 255)', signo: -1 }
		];

		var canal;
		var i;
		var x;
		var caracter;
		for (canal = 0; canal < canales.length; canal += 1) {
			contexto.fillStyle = canales[canal].color;
			x = inicioX + desplazamientoX * canales[canal].signo;
			for (i = 0; i < texto.length; i += 1) {
				caracter = texto.charAt(i);
				contexto.fillText(
					caracter,
					x,
					lineaBase + desplazamientoY * canales[canal].signo
				);
				x += contexto.measureText(caracter).width + espaciado;
			}
		}
		contexto.globalCompositeOperation = 'source-over';
	}

	/* Bucle de dibujo: suaviza el puntero y, si lleva un rato quieto,
	   lo pasea solo con dos senos desfasados. */
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
				puntero.tx = 0.5 + Math.sin(estado.reloj * 0.55) * 0.30;
				puntero.ty = 0.5 + Math.sin(estado.reloj * 0.85) * 0.22;
				puntero.v += (0.14 + 0.08 * Math.sin(estado.reloj * 0.7) - puntero.v) * dt * 2;
			} else {
				puntero.v *= Math.pow(0.25, dt);
			}

			var suavizado = Math.min(1, dt * 6);
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
		var marca = estado.marca;
		var lienzo = estado.lienzo;
		var puntero = estado.puntero;
		if (!marca || !lienzo || !puntero) {
			return;
		}
		var escucha = marca.parentNode ? marca.parentNode : marca;

		function mover(evento) {
			var caja = lienzo.getBoundingClientRect();
			if (!caja.width || !caja.height) {
				return;
			}
			var nx = (evento.clientX - caja.left) / caja.width;
			var ny = (evento.clientY - caja.top) / caja.height;
			nx = Math.max(0, Math.min(1, nx));
			ny = Math.max(0, Math.min(1, ny));
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
	   transparente y el lienzo aparece con un fundido. */
	function activarLienzo() {
		var marca = estado.marca;
		var lienzo = estado.lienzo;
		if (!marca) {
			return;
		}
		marca.style.width = '';
		marca.style.whiteSpace = '';

		if (!lienzo || !estado.contexto) {
			return;   /* sin lienzo, la marca se queda como estaba */
		}
		/* Si la red de seguridad saltó a mitad del descifrado, se
		   remata el texto final antes de montar el lienzo. */
		if (window.gsap) {
			try {
				window.gsap.killTweensOf(marca);
			} catch (error) {
				/* sin GSAP no hay nada que matar */
			}
		}
		marca.textContent = estado.frase;
		if (!lienzo.parentNode) {
			marca.appendChild(lienzo);
		}
		redimensionar();
		iniciarBucle();
		seguirRaton();

		estado.tActivo = performance.now();
		marca.classList.add('pie-marca--efecto');
		lienzo.classList.add('listo');
	}

	/* Entrada con ScrambleText. Si GSAP o el plugin no están (o algo
	   falla), se pasa directo al lienzo: el efecto sigue, sin glitch. */
	function iniciarIntro() {
		var marca = estado.marca;
		var gsap = window.gsap;
		var plugin = window.ScrambleTextPlugin;
		var terminado = false;
		var terminar;

		if (!marca) {
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

		/* Red de seguridad: si el plugin se atasca, la marca no se
		   queda a medias. */
		estado.temporizador = window.setTimeout(terminar, 1600);

		try {
			gsap.registerPlugin(plugin);
			gsap.to(marca, {
				duration: DURACION_INTRO,
				ease: 'none',
				scrambleText: {
					text: estado.frase,
					chars: 'AÁBCDEÉFGHIÍJKLMNOPQRSTUÚVWXYZ0123456789·—/#%&',
					revealDelay: 0.15,
					speed: 0.45,
					tweenLength: false
				},
				onComplete: terminar
			});
		} catch (error) {
			terminar();
		}
	}

	function arrancar() {
		if (estado.marca || estado.empezado || prefiereMenosMovimiento()) {
			return;
		}

		var marca = document.querySelector(SELECTOR_MARCA);
		if (!marca) {
			return;
		}
		estado.marca = marca;
		estado.empezado = true;
		estado.frase = (marca.textContent || '').replace(/\s+/g, ' ').trim();
		if (!estado.frase) {
			estado.marca = null;
			estado.empezado = false;
			return;
		}
		estado.mayusculas = estado.frase.toUpperCase();

		/* Se fija el ancho durante la entrada para que el glitch no
		   mueva la marca ni el bloque de al lado. */
		var caja = marca.getBoundingClientRect();
		if (caja.width) {
			marca.style.width = caja.width + 'px';
			marca.style.whiteSpace = 'nowrap';
		}

		/* Marca el efecto en el DOM desde el primer momento: la prueba
		   y el CSS pueden saber que está en marcha. */
		marca.setAttribute('data-efecto', 'glitch-canal');

		estado.lienzo = crearLienzo();
		estado.contexto = estado.lienzo.getContext ? estado.lienzo.getContext('2d') : null;
		if (!estado.contexto) {
			estado.lienzo = null;
			estado.marca = null;
			estado.empezado = false;
			marca.style.width = '';
			marca.style.whiteSpace = '';
			marca.removeAttribute('data-efecto');
			return;
		}

		iniciarIntro();
	}

	/* La fuente es local (data URI), pero hasta que el navegador no la
	   tiene medida, la marca ocupa otro ancho y el canvas mediría con
	   la fuente de reserva. Se espera a document.fonts.ready con un
	   tope de 700 ms: nunca se retrasa la página más que eso. */
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

	/* El pie se observa una sola vez: la marca se descifra la primera
	   vez que asoma por la ventana. Sin IntersectionObserver se
	   ejecuta al cargar, como red de seguridad. */
	function observar() {
		var marca = document.querySelector(SELECTOR_MARCA);
		if (!marca || estado.empezado || prefiereMenosMovimiento()) {
			return;
		}
		var pie = marca.parentNode && marca.parentNode.parentNode ?
			marca.parentNode.parentNode : marca;

		if (!('IntersectionObserver' in window)) {
			arrancar();
			return;
		}

		estado.observador = new window.IntersectionObserver(function (entradas) {
			var i;
			for (i = 0; i < entradas.length; i += 1) {
				if (entradas[i].isIntersecting) {
					if (estado.observador) {
						estado.observador.disconnect();
						estado.observador = null;
					}
					arrancar();
					return;
				}
			}
		}, { threshold: 0.2 });

		estado.observador.observe(pie);
	}

	function destruir() {
		estado.activo = false;
		estado.empezado = false;
		if (estado.observador) {
			estado.observador.disconnect();
			estado.observador = null;
		}
		if (estado.marco) {
			window.cancelAnimationFrame(estado.marco);
			estado.marco = 0;
		}
		if (estado.temporizador) {
			window.clearTimeout(estado.temporizador);
			estado.temporizador = null;
		}
		if (window.gsap && estado.marca) {
			try {
				window.gsap.killTweensOf(estado.marca);
			} catch (error) {
				/* sin GSAP no hay nada que matar */
			}
		}
		if (estado.marca) {
			estado.marca.textContent = estado.frase;
			estado.marca.style.width = '';
			estado.marca.style.whiteSpace = '';
			estado.marca.classList.remove('pie-marca--efecto');
			estado.marca.removeAttribute('data-efecto');
		}
		if (estado.lienzo && estado.lienzo.parentNode) {
			estado.lienzo.parentNode.removeChild(estado.lienzo);
		}
		estado.marca = null;
		estado.lienzo = null;
		estado.contexto = null;
		estado.puntero = null;
	}

	function alCambiarMovimiento() {
		if (prefiereMenosMovimiento()) {
			destruir();
		} else if (!estado.empezado) {
			observar();
		}
	}

	/* El ancla #arriba apunta al <h1> del hero, que está centrado en
	   la banda: el navegador dejaría la página a ~295 px, no arriba
	   del todo. El enlace del pie sí debe volver al principio, así que
	   se intercepta el clic (sin tocar el hero ni el resto del HTML). */
	function prepararVolver() {
		var enlace = document.querySelector('.pie-volver a');
		if (!enlace) {
			return;
		}
		enlace.addEventListener('click', function (evento) {
			if (evento.defaultPrevented || evento.button !== 0 ||
				evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
				return;
			}
			evento.preventDefault();
			window.scrollTo(0, 0);
		});
	}

	function iniciar() {
		var consulta = window.matchMedia ?
			window.matchMedia('(prefers-reduced-motion: reduce)') : null;

		prepararVolver();

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
				if (estado.marca) {
					redimensionar();
				}
			}, 250);
		});

		conFuenteLista(observar);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', iniciar);
	} else {
		iniciar();
	}
}());
