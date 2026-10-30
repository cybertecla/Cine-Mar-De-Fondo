>[!info] Cartelera (`index.html`)
>- «VOSE»
>- «Películas de la semana»
>- «Horarios»
>- «Precios»
>- id="aviso" que diga «¡Estreno este viernes!»
>- «Volver arriba»

>[!info] La reserva (`reserva.html`)
>- Menu Inicial x2
>>[!info] Formulario
>>- «Tus datos»
>>- «Tu reserva».

# Assets

>[!info] Hero:
>```
>>https://github.com/basementstudio/shader-lab
>```
## Images
3 carteles de peliculas
## Animations

>[!info] Peeling
>```
>https://github.com/andrewplummer/peel-js
>```
>- Se puede usar para los elementos del menu (`Cartelera` y `Reservar Entradas` )
>- «Películas de la semana»?????

https://github.com/meodai/poline

https://github.com/oframe/ogl

>[!info] Fondo shader
>```
>https://github.com/paper-design/shaders
>https://shaders.paper.design/fluted-glass
>https://github.com/FireCMSco/neat
>https://github.com/shader-effects-inc/shaders
>https://github.com/basementstudio/shader-lab
>!!!! https://github.com/ruucm/shadergradient
>https://github.com/7PH/powerglitch
>https://github.com/snorpey/glitch-canvas
>```

Film Grain
https://github.com/josephmiclaus/p5.grain

Peliculas de la semana?????
https://github.com/ibelick/motion-primitives

Transitions??
https://github.com/ragnarlotus/vue-flux
https://github.com/argyleink/transition.css

Poster effects???
https://github.com/paper-design/shaders

Reservas effect
https://github.com/DavidHDev/canvas-ui


# Terminos Film to Shaders

|Technique|Useful shader concept|
|---|---|
|Film grain|Random noise, blue noise, temporal noise|
|Dust and scratches|Sparse masks, line primitives, animated noise|
|Gate weave|UV-coordinate displacement|
|Flicker|Time-varying exposure multiplier|
|Halation|Brightness threshold, blur, additive compositing|
|Light leaks|Gradient masks, low-frequency noise|
|RGB split|Per-channel UV offsets|
|VHS distortion|Scanline displacement, noise bands, chroma offset|
|Datamosh-style effects|Frame feedback, motion vectors, image persistence|
|Film burn|Animated radial gradients, threshold masks|
|Vignetting|Radial falloff in screen coordinates|
|Film color response|Tone curves, channel mixing, LUTs|

# Estado

>[!info] Hero — implementado (pendiente de tu prueba)
>- `index.html`: banda negra **solo detrás del texto**; arriba y abajo se ve el fondo animado. Tres fondos intercambiables en `js/hero-ajustes.js` (`fondo:`): **la trama dither** (`'dither'`, el efecto del preview de Paper Shaders — el activo ahora), la **tinta líquida** (`'fluido'`) y los **rayos** (`'rayos'`). Titular con **Blotter.ts channel-split** (los canales R/G/B se separan siguiendo al ratón; si WebGL falla, cae solo a SplitText); subtítulo: ScrambleText.
>- Arranque: doble clic en `index.html` (funciona también con `file://`) o `bash servir.sh` → `http://localhost:8000/`
>- **Tocar colores/números del hero sin compilar**: edita `js/hero-ajustes.js` y recarga (F5). Guía completa: `TOCAR-EL-HERO.md`.
>- Todo se empaqueta en `js/hero.bundle.js` (regenerar con `sh construir.sh` o dejando `sh vigilar.sh` corriendo tras tocar el JS fuente).
>- Fallo corregido: los canvas WebGL (`z-index:-1`) quedaban debajo del fondo negro de `.hero` → «no se ve ninguna animación». `.hero-shader` lleva `isolation:isolate`; no quitar.
>- Fondo activo: `'dither'`; en `js/hero-ajustes.js` cambias a `'fluido'` o `'rayos'` cuando quieras. Titular: Blotter channel-split con la configuración exacta del demo de webdev.teknium.io (Anton 400 en `#f6f6f6`, `uOffset = base + min(0.7,distancia)*radio + velocidad*v`, paseo automático si no hay ratón; knobs en `titulo:{…}`). Si lo prefieres con GSAP, o con otro material de Blotter (liquid, rolling, sliding-door, flies), se cambia cuando digas.