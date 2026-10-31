#!/usr/bin/env python3
"""entrada-arte.py — prepara el arte de la entrada para la web.

El dibujo bueno es el PNG que exportas de GIMP con el fondo ya borrado
(transparencia de verdad). Este script no inventa nada: solo lo reduce al
tamaño que usa la página, le quita peso y fabrica el dorso (la cara de
detrás, apagada), que es lo que se ve en la esquinita doblada.

Uso:
    python3 entrada-arte.py                 # ../cine-fuentes/ticket-02.png
    python3 entrada-arte.py otro.png 600    # otro origen y otro ancho

Necesita Pillow y numpy:
    sudo pacman -S python-pillow python-numpy     (o pip install pillow numpy)

Deja img/entrada-frente.png e img/entrada-dorso.png. Después:
    sh construir.sh   (no hace falta, pero por si acaso)
    y recarga con Ctrl+F5 para ver el PNG nuevo.
"""

import os
import sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.join(AQUI, "..", "cine-fuentes", "ticket-02.png")
SALIDA = os.path.join(AQUI, "img")
ANCHO = 540          # el doble de los 270 px que ocupa en la página
COLORES = 128        # colores de la paleta del frente (128 = 26 KB)


def preparar(origen, ancho):
    im = Image.open(origen).convert("RGBA")

    # Si sobran márgenes transparentes, se recortan: así el arte ocupa
    # todo el hueco y no queda aire dentro de la caja.
    caja = im.getbbox()
    if caja:
        im = im.crop(caja)

    alto = round(im.height * ancho / im.width)
    frente = im.resize((ancho, alto), Image.Resampling.LANCZOS)
    frente.quantize(colors=COLORES, method=Image.Quantize.FASTOCTREE).save(
        os.path.join(SALIDA, "entrada-frente.png"), optimize=True
    )

    # Dorso: el mismo dibujo por detrás, apagado y azulado, medio
    # transparente. Solo asoma en la esquinita doblada.
    datos = np.asarray(frente).astype(np.float32)
    gris = datos[:, :, :3].mean(axis=2)
    tinte = np.dstack([gris * 0.35, gris * 0.62, gris * 0.70]).clip(0, 255)
    dorso = Image.fromarray(tinte.astype(np.uint8), "RGB").convert("RGBA")
    dorso.putalpha(Image.fromarray((datos[:, :, 3] * 0.55).astype(np.uint8)))
    dorso.quantize(colors=96, method=Image.Quantize.FASTOCTREE).save(
        os.path.join(SALIDA, "entrada-dorso.png"), optimize=True
    )

    for nombre in ("entrada-frente.png", "entrada-dorso.png"):
        ruta = os.path.join(SALIDA, nombre)
        print("  %-20s %4d KB  %dx%d" % (nombre, os.path.getsize(ruta) // 1024, ancho, alto))


def main():
    origen = sys.argv[1] if len(sys.argv) > 1 else ORIGEN
    ancho = int(sys.argv[2]) if len(sys.argv) > 2 else ANCHO
    if not os.path.exists(origen):
        sys.exit("No encuentro el PNG de origen: %s" % origen)
    print("origen: %s" % os.path.relpath(origen, AQUI))
    preparar(origen, ancho)


if __name__ == "__main__":
    main()
