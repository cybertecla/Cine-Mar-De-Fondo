/* ------------------------------------------------------------------
   pruebas/entrada-test.js — comprueba la lógica de la entrada que se pela

   No abre ningún navegador: monta un DOM, un Peel y un GSAP de mentira,
   dispara los mismos eventos que el ratón y mira dónde acaba el doblez
   y qué opacidad se le pide a la capa de arriba.

   Uso (necesita node, sin dependencias):
       node pruebas/entrada-test.js

   Sale con código 1 si algo falla.
   ------------------------------------------------------------------ */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RUTA = path.join(__dirname, '..', 'js', 'entrada.js');
const ANCHO = 288;
const ALTO = 153;

/* Estados de referencia, en píxeles de la entrada. */
const DOBLADA = { x: ANCHO - 34, y: 34 };
const ABIERTA = { x: 0, y: ALTO };
const ENCIMA = { x: ANCHO - 54, y: 54 };

let fallos = 0;

function comprobar(nombre, condicion, detalle) {
	if (condicion) {
		console.log('  ok   ' + nombre);
	} else {
		fallos += 1;
		console.log('  FALLA ' + nombre + (detalle ? '  (' + detalle + ')' : ''));
	}
}

function crearMundo(opciones) {
	const op = opciones || {};
	const oyentes = {};
	const clases = new Set();
	const variables = {};
	let capturado = false;

	const caja = {
		offsetWidth: ANCHO,
		offsetHeight: ALTO,
		className: '',
		style: {
			setProperty: function (nombre, valor) { variables[nombre] = valor; }
		},
		classList: {
			add: function (c) { clases.add(c); },
			remove: function (c) { clases.delete(c); },
			contains: function (c) { return clases.has(c); }
		},
		addEventListener: function (tipo, fn) { (oyentes[tipo] = oyentes[tipo] || []).push(fn); },
		removeEventListener: function () {},
		/* La entrada está anclada en x=1000: si el código usase offsetLeft
		   en vez de clientX-rect.left, todo saldría desplazado. */
		getBoundingClientRect: function () {
			return { left: 1000, top: 6, width: ANCHO, height: ALTO };
		},
		setPointerCapture: function () { capturado = true; },
		releasePointerCapture: function () { capturado = false; }
	};

	let pos = { x: 0, y: 0 };
	const historial = [];

	const Peel = function () {
		this.setPeelPosition = function (x, y) {
			pos = { x: x, y: y };
			historial.push([Math.round(x), Math.round(y)]);
		};
		this.setupDimensions = function () {};
		this.setCorner = function () {};
	};
	Peel.supported = true;
	Peel.Corners = { TOP_RIGHT: 0 };

	/* GSAP de mentira: termina la animación en el acto, así se comprueba a
	   dónde va el doblez sin esperar medio segundo por cada caso. */
	const gsap = {
		to: function (objeto, config) {
			objeto.x = config.x;
			objeto.y = config.y;
			config.onUpdate();
			if (config.onComplete) {
				config.onComplete();
			}
			return { kill: function () {} };
		}
	};

	const ctx = {
		window: {
			Peel: Peel,
			gsap: op.sinGsap ? undefined : gsap,
			matchMedia: function (q) {
				if (op.sinRaton) { return { matches: false }; }
				if (op.sinMovimiento) { return { matches: q.indexOf('reduce') !== -1 }; }
				return { matches: q.indexOf('hover') !== -1 };
			},
			addEventListener: function () {}
		},
		document: {
			getElementById: function (id) { return id === 'entrada' ? caja : null; }
		},
		Math: Math, Object: Object, console: console,
		setTimeout: function () { return 0; },
		clearTimeout: function () {}
	};

	let codigo = fs.readFileSync(RUTA, 'utf8')
		.replace('export function montarEntrada', 'function montarEntrada');
	codigo += '\n;montarEntrada';

	vm.createContext(ctx);
	vm.runInContext(codigo, ctx);

	const montado = ctx.montarEntrada();

	function evento(x, y) {
		return {
			clientX: 1000 + x, clientY: 6 + y,
			pointerId: 1, pointerType: 'mouse', button: 0,
			cancelable: true, preventDefault: function () {}
		};
	}

	function disparar(tipo, evt) {
		(oyentes[tipo] || []).forEach(function (fn) { fn(evt); });
	}

	return {
		clases: clases,
		variables: variables,
		historial: historial,
		montado: montado,
		pos: function () { return { x: Math.round(pos.x), y: Math.round(pos.y) }; },
		visible: function () { return variables['--entrada-visible']; },
		evento: evento,
		disparar: disparar,
		capturado: function () { return capturado; },
		hayOyen: function (tipo) { return !!(oyentes[tipo] || []).length; }
	};
}

function mismo(punto, esperado) {
	return Math.abs(punto.x - esperado.x) <= 1 && Math.abs(punto.y - esperado.y) <= 1;
}

/* Punto del recorrido doblada → abierta (0 = doblada, 1 = pelada del todo). */
function enCamino(t) {
	return {
		x: Math.round(DOBLADA.x + (ABIERTA.x - DOBLADA.x) * t),
		y: Math.round(DOBLADA.y + (ABIERTA.y - DOBLADA.y) * t)
	};
}

