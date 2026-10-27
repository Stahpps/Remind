// SPDX-License-Identifier: GPL-3.0-or-later
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const android = fileURLToPath(new URL('../android/', import.meta.url))
const args = ['assembleRelease', '-Pfdroid', '--console=plain']
let result
if (process.env.FDROID_GRADLE === 'system') {
  result = spawnSync('gradle', args, { cwd: android, stdio: 'inherit' })
} else if (process.platform === 'win32') {
  result = spawnSync('cmd.exe', ['/d', '/s', '/c', 'gradlew.bat assembleRelease -Pfdroid --console=plain'], { cwd: android, stdio: 'inherit' })
} else {
  result = spawnSync(path.join(android, 'gradlew'), args, { cwd: android, stdio: 'inherit' })
}
if (result.error) throw result.error
process.exitCode = result.status ?? 1
