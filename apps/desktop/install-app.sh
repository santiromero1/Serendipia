#!/bin/zsh
# Crea ~/Applications/Serendipia.app: una copia de Electron con nombre e ícono propios,
# que carga la app de escritorio desde este repo. Si movés el repo, corré esto de nuevo.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../../node_modules/electron/dist/Electron.app"
APP="$HOME/Applications/Serendipia.app"
[ -d "$SRC" ] || { echo "Falta Electron: corré npm install en la raíz del repo"; exit 1; }
rm -rf "$APP"
mkdir -p "$HOME/Applications"
ditto "$SRC" "$APP"
PLIST="$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleName Serendipia" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Serendipia" "$PLIST" 2>/dev/null || /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string Serendipia" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier local.serendipia.app" "$PLIST"
# el nombre que muestran el Dock y el menú sale del ejecutable
mv "$APP/Contents/MacOS/Electron" "$APP/Contents/MacOS/Serendipia"
/usr/libexec/PlistBuddy -c "Set :CFBundleExecutable Serendipia" "$PLIST"
cp "$HERE/icon.icns" "$APP/Contents/Resources/electron.icns"
# el código sigue viviendo en el repo: la app solo lo importa
mkdir -p "$APP/Contents/Resources/app"
echo '{ "name": "serendipia", "productName": "Serendipia", "version": "0.1.0", "type": "module", "main": "main.mjs" }' > "$APP/Contents/Resources/app/package.json"
echo "import '$HERE/main.mjs'" > "$APP/Contents/Resources/app/main.mjs"
# al cambiar el Info.plist la firma original deja de valer: se firma de nuevo, solo para esta Mac
codesign --force --deep --sign - "$APP" 2>/dev/null
touch "$APP"
echo "Listo: $APP"
