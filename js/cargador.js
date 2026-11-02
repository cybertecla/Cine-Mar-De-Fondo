/* ------------------------------------------------------------------
   cargador.js — pantalla de carga de Cine Mar de Fondo

   El spinner es el «jelly-triangle» de LDRS (MIT, Griffin Johnston),
   portado a SVG + CSS sin web components: se construye aquí con
   createElementNS para que el XHTML siga siendo válido y funcione al
   abrir el archivo con file://.
   ------------------------------------------------------------------ */

(function () {
	'use strict';

	var MAXIMO = 12000, FUNDIDO = 450;
	var LADO = 108;                 /* lado del viewBox: S = 108 px */
	var RADIO = LADO / 6;           /* (S / 3) / 2 = 18 */
	var NS = 'http://www.w3.org/2000/svg';
	var raiz = document.documentElement;
	var capa = null, svg = null;
	var reloj = 0, cerrado = false, comprobando = false;
	var esperas = [];

	function sinMovimiento() {
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	/* Un círculo del spinner en su vértice del triángulo. */
	function circulo(clase, cx, cy) {
		var el = document.createElementNS(NS, 'circle');
		el.setAttribute('class', clase);
		el.setAttribute('cx', String(cx));
		el.setAttribute('cy', String(cy));
		el.setAttribute('r', String(RADIO));
		return el;
	}

	/* SVG del jelly-triangle
	   Los atributos van aquí, no en el HTML, para no meter etiquetas que xmllint no conoce. */
	function crearSpinner() {
		svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('class', 'cargador-jelly');
		svg.setAttribute('viewBox', '0 0 ' + LADO + ' ' + LADO);
		svg.setAttribute('width', String(LADO));
		svg.setAttribute('height', String(LADO));
		svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		svg.setAttribute('aria-hidden', 'true');
		svg.setAttribute('focusable', 'false');

		svg.appendChild(circulo('jelly-punto', LADO / 2, RADIO));
		svg.appendChild(circulo('jelly-punto', LADO - RADIO, LADO - RADIO));
		svg.appendChild(circulo('jelly-punto', RADIO, LADO - RADIO));
		svg.appendChild(circulo('jelly-viajero', LADO / 2, RADIO));

		var defs = document.createElementNS(NS, 'defs');
		var filtro = document.createElementNS(NS, 'filter');
		filtro.setAttribute('id', 'cargador-ooze');

		var desenfoque = document.createElementNS(NS, 'feGaussianBlur');
		desenfoque.setAttribute('in', 'SourceGraphic');
		desenfoque.setAttribute('stdDeviation', String(LADO / 9));
		desenfoque.setAttribute('result', 'blur');

		var matriz = document.createElementNS(NS, 'feColorMatrix');
		matriz.setAttribute('in', 'blur');
		matriz.setAttribute('type', 'matrix');
		matriz.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7');
		matriz.setAttribute('result', 'ooze');

		var mezcla = document.createElementNS(NS, 'feBlend');
		mezcla.setAttribute('in', 'SourceGraphic');
		mezcla.setAttribute('in2', 'ooze');

		filtro.appendChild(desenfoque);
		filtro.appendChild(matriz);
		filtro.appendChild(mezcla);
		defs.appendChild(filtro);
		svg.appendChild(defs);

		return svg;
	}

	/* Overlay mínimo: solo el spinner sobre negro, sin texto visible.
	   El nombre del sitio lo sigue anunciando el aria-label de .cargador. */
	function crear() {
		capa = document.createElement('div');
		capa.className = 'cargador';
		capa.setAttribute('role', 'status');
		capa.setAttribute('aria-live', 'polite');
		capa.setAttribute('aria-label', 'Cargando la cartelera');
		capa.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;background:#05080a;';
		/* Nodo, no innerHTML: así también vale si el documento se sirve
		   como XHTML. */
		var caja = document.createElement('div');
		caja.className = 'cargador-caja';
		caja.appendChild(crearSpinner());
		capa.appendChild(caja);
		/* En el <head> no hay body: cuelga del documento; position:fixed. */
		(document.body || raiz).appendChild(capa);
		raiz.setAttribute('data-cargando', 'si');
	}

	function imagenLista(img) {
		var respaldo = !!(img.complete && img.naturalWidth > 0);
		if (typeof img.decode !== 'function') return Promise.resolve(respaldo);
		try {
			return img.decode().then(function () { return true; }, function () { return respaldo; });
		} catch (error) {
			return Promise.resolve(respaldo);
		}
	}

	function fuentesListas() {
		if (!document.fonts || !document.fonts.ready) return Promise.resolve();
		return document.fonts.ready.then(function () {}, function () {});
	}

	function quitar() {
		if (capa && capa.parentNode) capa.parentNode.removeChild(capa);
		capa = svg = null;
		raiz.removeAttribute('data-cargando');
		/* Quitar el atributo devuelve el scroll; el body nunca se tocó. */
	}

	function cerrar() {
		if (cerrado) return;
		cerrado = true;
		window.clearTimeout(reloj);
		if (!capa) { raiz.removeAttribute('data-cargando'); return; }
		/* Con reduced-motion no hay fundido: se retira y ya está. */
		if (sinMovimiento()) { quitar(); return; }
		capa.className += ' cargador--fuera';
		window.setTimeout(quitar, FUNDIDO);
	}

	function registrar(promesa) {
		if (cerrado) return Promise.resolve(promesa);
		var marcada = Promise.resolve(promesa).then(function (valor) {
			return valor;
		}, function () {
			return null;   /* un asset que falla tampoco bloquea el cierre */
		});
		esperas.push(marcada);
		return marcada;
	}

	/* window load y, después, imágenes, fuentes y lo registrado. */
	function comprobar() {
		if (cerrado || comprobando) return;
		comprobando = true;
		var lista = document.images || [];
		var todas = [];
		for (var i = 0; i < lista.length; i += 1) todas.push(imagenLista(lista[i]));
		Promise.all([Promise.all(todas), fuentesListas(), Promise.all(esperas)]).then(cerrar, cerrar);
	}

	window.Cargador = {
		esperar: function (promesa) { return registrar(promesa); },
		/* Alias compatible: el overlay ya no pinta textos; se ignora el
		   texto y la promesa se espera igual que con esperar(). */
		esperarEtiqueta: function (texto, promesa) { return registrar(promesa); },
		listo: cerrar
	};

	try { crear(); } catch (error) { quitar(); }
	reloj = window.setTimeout(cerrar, MAXIMO);

	if (document.readyState === 'complete') window.setTimeout(comprobar, 0);
	else window.addEventListener('load', comprobar, false);
}());
