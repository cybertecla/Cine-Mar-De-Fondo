/* ============================================================
   Panel de aspecto del Cine Mar de Fondo
   Guarda el tema en este navegador (localStorage, clave «cine-tema»)
   y genera una hoja de estilos lista para llevar a la web.
   Sin dependencias: funciona con doble clic desde file://.
   ============================================================ */

(function () {
	'use strict';

	var CLAVE = 'cine-tema';

	/* Valores de partida: los mismos que usa hoy la web. */
	var INICIAL = {
		fondo: '#05080a',
		acento: '#26b5ce',
		texto: '#e2ecee',
		boton: '#26b5ce',
		tamano: 16,
		familia: 'helvetica',
		interlineado: 1.65,
		altoBoton: 44,
		mayusculas: 'si',
		columnas: 3
	};

	/* Tres letras que ya están en el ordenador: nada que descargar. */
	var FAMILIAS = {
		helvetica: '"Helvetica Neue", Helvetica, Arial, sans-serif',
		georgia: 'Georgia, "Times New Roman", serif',
		trebuchet: '"Trebuchet MS", Verdana, sans-serif'
	};

	var NOMBRES_FAMILIA = {
		helvetica: 'Limpia',
		georgia: 'Tipo libro',
		trebuchet: 'Redondeada'
	};

	var vista = document.getElementById('vista-previa');
	var nodoEstado = document.getElementById('estado');
	var areaCSS = document.getElementById('css-generado');
	var cajaCSS = document.getElementById('caja-css');
	var estado = {};

	function copiarObjeto(objeto) {
		return JSON.parse(JSON.stringify(objeto));
	}

	function limitarNumero(valor, minimo, maximo, porDefecto) {
		var numero = Number(valor);
		if (!isFinite(numero)) {
			return porDefecto;
		}
		return Math.min(maximo, Math.max(minimo, numero));
	}

	function esColor(valor) {
		return typeof valor === 'string' && /^#[0-9a-f]{6}$/i.test(valor);
	}

	/* Deja cualquier dato guardado dentro de los límites del panel. */
	function normalizar(datos) {
		var limpio = copiarObjeto(INICIAL);
		if (!datos || typeof datos !== 'object') {
			return limpio;
		}
		if (esColor(datos.fondo)) {
			limpio.fondo = datos.fondo.toLowerCase();
		}
		if (esColor(datos.acento)) {
			limpio.acento = datos.acento.toLowerCase();
		}
		if (esColor(datos.texto)) {
			limpio.texto = datos.texto.toLowerCase();
		}
		if (esColor(datos.boton)) {
			limpio.boton = datos.boton.toLowerCase();
		}
		limpio.tamano = Math.round(limitarNumero(datos.tamano, 16, 26, INICIAL.tamano));
		limpio.interlineado = Math.round(limitarNumero(datos.interlineado, 1.3, 2, INICIAL.interlineado) * 20) / 20;
		limpio.altoBoton = Math.round(limitarNumero(datos.altoBoton, 44, 64, INICIAL.altoBoton) / 2) * 2;
		limpio.columnas = Math.round(limitarNumero(datos.columnas, 1, 3, INICIAL.columnas));
		if (FAMILIAS[datos.familia]) {
			limpio.familia = datos.familia;
		}
		limpio.mayusculas = datos.mayusculas === 'no' ? 'no' : 'si';
		return limpio;
	}

	function leerGuardado() {
		try {
			var bruto = window.localStorage.getItem(CLAVE);
			return bruto ? JSON.parse(bruto) : null;
		} catch (error) {
			return null;
		}
	}

	/* Blanco o casi negro sobre el color de botón: siempre se lee. */
	function luminancia(hex) {
		var canales = [
			parseInt(hex.substr(1, 2), 16),
			parseInt(hex.substr(3, 2), 16),
			parseInt(hex.substr(5, 2), 16)
		];
		var lineales = canales.map(function (valor) {
			var canal = valor / 255;
			return canal <= 0.03928 ? canal / 12.92 : Math.pow((canal + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * lineales[0] + 0.7152 * lineales[1] + 0.0722 * lineales[2];
	}

	function textoLegible(hex) {
		return luminancia(hex) > 0.35 ? '#061014' : '#ffffff';
	}

	/* Pinta el estado actual en la vista previa. */
	function aplicar() {
		var estilo = vista.style;
		estilo.setProperty('--tema-fondo', estado.fondo);
		estilo.setProperty('--tema-acento', estado.acento);
		estilo.setProperty('--tema-texto', estado.texto);
		estilo.setProperty('--tema-boton', estado.boton);
		estilo.setProperty('--tema-boton-texto', textoLegible(estado.boton));
		estilo.setProperty('--tema-tamano', estado.tamano + 'px');
		estilo.setProperty('--tema-familia', FAMILIAS[estado.familia]);
		estilo.setProperty('--tema-interlineado', String(estado.interlineado));
		estilo.setProperty('--tema-alto-boton', estado.altoBoton + 'px');
		estilo.setProperty('--tema-mayusculas', estado.mayusculas === 'si' ? 'uppercase' : 'none');
		estilo.setProperty('--tema-columnas', String(estado.columnas));
		vista.classList.toggle('vista-previa--larga', vista.scrollHeight > vista.clientHeight + 2);
	}

	function ponerValor(campo, texto) {
		var salida = document.querySelector('[data-para="' + campo + '"]');
		if (salida) {
			salida.textContent = texto;
		}
	}

	function actualizarValores() {
		ponerValor('fondo', estado.fondo);
		ponerValor('acento', estado.acento);
		ponerValor('texto', estado.texto);
		ponerValor('boton', estado.boton);
		ponerValor('tamano', estado.tamano + ' px');
		ponerValor('familia', NOMBRES_FAMILIA[estado.familia]);
		ponerValor('interlineado', estado.interlineado.toFixed(2).replace('.', ','));
		ponerValor('altoBoton', estado.altoBoton + ' px');
		ponerValor('mayusculas', estado.mayusculas === 'si' ? 'Sí' : 'No');
		ponerValor('columnas', estado.columnas + (estado.columnas === 1 ? ' columna' : ' columnas'));
	}

	function sincronizarControles() {
		var controles = document.querySelectorAll('[data-campo]');
		for (var i = 0; i < controles.length; i += 1) {
			var control = controles[i];
			var campo = control.getAttribute('data-campo');
			if (control.type === 'radio') {
				control.checked = String(estado[campo]) === control.value;
			} else {
				control.value = estado[campo];
			}
		}
		actualizarValores();
	}

	function aviso(texto, tono) {
		nodoEstado.textContent = texto;
		nodoEstado.className = 'estado' + (tono ? ' es-' + tono : '');
	}

	/* Hoja de estilos que se descarga o se copia. */
	function generarCSS() {
		var lineas = [
			'/* Cine Mar de Fondo — estilo elegido en el panel de aspecto */',
			':root {',
			'\t--tema-fondo: ' + estado.fondo + ';',
			'\t--tema-acento: ' + estado.acento + ';',
			'\t--tema-texto: ' + estado.texto + ';',
			'\t--tema-boton: ' + estado.boton + ';',
			'\t--tema-boton-texto: ' + textoLegible(estado.boton) + ';',
			'\t--tema-tamano: ' + estado.tamano + 'px;',
			'\t--tema-familia: ' + FAMILIAS[estado.familia] + ';',
			'\t--tema-interlineado: ' + estado.interlineado.toFixed(2) + ';',
			'\t--tema-alto-boton: ' + estado.altoBoton + 'px;',
			'\t--tema-mayusculas: ' + (estado.mayusculas === 'si' ? 'uppercase' : 'none') + ';',
			'\t--tema-columnas: ' + estado.columnas + ';',
			'}',
			'',
			'body {',
			'\tbackground-color: var(--tema-fondo);',
			'\tcolor: var(--tema-texto);',
			'\tfont-family: var(--tema-familia);',
			'\tfont-size: var(--tema-tamano);',
			'\tline-height: var(--tema-interlineado);',
			'}',
			'',
			'h1 {',
			'\tcolor: var(--tema-acento);',
			'}',
			'',
			'.boton {',
			'\tmin-height: var(--tema-alto-boton);',
			'\tbackground-color: var(--tema-boton);',
			'\tcolor: var(--tema-boton-texto);',
			'\ttext-transform: var(--tema-mayusculas);',
			'}',
			'',
			'.cartelera {',
			'\tgrid-template-columns: repeat(var(--tema-columnas), minmax(0, 1fr));',
			'}',
			''
		];
		return lineas.join('\n');
	}

	function refrescarCSS() {
		areaCSS.value = generarCSS();
	}

	function alCambiar(evento) {
		var control = evento.target;
		var campo = control.getAttribute('data-campo');
		if (!campo || (control.type === 'radio' && !control.checked)) {
			return;
		}
		estado[campo] = control.type === 'range' ? Number(control.value) : control.value;
		aplicar();
		actualizarValores();
		refrescarCSS();
		aviso('Cambios sin guardar. Cuando te guste, pulsa «Guardar en este navegador».', '');
	}

	function guardar() {
		try {
			window.localStorage.setItem(CLAVE, JSON.stringify(estado));
			aviso('Guardado en este navegador. Se recordará la próxima vez que abras el panel.', 'bueno');
		} catch (error) {
			aviso('Este navegador no permite guardar ajustes. Descarga la hoja de estilos para no perderlos.', 'aviso');
		}

		/* ------------------------------------------------------------
		   PUNTO DE CONEXIÓN CON UN SERVIDOR (para el futuro)
		   Ahora mismo el tema se queda en este navegador. Cuando el cine
		   tenga un servidor, aquí se enviaría el objeto «estado» a la base
		   de datos, por ejemplo:
		       fetch('/api/tema', { method: 'PUT', body: JSON.stringify(estado) })
		   y localStorage quedaría solo como copia de seguridad.
		   ------------------------------------------------------------ */
	}

	function restablecer() {
		estado = copiarObjeto(INICIAL);
		try {
			window.localStorage.removeItem(CLAVE);
		} catch (error) {
			/* Si el navegador no deja usar localStorage, basta con los valores en pantalla. */
		}
		sincronizarControles();
		aplicar();
		refrescarCSS();
		aviso('Todo ha vuelto a los valores iniciales.', 'bueno');
	}

	function abrirCajaCSS() {
		cajaCSS.open = true;
	}

	function copiar() {
		refrescarCSS();
		var listo = function () {
			aviso('Estilo copiado. Ya puedes pegarlo donde lo necesites.', 'bueno');
		};
		var aMano = function () {
			abrirCajaCSS();
			areaCSS.focus();
			areaCSS.select();
			aviso('El texto ya está seleccionado. Cópialo con el botón derecho o con el teclado.', 'aviso');
		};
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(generarCSS()).then(listo).catch(aMano);
		} else {
			aMano();
		}
	}

	function descargar() {
		refrescarCSS();
		try {
			var archivo = new Blob([generarCSS()], { type: 'text/css;charset=utf-8' });
			var url = window.URL.createObjectURL(archivo);
			var enlace = document.createElement('a');
			enlace.href = url;
			enlace.download = 'cine-tema.css';
			document.body.appendChild(enlace);
			enlace.click();
			document.body.removeChild(enlace);
			window.setTimeout(function () {
				window.URL.revokeObjectURL(url);
			}, 2000);
			abrirCajaCSS();
			aviso('Hoja de estilos preparada. Si el navegador no muestra la descarga, copia el texto de abajo.', 'bueno');
		} catch (error) {
			abrirCajaCSS();
			aviso('El navegador no ha permitido la descarga. Copia el texto del cuadro de abajo.', 'aviso');
		}
	}

	/* ------------------------------------------------------------
	   Arranque
	   ------------------------------------------------------------ */

	var datosGuardados = leerGuardado();
	estado = normalizar(datosGuardados);

	sincronizarControles();
	aplicar();
	refrescarCSS();

	if (datosGuardados) {
		aviso('Estilo guardado cargado. Puedes cambiarlo y volver a guardar.', 'bueno');
	}

	var controles = document.querySelectorAll('[data-campo]');
	for (var i = 0; i < controles.length; i += 1) {
		var control = controles[i];
		var cuando = (control.type === 'radio' || control.tagName === 'SELECT') ? 'change' : 'input';
		control.addEventListener(cuando, alCambiar);
	}

	document.getElementById('guardar').addEventListener('click', guardar);
	document.getElementById('restablecer').addEventListener('click', restablecer);
	document.getElementById('copiar').addEventListener('click', copiar);
	document.getElementById('descargar').addEventListener('click', descargar);
	window.addEventListener('resize', aplicar);
}());
