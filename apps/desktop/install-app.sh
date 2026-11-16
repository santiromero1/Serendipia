#!/bin/zsh
# Crea ~/Applications/Serendipia.app: un lanzador que abre la app de escritorio desde este repo.
# Se arma con osacompile para que sea una app real: macOS no abre bundles cuyo ejecutable es un script.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HOME/Applications/Serendipia.app"
ELECTRON="$HERE/../../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
[ -x "$ELECTRON" ] || { echo "Falta Electron: corré npm install en la raíz del repo"; exit 1; }
rm -rf "$APP"
mkdir -p "$HOME/Applications"
osacompile -o "$APP" -e "do shell script \"export PATH=/opt/homebrew/bin:/usr/local/bin:\$PATH; cd \" & quoted form of \"$HERE\" & \"; nohup \" & quoted form of \"$ELECTRON\" & \" . >> \$HOME/Library/Logs/Serendipia.log 2>&1 &\""
cp "$HERE/icon.icns" "$APP/Contents/Resources/applet.icns"
# el lanzador no queda en el Dock: la ventana es la de Electron
/usr/libexec/PlistBuddy -c "Add :LSUIElement bool true" "$APP/Contents/Info.plist" 2>/dev/null || true
touch "$APP"
echo "Listo: $APP"
