# Cine Mar de Fondo

Sitio de la cartelera de Cine Mar de Fondo: XHTML 1.0 Strict, CSS y JavaScript
sin frameworks. Todo lo que necesita está dentro del repo (GSAP, three.js,
blotter.ts, Paper Shaders, webgl-fluid y la tipografía Anton), así que funciona
sin conexión y sin CDN.

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

## Carpetas

```
index.html · reserva.html · reserva_html5.html
estilos.css                  todos los estilos (incluye la fuente Anton)
js/                          código fuente del hero y el bundle generado
lib/                         librerías de terceros copiadas (ver lib/LEEME.txt)
img/                         posters (de momento, marcadores de posición)
ticket-01.jpg · ticket-02.jpg  entradas del cine
                   (el ticket-02 con el fondo ya borrado, que es el que
                    usa la web, vive en ../cine-fuentes/ticket-02.png)
```

## Pendiente

- Los posters de `img/` están vacíos: falta el arte real.
- La cartelera y el resto de secciones siguen siendo el esqueleto del ejercicio.
