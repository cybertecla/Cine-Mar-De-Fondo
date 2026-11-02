#!/usr/bin/env python3
"""entrada-arte.py — prepara el arte de la entrada para la web.

El dibujo bueno es el PNG que exportas de GIMP con el fondo ya borrado
(transparencia de verdad). Este script no inventa nada: solo lo reduce al
tamaño que usa la página, le quita peso y fabrica el dorso: la cara de
detrás, en el mismo papel negro que el frente (tinta opaca, el dibujo
apagado y espejado, y un filo de luz en la silueta), que es lo que se ve
en la esquinita doblada.

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
from PIL import Image, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.join(AQUI, "..", "cine-fuentes", "ticket-02.png")
SALIDA = os.path.join(AQUI, "img")
ANCHO = 540          # casi el triple de los 195 px que ocupa en la página
COLORES = 128        # colores de la paleta del frente (128 = 27 KB)

# Papel del dorso: el mismo negro del frente (medido en el PNG de GIMP:
# el fondo del ticket es exactamente 3, 8, 11). Si se aclara, el revés
# deja de ser la misma cartulina y canta contra la banda negra del hero.
TINTA = (3, 8, 11)
FUERZA = 0.30          # cuánto asoma por detrás la impresión del frente
FILO = (92, 114, 120)  # luz del canto: separa el papel del fondo negro
GRANO = 0.8            # textura de papel, en niveles de gris (casi nada)
COLORES_DORSO = 24     # colores del dorso (el alfa va aparte, exacto)


def preparar(origen, ancho):
    im = Image.open(origen).convert("RGBA")

    # Si sobran márgenes transparentes, se recortan: así el arte ocupa
    # todo el hueco y no queda aire dentro de la caja.
    caja = im.getbbox()
    if caja:
        im = im.crop(caja)

    alto = round(im.height * ancho / im.width)
    frente = im.resize((ancho, alto), Image.Resampling.LANCZOS)
    # Se cuantiza ANTES de guardar y el dorso se saca de este mismo PNG:
    # así el recorte del dorso es, píxel a píxel, el del frente que se
    # sirve (45 niveles de alfa), no el del degradado sin comprimir.
    frente = frente.quantize(colors=COLORES, method=Image.Quantize.FASTOCTREE)
    frente.save(os.path.join(SALIDA, "entrada-frente.png"), optimize=True)

    # Dorso: mismo papel, misma silueta y misma opacidad que el frente.
    # Solo cambia la tinta, que se ve por detrás, apagada y espejada.
    dorso = cuantizar(cara_de_atras(frente))
    dorso.save(os.path.join(SALIDA, "entrada-dorso.png"), optimize=True, compress_level=9)

    for nombre in ("entrada-frente.png", "entrada-dorso.png"):
        ruta = os.path.join(SALIDA, nombre)
        print("  %-20s %4d KB  %dx%d" % (nombre, os.path.getsize(ruta) // 1024, ancho, alto))


def cara_de_atras(frente):
    """El revés del ticket: cartulina negra con la impresión por detrás.

    Se espeja el dibujo (por detrás se ve al revés), se lleva su color
    hacia el negro del papel y se le añade un filo de luz interior que
    sigue la silueta. El alfa se copia TAL CUAL del frente: el papel es
    opaco, que era el fallo del dorso translúcido (alfa 0,55 + negro =
    un manchón gris con el hero a través).
    """
    detras = frente.convert("RGBA").transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    datos = np.asarray(detras).astype(np.float32)
    alfa = datos[:, :, 3]
    # La paleta del frente deja el interior en 254, no en 255. El papel
    # es opaco: se sube a 255 donde ya era opaco y se deja intacto el
    # borde (los 45 niveles del recorte, idénticos al frente).
    alfa = np.where(alfa >= 250, 255.0, alfa)
    rgb = datos[:, :, :3]

    # Tinta: el color del frente acercado al negro del papel. El cian de
    # las líneas sigue siendo el mismo, solo que al 30 %.
    tinta = np.array(TINTA, dtype=np.float32)
    rgb = tinta + (rgb - tinta) * FUERZA

    # Filo: alfa menos alfa desenfocada. Da una línea que sigue la
    # silueta y se apaga hacia dentro; nada de degradados rectangulares
    # que delaten la caja del elemento.
    plano = Image.fromarray(alfa.astype(np.uint8), "L")
    cerca = np.asarray(plano.filter(ImageFilter.GaussianBlur(2.0))).astype(np.float32)
    lejos = np.asarray(plano.filter(ImageFilter.GaussianBlur(7.0))).astype(np.float32)
    ancho = np.asarray(plano.filter(ImageFilter.GaussianBlur(16.0))).astype(np.float32)
    luz = (np.clip(alfa - cerca, 0, 255) * 0.62
           + np.clip(alfa - lejos, 0, 255) * 0.30
           + np.clip(alfa - ancho, 0, 255) * 0.12) / 255.0
    rgb = rgb + luz[:, :, None] * np.array(FILO, dtype=np.float32)

    # Grano de papel muy suave y con semilla fija: el PNG sale siempre
    # igual y la superficie no queda como un plano muerto.
    grano = np.random.default_rng(11).normal(0.0, GRANO, alfa.shape)
    rgb = rgb + grano[:, :, None]

    return Image.fromarray(
        np.dstack([rgb.clip(0, 255), alfa]).astype(np.uint8), "RGBA"
    )


def cuantizar(dorso):
    """Baja el color del dorso a COLORES_DORSO y deja el alfa intacto.

    Un PNG de paleta no sirve: cada entrada de la paleta lleva UN alfa y
    el borde del ticket usa 45 niveles, así que el recorte se rompe. Se
    cuantiza solo el color y se vuelve a pegar el alfa original.
    """
    alfa = np.asarray(dorso)[:, :, 3]
    corto = dorso.quantize(colors=COLORES_DORSO, method=Image.Quantize.FASTOCTREE).convert("RGBA")
    rgb = np.asarray(corto)[:, :, :3]
    return Image.fromarray(np.dstack([rgb, alfa]).astype(np.uint8), "RGBA")


def main():
    origen = sys.argv[1] if len(sys.argv) > 1 else ORIGEN
    ancho = int(sys.argv[2]) if len(sys.argv) > 2 else ANCHO
    if not os.path.exists(origen):
        sys.exit("No encuentro el PNG de origen: %s" % origen)
    print("origen: %s" % os.path.relpath(origen, AQUI))
    preparar(origen, ancho)


if __name__ == "__main__":
    main()