console.log('entrada que se pela:');

/* 1 · Arranca doblada, opaca y con los oyentes puestos */
const m = crearMundo();
comprobar('monta y arranca doblada', m.montado === true && mismo(m.pos(), DOBLADA),
	m.pos().x + ',' + m.pos().y);
comprobar('el horario empieza oculto', !m.clases.has('entrada-abierta'));
comprobar('arranca opaca', m.visible() === '1.000', m.visible());
comprobar('escucha pointerdown/move/up',
	m.hayOyen('pointerdown') && m.hayOyen('pointermove') && m.hayOyen('pointerup'));

/* 2 · Un solo clic la pela ENTERA (los dos fallos viejos: hacían falta dos
       clics y nunca llegaba al final) */
m.disparar('pointerdown', m.evento(120, 60));
m.disparar('pointerup', m.evento(120, 60));
comprobar('un clic pela del todo', mismo(m.pos(), ABIERTA), m.pos().x + ',' + m.pos().y);
comprobar('pelada del todo: se enseña el horario', m.clases.has('entrada-abierta'));
comprobar('pelada del todo: la entrada se desvanece', m.visible() === '0.000', m.visible());

/* 3 · Otro clic la vuelve a doblar */
m.disparar('pointerdown', m.evento(120, 60));
m.disparar('pointerup', m.evento(120, 60));
comprobar('otro clic la dobla', mismo(m.pos(), DOBLADA), m.pos().x + ',' + m.pos().y);
comprobar('al doblar se esconde el horario', !m.clases.has('entrada-abierta'));
comprobar('al doblar vuelve a ser opaca', m.visible() === '1.000', m.visible());

/* 4 · Arrastrar desde cualquier punto sigue al puntero */
const medio = enCamino(0.3);
m.historial.length = 0;
m.disparar('pointerdown', m.evento(200, 40));
m.disparar('pointermove', m.evento(medio.x, medio.y));
m.disparar('pointermove', m.evento(180, 60));
comprobar('el doblez sigue al puntero',
	m.historial.length === 2 && m.historial[0][0] === medio.x && m.historial[1][0] === 180,
	JSON.stringify(m.historial));
comprobar('el puntero queda capturado', m.capturado() === true);

/* 5 · Soltar a medias: imán al extremo más cercano */
m.disparar('pointerup', m.evento(180, 60));
comprobar('soltada al 35 % vuelve a doblada', mismo(m.pos(), DOBLADA), m.pos().x + ',' + m.pos().y);

const lejos = enCamino(0.8);
m.disparar('pointerdown', m.evento(200, 40));
m.disparar('pointermove', m.evento(lejos.x, lejos.y));
m.disparar('pointerup', m.evento(lejos.x, lejos.y));
comprobar('soltada al 80 % se pela entera', mismo(m.pos(), ABIERTA), m.pos().x + ',' + m.pos().y);

/* 6 · El ratón encima asoma la esquinita, y al salir vuelve */
/* (un clic para cerrarla, que venimos de pelada del todo) */
m.disparar('pointerdown', m.evento(120, 60));
m.disparar('pointerup', m.evento(120, 60));
m.clases.clear();
m.disparar('mouseenter', {});
comprobar('al entrar asoma la esquina', mismo(m.pos(), ENCIMA), m.pos().x + ',' + m.pos().y);
comprobar('asomar no enseña el horario', !m.clases.has('entrada-abierta'));
comprobar('asomar no transparenta', m.visible() === '1.000', m.visible());
m.disparar('mouseleave', {});
comprobar('al salir vuelve a doblada', mismo(m.pos(), DOBLADA), m.pos().x + ',' + m.pos().y);

/* 7 · A medio pelar el horario ya se enseña y el papel sigue opaco */
const tercio = crearMundo();
const cuarenta = enCamino(0.4);
tercio.disparar('pointerdown', tercio.evento(200, 40));
tercio.disparar('pointermove', tercio.evento(cuarenta.x, cuarenta.y));
comprobar('al 40 % se enseña el horario', tercio.clases.has('entrada-abierta'));
comprobar('al 40 % el papel sigue opaco', tercio.visible() === '1.000', tercio.visible());

/* 8 · Sin animación (prefers-reduced-motion) y sin GSAP funcionan igual */
const r = crearMundo({ sinMovimiento: true });
r.disparar('pointerdown', r.evento(120, 60));
r.disparar('pointerup', r.evento(120, 60));
comprobar('sin animación pela igual', mismo(r.pos(), ABIERTA), r.pos().x + ',' + r.pos().y);

const g = crearMundo({ sinGsap: true });
g.disparar('pointerdown', g.evento(120, 60));
g.disparar('pointerup', g.evento(120, 60));
comprobar('sin GSAP pela igual', mismo(g.pos(), ABIERTA), g.pos().x + ',' + g.pos().y);

/* 9 · Con el dedo no se asoma la esquina al pasar */
const t = crearMundo({ sinRaton: true });
t.disparar('mouseenter', {});
comprobar('en táctil no hay asomo', mismo(t.pos(), DOBLADA), t.pos().x + ',' + t.pos().y);

console.log(fallos ? '\n' + fallos + ' prueba(s) fallida(s)' : '\ntodo bien');
process.exit(fallos ? 1 : 0);
