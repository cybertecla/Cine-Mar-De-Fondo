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
| Cuál de los TRES fondos se ve                          | `js/hero-ajustes.js` → `fondo`   | **No** — solo F5      |
| La trama dither (forma, trama, colores, grano…)        | `js/hero-ajustes.js` → `dither`  | **No** — solo F5      |
| Los números de la tinta (color, velocidad, estela…)    | `js/hero-ajustes.js` → `fluido`  | **No** — solo F5      |
| Los números de los rayos (colores, brillo…)            | `js/hero-ajustes.js` → `rayos`   | **No** — solo F5      |
| El titular de Blotter (base, radio, velocidad, paseo)  | `js/hero-ajustes.js` → `titulo`  | **No** — solo F5      |
| Los textos del hero (título, subtítulo, botón)         | `index.html` (bloque `.hero`)    | **No** — solo F5      |
| La banda negra (alto del hueco, padding)               | `estilos.css` → `.hero-banda`    | **No** — solo F5      |
| La animación del subtítulo (efecto, ritmo)             | `js/hero-fx.js`                  | **Sí**: `sh construir.sh` |
| La lógica del hero, de un fondo o del titular          | `js/hero.js` / `js/hero-titulo.js` / `js/hero-dither.js` / `js/hero-fluid.js` | **Sí**: `sh construir.sh` |

Para el «sí compilar»: ejecuta `sh construir.sh` y recarga (F5).
Más cómodo todavía: deja `sh vigilar.sh` corriendo en una terminal —
recompila solo cada vez que guardes, tú únicamente recargas el navegador.

---

## 2 · Elegir fondo: dither, tinta o rayos

En `js/hero-ajustes.js`:

```js
fondo: 'dither',   // trama tramada Bayer (el efecto del preview)   ← el activo
fondo: 'fluido',   // tinta líquida interactiva (WebGL Fluid)
fondo: 'rayos',    // haces de luz (god rays)
```

Si un fondo no arranca (p. ej. WebGL caído), el hero prueba los otros
por orden y, si ninguno, deja un resplandor estático: nunca queda en
negro muerto.

---

## 3 · El titular — Blotter.ts channel-split (sigue al ratón)

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

## 4 · La trama dither — cada número

Se retoca en `js/hero-ajustes.js`, dentro de `dither: { … }`.
Valores por defecto a la derecha:

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

## 5 · La tinta líquida (efecto del preview) — cada número

Se retocan en `js/hero-ajustes.js`, dentro de `fluido: { … }`.
Todo lo que no pongas queda con el valor por defecto (el de la derecha):

```js
fluido: {
    CURL: 38,                 // rebullir de la tinta. 0 = liso · 50 = muy rizado (def: 38)
    DENSITY_DISSIPATION: 0.9, // estela: 0 = no se borra nunca · 4 = se borra al momento (def: 0.9)
    INTERVAL: 2600,           // ms entre chorros automáticos (def: 2600)
    SPLAT_RADIUS: 0.28,       // grosor del trazo al mover el ratón. 0.1 fino · 0.5 grueso
    SPLAT_FORCE: 6000,        // fuerza del empujón al mover el ratón
    TRIGGER: 'hover',         // 'hover' = se remueve al pasar por encima · 'click' = solo al clic
    IMMEDIATE: true,          // true = chorros de tinta al abrir la página
    AUTO: true,               // true = chorros automáticos cada INTERVAL (así nunca está quieto)
    SPLAT_COLOR: { r: 38, g: 181, b: 206 }, // fija la tinta a UN color (aquí el teal del sitio).
                             // Quítalo (= null) para tinta multicolor como en el preview
    COLORFUL: true,           // tinta que va cambiando de color (cuando no fijas SPLAT_COLOR)
    COLOR_UPDATE_SPEED: 10,   // velocidad del cambio de color
    BACK_COLOR: { r: 2, g: 6, b: 8 }, // fondo de la tinta (≈ negro del sitio)
    BLOOM: true,              // brillo alrededor de la tinta
    BLOOM_INTENSITY: 0.8,     // intensidad del brillo
    SUNRAYS: true,            // rayos de sol que salen de la tinta
    PAUSED: false,            // true = congelar (para diseñar un encuadre)
    SIM_RESOLUTION: 128,      // calidad de la simulación. Más = mejor, más pesado
    DYE_RESOLUTION: 1024      // nitidez de la tinta. Más = mejor, más pesado
}
```

Trucos rápidos:
- ¿Demasiado ruidosa? Baja `CURL` a ~20 y sube `DENSITY_DISSIPATION` a ~1.5.
- ¿Quieres verla quieta en un momento concreto? `PAUSED: true`.
- ¿Va lento en un portátil? Baja `DYE_RESOLUTION` a 512.

---

## 6 · Los rayos de luz (god rays) — cada número

Se retocan en `js/hero-ajustes.js`, dentro de `rayos: { … }`
(aplican al hero de `index.html` cuando `fondo: 'rayos'`):

```js
rayos: {
    colors: ['#0a4a63f2', '#1b87a3e6', '#26b5ceff', '#8fe7f5'], // 4 colores de los haces
    colorBack: '#020608',     // fondo entre rayos
    colorBloom: '#0d5b73',    // halo del centro
    intensity: 1,             // brillo general (0–1)
    density: 0.32,            // cuántos haces (0–1)
    spotty: 0.28,             // haces rotos/manchados (0–1)
    midSize: 0.22,            // tamaño del resplandor central (0–1)
    midIntensity: 0.55,       // fuerza del resplandor central (0–1)
    bloom: 0.6,               // flou alrededor de los haces (0–1)
    speed: 0.45               // velocidad de la animación
}
```

---

## 7 · Diagnóstico rápido

Abre la consola del navegador (F12 → Consola) con `index.html` cargado.
Si el hero arranca, verás `[hero] fondo: dither` y ningún error en rojo.
Cuando algo falla, `js/hero-fx.js` deja un aviso `[hero] …` explicando qué
librería no llegó a arrancar; si WebGL no está disponible, la página cae al
resplandor estático y el texto sigue viéndose: eso es lo esperado, no un bug.

---

## 8 · Pendiente de tu decisión

- **Cuál de los tres fondos se queda**: dither, tinta líquida o rayos.
  (Los tres están montados; se cambia con una palabra en `hero-ajustes.js`.)
- El **titular** ya va con Blotter channel-split. Si prefieres que se
  quede la animación GSAP de antes (o probar otro de los cuatro efectos
  de Blotter: liquid, rolling, sliding-door, flies), dímelo.

## 9 · Nota técnica (para que no vuelva a fallar)

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
