# Cine Mar de Fondo
## Cómo verla

La vía rápida es doble clic en `index.html`: funciona sin servidor y sin conexión, porque las librerías están dentro del proyecto.

Si el navegador bloquea archivos locales, ejecuta  en la carpeta: 
```bash
chmod +666 servir.sh
```
```bash
./servir.sh
```
 y entra en http://localhost:8000.
## Qué hay en cada archivo

| Archivo | Qué contiene |
|---|---|
| `index.html` | Cartelera: tres películas, horarios, precios, aviso y pie. |
| `reserva.html` | Formulario de reserva en XHTML 1.0 Strict. |
| `reserva_html5.html` | El mismo formulario en HTML5. |
| `estilos.css` | Única hoja: colores, tipografías, menú, tabla, formulario y hero. |
| `img/` | Tres carteles y las dos caras de la entrada. |
| `js/` | Scripts del hero, cargador y pie; `hero.bundle.js` carga la portada. |
| `lib/` | Librerías de terceros, con licencias. |
| `validacion_*.png` | Cuatro capturas de los validadores. |
| `respuestas.pdf` | Las cinco respuestas de la parte 2. |

XHTML 1.0 Strict y HTML5 son dos versiones del mismo idioma. La primera es más estricta: obliga a cerrar todas las etiquetas. La segunda es la actual y admite `nav` o `main`. `index.html` y `reserva.html` van en XHTML porque lo pide el guion; `reserva_html5.html` es el mismo formulario en HTML5. Las dos páginas XHTML pasan el W3C sin errores.

## Cómo se ha seguido el guion

### Paso 1 · La cartelera (`index.html`)

| Lo que pide el guion | Dónde está |
|---|---|
| 1. `title` y `meta` con el autor | `title` «Cine Mar de Fondo - Cartelera Semanal» y `meta name="author"`. |
| 2. `h1` con el nombre y un `id` | `<h1 id="arriba">Cine Mar de Fondo</h1>`. |
| 3. Menú con dos enlaces | `ul.menu`: «Cartelera» a `#cartelera`; «Reservar entradas» a `reserva.html`. |
| 4. Presentación con `strong`, `em` y `abbr` | «estrenos» en `strong`, «clásicos» en `em` y `VOSE` en `abbr` con su significado. |
| 5. Tres películas | `h2` «Películas de la semana»; cada ficha con `h3`, `img` con `alt` y sinopsis. |
| 6. Tabla de horarios | `thead` con los días, `tbody` con fila por película y `tfoot` con «Martes, día del espectador: 4 €». |
| 7. Precios | Una `dl`: general 6 €, reducida 4,50 € y día del espectador 4 €. |
| 8. Aviso | `<p id="aviso">` con «¡Estreno este viernes!». |
| 9. Pie | Dirección en tres líneas (dos `br`), `mailto:` y «Volver arriba» a `#arriba`. |

### Paso 2 · La reserva (`reserva.html`)

| Lo que pide el guion | Dónde está |
|---|---|
| 1. El mismo `h1` y menú | Copiados tal cual, con los dos enlaces. |
| 2. Formulario `get` con dos `fieldset` | `method="get"`; «Tus datos» y «Tu reserva», con su `legend`. |
| 3. Nombre y teléfono | Campos de texto con `label for` e `id`. |
| 4. Selector, sesiones, extras y observaciones | `select`, radios 17:00/19:30/22:00, casillas de extras y `textarea`. |
| 5. Botones | `submit` «Enviar» y `reset` «Restablecer». |
| 6. `name` en todos los campos | Todos lo llevan; al enviar, salen en la URL. |

### Paso 3 · La hoja de estilos (`estilos.css`)

| Lo que pide el guion | Dónde está |
|---|---|
| 1. Una sola hoja externa | Las tres páginas enlazan solo `estilos.css`, con sus 1.942 líneas. |
| 2. Color, fondo y fuente | `body`: fondo `#05080a`, texto `#e2ecee`, familia con `sans-serif` final. |
| 3. `h1` centrado y en mayúsculas | `text-align:center` y `text-transform:uppercase`. |
| 4. Menú horizontal | `list-style-type:none`, `display:inline` y enlaces sin subrayado. |
| 5. Modelo de caja | Borde y `padding` en tabla, celdas y `fieldset`; `margin` en tabla y `fieldset`. |
| 6. Carteles flotantes | `.cartel` de 320 px con `float:left`; `h3` con `clear:both`. |
| 7. Aviso posicionado | `#aviso` con `position:absolute`, `top` y `right`. |
| 8. Clase restringida | `p.sinopsis`, aplicada a las tres sinopsis. |
| 9. Nada de estilos en el HTML | Ni `<style>` ni atributos `style`, `align`, `border` o `bgcolor`. |

### Paso 4 · Validación

| Lo que pide el guion | Dónde está |
|---|---|
| Validar y capturar | `index.html` y `reserva.html` pasan como XHTML 1.0 Strict; `estilos.css` pasa por Jigsaw sin errores. Capturas: `validacion_index.png`, `validacion_reserva.png` y `validacion_css.png`. |

### Paso 5 · Ampliación en HTML5 (`reserva_html5.html`)

