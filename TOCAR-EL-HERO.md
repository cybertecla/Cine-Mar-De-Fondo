# Tocar el hero (Cine Mar de Fondo) — guía rápida

Página principal: `index.html`

---

## 0 · Cómo ver los cambios

1. Abre `index.html` con doble clic (funciona tal cual, también sin servidor).
   Si prefieres servidor: `bash servir.sh` → `http://localhost:8000/`
2. Después de CUALQUIER cambio: **recarga el navegador con F5**.
3. No hay que instalar nada ni compilar para los ajustes del día a día (ver abajo).

---

## 1 · Qué archivo toco para qué

| Quiero cambiar…                                        | Archivo                          | ¿Compilar?            |
|--------------------------------------------------------|----------------------------------|-----------------------|
| La trama dither (forma, trama, colores, grano…)        | `js/hero-ajustes.js` → `dither`  | **No** — solo F5      |
| El titular de Blotter (base, radio, velocidad, paseo)  | `js/hero-ajustes.js` → `titulo`  | **No** — solo F5      |
| Los textos del hero (título, subtítulo, botón)         | `index.html` (bloque `.hero`)    | **No** — solo F5      |
| La banda negra (alto del hueco, padding)               | `estilos.css` → `.hero-banda`    | **No** — solo F5      |
| La animación del subtítulo (efecto, ritmo)             | `js/hero-fx.js`                  | **Sí**: `sh construir.sh` |
| La lógica del hero, del fondo o del titular            | `js/hero.js` / `js/hero-titulo.js` / `js/hero-dither.js` | **Sí**: `sh construir.sh` |

Para el «sí compilar»: ejecuta `sh construir.sh` y recarga (F5).
Más cómodo todavía: deja `sh vigilar.sh` corriendo en una terminal —
recompila solo cada vez que guardes, tú únicamente recargas el navegador.

---

## 2 · El titular — Blotter.ts channel-split (sigue al ratón)

El titular de la portada lo dibuja **Blotter.ts** con el material
channel-split: los canales R/G/B del texto se separan y la separación
**sigue al ratón** (el «move pointer» del demo de blotter.ts del
preview). Si WebGL o Blotter fallan, el titular vuelve solo a la
animación GSAP SplitText de siempre — no hay que hacer nada.

Se retoca en `js/hero-ajustes.js`, dentro de `titulo: { … }`:

```js
titulo: {
    efecto: true,      // false = titular sin efecto (texto plano)
    base: 0.012,       // separación mínima (fracción del alto del lienzo)
    radio: 0.07,       // cuánto crece según la distancia al centro
    velocidad: 0.025,  // extra cuando el ratón va rápido
    paseo: true        // si no mueves el ratón, se mueve solo
}
```

Son exactamente los números del demo «Channel» de webdev.teknium.io, con
su misma fórmula: `uOffset = base + min(0.7, distancia) * radio + velocidad * v`,
y el ángulo de la separación es el del ratón respecto al centro. La
tipografía también es la suya: **Anton 400** en `#f6f6f6`, incrustada en
`estilos.css` (funciona sin conexión).

Trucos rápidos:
- ¿Demasiado loco? `radio: 0.03`.
- ¿Más drama? `radio: 0.12`.
- ¿Quieto del todo si no tocas el ratón? `paseo: false`.
- ¿Sin efecto, texto plano? `efecto: false`.

Notas:
- El lienzo del titular copia la fuente y el tamaño del CSS al cargar
  (y se adapta solo si redimensionas la ventana). Si cambias la fuente
  o el tamaño en `.hero-titulo` (`estilos.css`), recarga y listo.
- El color del texto del efecto es blanco (`fill` en `js/hero-titulo.js`);
  el resplandor teal es un `drop-shadow` en `estilos.css`.
- El título real sigue en el HTML (lectores de pantalla, selección);
  solo se vuelve transparente cuando el efecto arranca.

---

## 3 · La trama dither — cada número

Es el único fondo del hero. Se retoca en `js/hero-ajustes.js`, dentro de
`dither: { … }`. Valores por defecto a la derecha:

