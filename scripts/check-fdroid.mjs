// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict'
import fs from 'node:fs'
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const pkg = JSON.parse(read('package.json'))
const lock = JSON.parse(read('package-lock.json'))
assert.equal(pkg.license, 'GPL-3.0-or-later')
assert.equal(lock.packages[''].license, pkg.license)
assert.equal(lock.packages[''].version, pkg.version)
for (const [name, version] of Object.entries({...pkg.dependencies, ...pkg.devDependencies})) {
  assert.match(version, /^\d+\.\d+\.\d+$/)
  assert.equal(lock.packages['node_modules/' + name].version, version)
}
const inventory = JSON.parse(read('docs/npm-dependencies.json'))
const packages = Object.entries(lock.packages).filter(([p]) => p)
assert.equal(inventory.length, packages.length)
const allowed = new Set(['MIT', 'ISC', 'Apache-2.0', 'MPL-2.0', 'Unlicense', 'CC-BY-4.0', 'BlueOak-1.0.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD'])
for (const [path, entry] of packages) {
  assert(allowed.has(entry.license), path + ': review license ' + entry.license)
  assert(entry.integrity && entry.resolved?.startsWith('https://registry.npmjs.org/'), path)
  assert(inventory.some(i => i.version === entry.version && i.resolved === entry.resolved && i.integrity === entry.integrity && i.license === entry.license), path + ': stale inventory')
}
assert(read('LICENSE').includes('GNU GENERAL PUBLIC LICENSE'))
assert.equal(read('LICENSE'), read('public/licenses/GPL-3.0.txt'))
assert(!read('README.md').includes('no general reuse license'))
assert(!read('android/build.gradle').includes('google-services'))
assert(!read('android/app/build.gradle').includes('google-services'))
assert(read('android/app/build.gradle').includes("!project.hasProperty('fdroid')"))
assert(read('android/app/build.gradle').includes('versionCode 5'))
assert(read('android/app/build.gradle').includes('versionName "1.4"'))
assert(read('.fdroid.yml').includes('License: GPL-3.0-or-later'))
for (const locale of ['en-US', 'ro-RO']) {
  const root = 'fastlane/metadata/android/' + locale + '/'
  assert(read(root + 'title.txt').trim().length <= 50)
  assert(read(root + 'short_description.txt').trim().length <= 80)
  assert(read(root + 'full_description.txt').trim().length > 100)
  assert(read(root + 'changelogs/5.txt').trim().length <= 500)
}
console.log('GPL, pinned lockfile, dependency inventory, signing isolation and localized metadata checks passed. This is not the official F-Droid scanner.')