| Lo que pide el guion | Dónde está |
|---|---|
| 1. Cabecera HTML5 | `<!DOCTYPE html>`, `<html lang="es">` y `<meta charset="utf-8">`. |
| 2. `nav` y `main` | Menú en `nav` y formulario en `main`. |
| 3. Campos nuevos | `email`, `tel` y `number`, con `min="1"` y `max="10"`. |
| 4. Obligatorios y ayudas | `required` en nombre y correo; `placeholder` en los campos de texto. |
| 5. Aviso fijo | `#aviso` con `position:fixed`; no se mueve al hacer scroll. |
| 6. Validación HTML5 | Pasa el Nu Html Checker sin errores; captura en `validacion_html5.png`. |

## El hero

El hero es la primera pantalla que se ve al abrir la web, como la portada de una revista. Ocupa toda la ventana y contiene el título, el menú y el aviso.

Es un mar oscuro de puntos en movimiento con un fondo negro encima con opacidad reducidad para suavizar su impacto en el espectador.
El título tiene un desajuste leve de color, como una cinta VHS y una animacion con segumiento de cursor que simula un efecto 3D.
El subtítulo se escribe solo; hay dos botones que he intentado poner grandes para facilitar al usuario.
En la esquina esta la alerta que pedia el guion en forma de entrada que se puede pelar y desaparece con un click seco.

El guion pide una web limpia y sencilla. El hero es el único sitio donde me permití una licencia decorativa, y no altera ningún elemento obligatorio: el `h1`, el menú y los enlaces están ahí, en el mismo orden.

Si no hay WebGL o el sistema pide menos movimiento, queda un degradado oscuro con el mismo título blanco. Sin JavaScript, el texto y el menú siguen funcionando.

## Lo que se ha añadido y por qué

- El hero y la entrada que se pela son decorativos; el contenido es el mismo.
- El fondo continúa detrás del resto: el mar sigue al hacer scroll y las secciones se leen sobre un velo oscuro.
- Un cargador pequeño, el `jelly-triangle` de LDRS (MIT), cubre el tiempo que puedan tardar en arrancar los scripts.
- Los enlaces del menú parecen botones: uno con borde y otro turquesa. Siguen siendo los mismos enlaces.
- `admin.html`, `css/admin.css` y `js/admin.js` forman un panel de colores aparte. Refuerza la idea que propone la practica de facilitar modificaciones por parte del cliente. Se abre con doble clic en `admin.html`, igual que el resto de páginas: no hace falta servidor ni conexión.
## Accesibilidad y compatibilidad

- El texto base mide 16 px y los botones del hero pasan de 64 px en móvil. 
- Todas las imágenes llevan `alt`; el dorso lo lleva vacío porque repite el anverso.
- Cada campo tiene su `label` unido por `for` e `id`, y el foco del teclado se ve en enlaces, botones y campos. 
- Respeta `prefers-reduced-motion`: sin animaciones, el hero queda como un degradado oscuro.
- Funciona sin JavaScript, sin WebGL y abierto con `file://`.
- Medido en Chromium a 320, 390, 768, 1024, 1280, 1920 y 2560 px: ninguna de las tres páginas genera scroll horizontal.
- El hero mantiene 60 fps con WebGL por hardware y ronda los 37 fps con renderizado por software. Se midió entre 84 y 192 ms.

## Memoria técnica: con qué se ha hecho

| Herramienta                        | Para qué                                                                                                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML, CSS y JavaScript             | Toda la web, sin generadores.                                                                                                                                                                                     |
| GIMP                               | Recortar y editar la entradas para exportarla a PNG.                                                                                                                                                              |
| `entrada-arte.py`                  | Derivar las dos caras desde el PNG, con Python y Pillow 13.                                                                                                                                                       |
| Node 26 y esbuild 0.28             | `construir.sh` genera `js/hero.bundle.js`, con destino ES2017; `vigilar.sh` lo rehace al guardar.                                                                                                                 |
| `servir.sh`                        | Servidor local con Python en el puerto 8000.                                                                                                                                                                      |
| `pruebas/entrada-test.js`          | 19 comprobaciones automáticas de la lógica de la entrada.                                                                                                                                                         |
| Playwright y Chromium sin interfaz | Pruebas de maquetación, rendimiento y reserva.                                                                                                                                                                    |
| Validadores del W3C y `xmllint`    | Markup Validation Service para XHTML, Nu Html Checker para HTML5, Jigsaw para CSS nivel 3 y `xmllint` con la DTD local, sin conexión.                                                                             |
| Librerías de `lib/`                | GSAP 3.15 con SplitText y ScrambleTextPlugin, three.js r170, blotter.ts 1.0.1, Paper Shaders 0.0.82 (la trama) y Peel.js. Anton va incrustada en `estilos.css`; el cargador es el `jelly-triangle` de LDRS (MIT). |

La lista exacta, con versiones y licencias, está en `lib/LEEME.txt`.

Para revisar el código, probar la web en distintos tamaños y redactar esta memoria me he apoyado en un asistente de IA (Hermes Agent con el modelo DeepSeek V4.1 Flash y Nemotron Ultra 3.5). Las decisiones de diseño, la estructura y el contenido son míos. El asistente se usó para detectar errores, medir el rendimiento y ordenar la documentación.
## Qué se entrega

```
cine/
├── index.html
├── reserva.html
├── reserva_html5.html
├── admin.html
├── estilos.css
├── img/
│   ├── poster1.jpg
│   ├── poster2.jpg
│   └── poster3.jpg
├── validacion_index.png
├── validacion_reserva.png
├── validacion_css.png
├── validacion_html5.png
└── respuestas.pdf
```

