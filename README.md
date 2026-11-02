# Cine Mar de Fondo

Sitio de la cartelera de Cine Mar de Fondo. La portada y la reserva están en
XHTML 1.0 Strict; la reserva HTML5 y el panel de aspecto, en HTML5. Los estilos
se reparten entre `estilos.css` y las hojas de `css/`, y cada efecto tiene su
propio JavaScript. Todo lo que necesita está dentro del repo (GSAP, three.js,
blotter.ts, Paper Shaders, webgl-fluid y la tipografía Anton), así que funciona
sin conexión y sin CDN.

## Verlo

- Doble clic en `index.html`, o
- `sh servir.sh` y abrir <http://localhost:8000>

No hay que compilar nada: `js/hero.bundle.js` ya viene generado.

## Páginas

| Página | Qué es |
| --- | --- |
| `index.html` | Cartelera, horarios, precios y la entrada que se pela. XHTML 1.0 Strict. |
| `reserva.html` | Formulario de reserva. XHTML 1.0 Strict. |
| `reserva_html5.html` | El mismo formulario pasado a HTML5. |
| `admin.html` | Panel de aspecto: cambia colores y genera una hoja de estilos. HTML5. |

## Tocarlo

| Qué | Dónde | ¿Compilar? |
| --- | --- | --- |
| Colores y números de las animaciones | `js/hero-ajustes.js` | No, basta F5 |
| Textos del hero | `index.html` | No |
| Lógica de las animaciones | `js/hero*.js` | Sí: `sh construir.sh` |
| Estilos base | `estilos.css` | No |
| Estilos de la cartelera | `css/peliculas.css`, `css/fondo.css`, `css/botones.css` | No |
| Cargador | `css/cargador.css`, `js/cargador.js` | No |
| Marca del pie | `css/pie-marca.css`, `js/pie-marca.js` | No |
| Titular de reserva | `css/reserva-hero.css`, `js/reserva-hero.js` | No |
| Panel de aspecto | `css/admin.css`, `js/admin.js` | No |

Si vas a tocar el JS a menudo, deja `sh vigilar.sh` corriendo y recompila solo.
La guía de ajustes, con recetas, está en `TOCAR-EL-HERO.md`.

## La cartelera

Tres películas y tres carteles. Las imágenes están recortadas a 720x1080 (2:3) y
se muestran a 320 px de ancho: ancho fijo, no porcentual, para que los tres midan
lo mismo aunque cambie el tamaño de la ventana.

Los tres carteles empiezan a la misma altura. El `h3` de cada película reserva
siempre dos líneas y el título lleva `clear: both`, así el cartel nunca se cuela
al lado del texto de la anterior.

Cada película es un `<article class="pelicula">` con `.pelicula-cartel` (el
marco), `.cartel` (la imagen) y `p.sinopsis`. Las animaciones por cartel que
vienen después se enganchan ahí sin tocar el HTML.

Los colores están todos en el bloque `PALETA` del principio de `estilos.css`:
fondo `#05080a`, turquesa `#26b5ce`, ámbar `#ffcc00`. Cambiar el tema es cambiar
esos ocho valores, no cazar hex sueltos por el archivo.

El menú son dos enlaces con la clase `.boton`: `boton--fantasma` con borde para
«Cartelera» y `boton--principal` en turquesa para «Reservar entradas», que
apunta a `reserva.html`. El mismo par de botones encabeza las dos páginas de
reserva.

## Carpetas

```
index.html · reserva.html · reserva_html5.html · admin.html
estilos.css                  base, paleta y fuente Anton
css/                         hojas por pieza: fondo, cargador,
                             películas, botones, pie, reserva y admin
js/                          hero, entrada, cargador, pie, reserva, admin
                             y el bundle generado
lib/                         librerías de terceros copiadas (ver lib/LEEME.txt)
img/                         carteles, entrada y logo
pruebas/                     prueba de la entrada sin navegador
ticket-01.jpg · ticket-02.jpg  entradas del cine (material de origen)
respuestas.txt               respuestas de repaso
entrada-arte.py              rehace img/entrada-*.png desde ../cine-fuentes/
construir.sh · vigilar.sh    compilan el bundle del hero
servir.sh                    servidor local en el puerto 8000
```

`reserva.html` es la versión XHTML 1.0 Strict del formulario; `reserva_html5.html`
es la misma página pasada a HTML5, con `nav`, `main`, `email`, `number`,
`placeholder`, `required` y el aviso de estreno en `position: fixed`.
`admin.html` es un panel aparte: guarda el tema en el navegador y genera una
hoja de estilos para llevar los colores a la web.

## Pendiente

- `respuestas.pdf` con las cinco preguntas (TECLA-117), a partir de `respuestas.txt`.
- Las cuatro capturas de los validadores dentro de `cine/` (TECLA-116).
