#!/bin/zsh
# Crea ~/Applications/Serendipia.app: un lanzador que abre la app de escritorio desde este repo.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HOME/Applications/Serendipia.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$HERE/icon.icns" "$APP/Contents/Resources/icon.icns"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Serendipia</string>
  <key>CFBundleIdentifier</key><string>local.serendipia.launcher</string>
  <key>CFBundleExecutable</key><string>Serendipia</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>0.1.0</string>
</dict></plist>
PLIST
cat > "$APP/Contents/MacOS/Serendipia" <<RUN
#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:\$PATH"
cd "$HERE"
exec "$HERE/../../node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" . >> "\$HOME/Library/Logs/Serendipia.log" 2>&1
RUN
chmod +x "$APP/Contents/MacOS/Serendipia"
echo "Listo: $APP"
