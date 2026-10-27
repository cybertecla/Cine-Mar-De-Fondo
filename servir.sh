#!/bin/sh
# Sirve esta carpeta en http://localhost:8000
# Hace falta un servidor local: los módulos JS (type="module") no
# funcionan abriendo el archivo con file:// directamente.
cd "$(dirname "$0")" || exit 1
echo "Cine Mar de Fondo en http://localhost:8000  (Ctrl+C para parar)"
python3 -m http.server 8000
