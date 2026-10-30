#!/bin/sh
# Recompila el bundle automáticamente mientras editas el JS fuente.
#
# Déjalo corriendo en una terminal:   sh vigilar.sh
#
# Cada vez que guardes cualquier js/hero*.js, el bundle se regenera solo.
# Solo recarga el navegador (F5).
cd "$(dirname "$0")"
ESBUILD="$(command -v esbuild || echo /home/b0llull0s/.hermes/hermes-agent/node_modules/.bin/esbuild)"
ALIAS="--alias:three=$(pwd)/lib/three/three.module.min.js"

"$ESBUILD" js/hero.js --bundle --format=iife $ALIAS --outfile=js/hero.bundle.js --watch &
echo ""
echo "Vigilando cambios en js/ … (Ctrl+C para salir)"
wait