```js
dither: {
    shape: 'warp',          // la forma que hay debajo de la trama (ver tabla)
    type: '8x8',            // la trama: 'random' | '2x2' | '4x4' | '8x8'
    size: 2,                // tamaño del grano en píxeles (1 = fino · 8 = gordo)
    colorFront: '#26b5ce',  // tinta de la trama (teal del sitio). Admite alfa: #rrggbbaa
    colorBack: '#020608',   // fondo entre tramas (negro del sitio)
    steer: 0.15,            // cuánto «dirige» el ratón la trama (0 = inmóvil, 0.3 = mucho)
    speed: 1                // velocidad de la animación (0 = congelado)
}
```

Formas (`shape`): `simplex` · `warp` · `dots` · `wave` · `ripple` · `swirl` · `sphere`.
Tramas (`type`): `random` (ruido) · `2x2` · `4x4` · `8x8` (ordenadas Bayer, de gruesa a fina).

Trucos rápidos:
- ¿Quieres el look «1-bit» clásico? `type:'2x2'`, `size:3`, y cambia `colorFront` a blanco `#ffffff`.
- ¿Trama de prensa fina? `type:'8x8'`, `size:1`, `steer:0.1`.
- ¿Sin animación pero con textura viva al pasar el ratón? `speed:0`, deja `steer` como está.

---

## 4 · La entrada que se pela (Peel.js)

En la esquina superior derecha, donde antes estaba la caja amarilla del
aviso, hay una entrada de cine. Se arrastra la esquina y se levanta el
papel; debajo no hay nada, solo el hero. **Se arrastra desde cualquier
punto** de la entrada (no hace falta acertar en la esquinita: en cuanto
mueves el puntero, el doblez lo sigue). Al soltar a medias se va sola al
extremo más cercano, doblada o abierta. **Un solo clic** la pela entera, y
otro la vuelve a doblar. Al pasar el ratón por encima la esquinita se abre
un poco, para que se vea que se puede tirar de ella.

**Trampa de la librería, si algún día la tocas:** `peel.getAmountClipped()`
no devuelve lo que se ha pelado, sino el trozo de papel que **queda**
(1 = entera, 0 = pelada del todo). El nombre engaña. Por eso el estado se
mide con `progreso()` en `js/entrada.js`, que sale de la posición del
doblez.
El aviso del estreno vive ahora dentro de la entrada: el `id="aviso"` sigue
existiendo, pero es el titular que va escrito encima del marco.

Las piezas:

| Pieza | Archivo |
| --- | --- |
| Librería (MIT, sin CDN) | `lib/peel/peel.js` + sus reglas CSS copiadas en `estilos.css` |
| Lógica de arrastre y clic | `js/entrada.js` (entra en el bundle con `construir.sh`) |
| Marcado: tres capas | `index.html` → `#entrada` |
| Tamaño, sitio y tipografía | `estilos.css` → `.entrada-sitio`, `#aviso` |
| Arte | `img/entrada-frente.png` (el marco) y `img/entrada-dorso.png` (el revés, ya en papel) |
| Rehacer el arte | `entrada-arte.py` (desde el PNG de GIMP, que ya trae alfa) |

**Sin fondo.** El arte sale del PNG exportado de GIMP
(`cine-fuentes/ticket-02.png`), que ya trae el fondo borrado: transparencia
de verdad, canal alfa a 0 en todo lo que queda fuera del ticket. No hay
caja, ni borde, ni panel detrás: si algún día cambias el arte, el PNG tiene
que llevar transparencia de verdad, no un fondo negro.

**Cuerpo del neón (opacidad).** El arte es el PNG que exportas de GIMP con
el fondo ya borrado: el ticket es opaco, así que detrás solo se ve la
página. Desde CSS solo se puede bajar entero: `estilos.css` → `.entrada
img { opacity: }`. Para rehacerlo desde el maestro de GIMP:

    python3 entrada-arte.py                        # ../cine-fuentes/ticket-02.png
    python3 entrada-arte.py otro.png 600

