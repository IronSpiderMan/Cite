const { app } = require('electron')
const path = require('path')
const fs = require('fs')

app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.disableHardwareAcceleration()

async function main() {
  app.setPath('userData', path.join(process.cwd(), '.cite-user-data'))
  try {
    const userData = app.getPath('userData')
    const settingsPath = path.join(userData, 'settings.json')
    const next = { snapshotDir: path.join(process.cwd(), '.tmp-snapshots'), theme: 'system', language: 'zh' }
    fs.mkdirSync(next.snapshotDir, { recursive: true })
    fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2))
  } catch {}
  const url = process.argv[2]
  if (!url) {
    process.stderr.write('Usage: electron electron/capture-cli.cjs <url>\n')
    process.exitCode = 2
    app.quit()
    return
  }

  try {
    const { captureSnapshot } = require('../dist-electron/snapshot')
    const res = await captureSnapshot(url)
    process.stdout.write(JSON.stringify(res, null, 2) + '\n')
    process.exitCode = 0
  } catch (e) {
    process.stderr.write(String(e && e.stack ? e.stack : e) + '\n')
    process.exitCode = 1
  } finally {
    app.quit()
  }
}

app.whenReady().then(main)
