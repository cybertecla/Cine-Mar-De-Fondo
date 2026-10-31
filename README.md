# Cine Mar de Fondo

Sitio de la cartelera de Cine Mar de Fondo: XHTML 1.0 Strict, una sola hoja de
estilos y JavaScript solo en el hero. Todo lo que necesita está dentro del repo
(GSAP, three.js, blotter.ts, Paper Shaders, webgl-fluid y la tipografía Anton),
así que funciona sin conexión y sin CDN.

## Verlo

- Doble clic en `index.html`, o
- `sh servir.sh` y abrir <http://localhost:8000>

No hay que compilar nada: `js/*.bundle.js` ya viene generado.

## Tocarlo

| Qué | Dónde | ¿Compilar? |
| --- | --- | --- |
| Colores y números de las animaciones | `js/hero-ajustes.js` | No, basta F5 |
| Textos del hero | `index.html` | No |
| Lógica de las animaciones | `js/hero*.js` | Sí: `sh construir.sh` |
| Estilos | `estilos.css` | No |

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
index.html · reserva.html · reserva_html5.html
estilos.css                  todos los estilos (incluye la fuente Anton)
js/                          código fuente del hero y el bundle generado
lib/                         librerías de terceros copiadas (ver lib/LEEME.txt)
img/                         los tres carteles (poster1-3.jpg, 720x1080)
ticket-01.jpg · ticket-02.jpg  entradas del cine
                   (el ticket-02 con el fondo ya borrado, que es el que
                    usa la web, vive en ../cine-fuentes/ticket-02.png)
```

`reserva.html` es la versión XHTML 1.0 Strict del formulario; `reserva_html5.html`
es la misma página pasada a HTML5, con `nav`, `main`, `email`, `number`,
`placeholder`, `required` y el aviso de estreno en `position: fixed`.

## Pendiente

- `respuestas.pdf` con las cinco preguntas (TECLA-117).
- Las cuatro capturas de los validadores dentro de `cine/` (TECLA-116).
- El arte del ticket inferior para el horario que se revela al pelar la entrada
  (TECLA-130).
