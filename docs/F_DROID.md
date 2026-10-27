# F-Droid preparation

Remind is not yet accepted or available in the official F-Droid repository. This is upstream preparation, not an inclusion guarantee.

## Source and licensing

Original source and author-controlled artwork are GPL-3.0-or-later beginning with 1.4. LICENSE contains the full GPL; COPYRIGHT documents scope and artwork provenance. Third-party licenses remain intact, with notices bundled offline in public/licenses/. docs/npm-dependencies.json inventories every package in the npm lockfile, including build tools and optional platform packages. Its license fields are an audit aid, not independent proof of every package's contents.

No Firebase or Google Play Services plugin is required. Events and preferences stay on-device; the optional Ko-fi link opens an external service. Donation ownership is recorded in .github/FUNDING.yml and README.

## Build

Use Node 24.22.1, OpenJDK/Temurin 21, Android SDK platform 36 and build-tools 36.0.0. The Gradle wrapper pins Gradle 8.14.3. Install dependencies with npm ci --ignore-scripts, run npm test, npm run lint, npm run check:fdroid, then npm run android:unsigned. A successful build produces android/app/build/outputs/apk/release/app-release-unsigned.apk. This command passes -Pfdroid, so local release keys are ignored even when present. F-Droid's installed Gradle can be selected with FDROID_GRADLE=system.

.fdroid.yml is a draft upstream recipe using raw output mode. It downloads the pinned official Node toolchain with SHA-256 verification, installs integrity-pinned npm dependencies with lifecycle scripts disabled and builds the Java/Kotlin Capacitor libraries from source. npm and Gradle need network access for dependencies; the recipe must be validated in the current F-Droid build environment. No blanket scanignore or scanner bypass is included. Native npm build-tool binaries require reviewer approval under the toolchain policy. Do not claim an official scanner or server build passed based on local checks alone.

## Before requesting inclusion

1. Pass clean Linux build checks and F-Droid metadata lint, source scanner and server build in fdroiddata. Adjust the draft recipe to current infrastructure if necessary.
2. Create a source tag v1.4 only after validation. The draft references that tag; it must exist before submission. Use its immutable commit hash in the final build entry.
3. Check the application ID com.remind.app for conflicts. It is retained to preserve updates for current users; do not change it casually.
4. Supply genuine user-testing and maintenance evidence. The current inclusion policy normally expects three months of development, with an exception for demonstrated users. Acceptance of that exception is F-Droid's decision.
5. Submit an inclusion request or fdroiddata merge request with the source URL, license, metadata, screenshots and build results. No submission is performed by adding these files.

## Signing and updates

Private signing keys are never required by F-Droid and are excluded from Git. Official F-Droid builds are normally signed by F-Droid. GitHub APKs use the maintainer's existing key. Unless reproducible developer-signed builds are separately established and approved, users cannot update across those channels without uninstalling, which removes locally saved events. No reproducibility or signature-equivalence claim is made here.

## References

- https://f-droid.org/en/docs/Inclusion_Policy/
- https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/
- https://f-droid.org/en/docs/Build_Metadata_Reference/
- https://f-droid.org/docs/Reproducible_Builds/

Store screenshots are real browser captures at a phone viewport, with synthetic example events in English and Romanian. They illustrate the app interface, not Android system notification settings.
