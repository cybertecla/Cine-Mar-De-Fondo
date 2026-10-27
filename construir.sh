#!/bin/sh
# Genera los bundles clásicos del hero.
# Se usan bundles (no módulos) para que la web funcione también al abrir
# index.html con doble clic (file://), donde <script type="module"> no carga.
# Volver a ejecutar tras cambiar cualquier js/hero*.js o js/hero-lab.js.
cd "$(dirname "$0")"
ESBUILD="$(command -v esbuild || echo /home/b0llull0s/.hermes/hermes-agent/node_modules/.bin/esbuild)"
ALIAS="--alias:three=$(pwd)/lib/three/three.module.min.js"
"$ESBUILD" js/hero.js --bundle --format=iife $ALIAS --outfile=js/hero.bundle.js || exit 1
"$ESBUILD" js/hero-lab.js --bundle --format=iife $ALIAS --outfile=js/hero-lab.bundle.js || exit 1
echo "Bundles listos: js/hero.bundle.js y js/hero-lab.bundle.js"