Deja `img/entrada-frente.png` y `img/entrada-dorso.png` (el dorso es la
cara de atrás, en papel cálido: es lo que se ve en la esquinita doblada).

**Pelado completo.** El doblez llega hasta la esquina opuesta y en el
último tramo la entrada se desvanece (`--entrada-visible`, que mueve
`js/entrada.js`): así no queda una esquinita de papel pegada encima del
hero. Quien manda ahí es `FUNDIDO` (0.10 = se desvanece en el último
10 % del recorrido).

**Cambiar el tamaño.** `.entrada-sitio` manda: `width` y `height` son el
tamaño real (230×122 px, el 80 % de los 288×153 originales, misma
proporción 1.88:1). El aviso va en tanto por ciento (`#aviso` al 76 % de
ancho y 38 % de alto), así que aguanta cambios de tamaño; si deformas la
proporción, el neón se estira.

**Cambiar el texto.** El estreno, en `index.html` → `#aviso` (clase
`.entrada-estreno`). Los dos archivos de arte miden 540 px de ancho (más
del doble de 230) para que no se vean blandos en pantallas de alta
densidad.

**Por qué no se usa `peel.handleDrag()`.** Peel.js calcula las coordenadas
con `offsetLeft`/`offsetTop`, que dan por hecho que el elemento está en la
esquina superior izquierda de su contenedor. Aquí está anclada arriba a la
derecha, así que las coordenadas saldrían desplazadas; `js/entrada.js` mide
con `getBoundingClientRect()`, que acierta siempre. Si algún día mueves la
entrada a la esquina superior izquierda, el `handleDrag()` de la librería
volvería a servir.

**Si algo falla**, la entrada se queda quieta y entera (clase
`entrada-quieta`): el aviso se sigue leyendo. En pantallas de menos de 48em
se oculta para no tapar el titular.

**Comprobarlo sin navegador.** `node pruebas/entrada-test.js` monta un DOM,
un Peel y un GSAP de mentira, dispara los mismos eventos y mira dónde acaba
el doblez: 19 comprobaciones (un clic abre, el arrastre sigue al puntero, al
soltar a medias se va al extremo más cercano, sin animación funciona igual).
Sale con código 1 si algo falla. Solo necesita node.

---

## 5 · Diagnóstico rápido

Abre la consola del navegador (F12 → Consola) con `index.html` cargado.
Si el hero arranca, `#hero-shader` lleva `data-estado="ok"` y no hay
errores en rojo. Cuando el dither falla, `js/hero-dither.js` deja un aviso
`[hero] …` explicando qué pasó; si WebGL no está disponible, la página cae
al resplandor estático y el texto sigue viéndose: eso es lo esperado, no un
bug.

---

## 6 · Pendiente de tu decisión

- El **titular** ya va con Blotter channel-split. Si prefieres que se
  quede la animación GSAP de antes (o probar otro de los cuatro efectos
  de Blotter: liquid, rolling, sliding-door, flies), dímelo.

## 7 · Nota técnica (para que no vuelva a fallar)

Los canvas WebGL se pintan con `z-index:-1`. Si `.hero-shader` no crea un
contexto de apilado propio (`isolation:isolate` en `estilos.css`), los
canvas quedan POR DEBAJO del fondo negro de `.hero` y la animación se ve
como «nada». No quites esa línea.

El shader del dither divide por `u_scale` y usa el origen para centrar la
forma: en `js/hero-dither.js` se pasan `u_scale: 1`, `u_originX/Y: 0.5` y
el resto de uniforms «de encuadre» explícitos. Si algún día se añade otro
shader de Paper, revisar qué uniforms de encuadre usa antes de montarlo.

En Blotter, escribir `texto.properties = { … }` **sustituye** el objeto
entero (no lo fusiona): hay que repetir siempre todos los valores
(familia, tamaño, grosor, fill y padding) o el texto vuelve a negro y sin
aire. En `js/hero-titulo.js` ya se hace así.
