# F-Droid preparation

Remind is not yet accepted or available in the official F-Droid repository. This is upstream preparation, not an inclusion guarantee.

## Submission status

A public Request for Packaging was opened on 2026-10-27: [Remind #4677](https://gitlab.com/fdroid/rfp/-/work_items/4677). It now includes the pinned 1.5 build recipe, upstream consent, screenshots and CI results. On 2026-10-27 the request was updated to the unique application ID io.github.stahpps.remind after discovering that com.remind.app belongs to an unrelated Google Play app. The request is open and awaiting F-Droid review; this is not an acceptance or publication announcement.

The [1.5 follow-up](https://gitlab.com/fdroid/rfp/-/work_items/4677#note_4101274899) documents the ID correction and the Gradle SHA-256 fix. [Linux CI](https://github.com/Stahpps/Remind/actions/runs/40548571072) passed all 24 tests, lint, metadata checks and an unsigned build. A separate Android emulator test verified the real 1.3 → transfer APK → JSON export → 1.5 import sequence. The signed transfer helper is only for existing testers and is not the app submitted for inclusion.

## Maintainer approval

Stahpps, the upstream maintainer, requests and approves inclusion of Remind in the official F-Droid repository. F-Droid may build and distribute the GPL-licensed application from the published source. Normal F-Droid signing is accepted; reuse of the GitHub release signing key is not required. This statement provides public confirmation for submissions made through a differently named GitLab account.

## Source and licensing

Original source and author-controlled artwork are GPL-3.0-or-later beginning with 1.4. LICENSE contains the full GPL; COPYRIGHT documents scope and artwork provenance. Third-party licenses remain intact, with notices bundled offline in public/licenses/. docs/npm-dependencies.json inventories every package in the npm lockfile, including build tools and optional platform packages. Its license fields are an audit aid, not independent proof of every package's contents.

No Firebase or Google Play Services plugin is required. Events and preferences stay on-device; the optional Ko-fi link opens an external service. Donation ownership is recorded in .github/FUNDING.yml and README.

## Build

Use Node 24.22.1, OpenJDK/Temurin 21, Android SDK platform 36 and build-tools 36.0.0. The Gradle wrapper pins Gradle 8.14.3. Install dependencies with npm ci --ignore-scripts, run npm test, npm run lint, npm run check:fdroid, then npm run android:unsigned. A successful build produces android/app/build/outputs/apk/release/app-release-unsigned.apk. This command passes -Pfdroid, so local release keys are ignored even when present. F-Droid's installed Gradle can be selected with FDROID_GRADLE=system.

.fdroid.yml is a draft upstream recipe using raw output mode. It downloads the pinned official Node toolchain with SHA-256 verification, installs integrity-pinned npm dependencies with lifecycle scripts disabled and builds the Java/Kotlin Capacitor libraries from source. npm and Gradle need network access for dependencies; the recipe must be validated in the current F-Droid build environment. No blanket scanignore or scanner bypass is included. Native npm build-tool binaries require reviewer approval under the toolchain policy. Do not claim an official scanner or server build passed based on local checks alone.

## Before requesting inclusion

1. Pass clean Linux build checks and F-Droid metadata lint, source scanner and server build in fdroiddata. Adjust the draft recipe to current infrastructure if necessary.
2. Create a source tag v1.5 only after validation. The draft references that tag; it must exist before submission. Use its immutable commit hash in the final build entry.
3. The application ID is io.github.stahpps.remind starting with 1.5. The earlier com.remind.app ID conflicts with an unrelated Google Play app and is used only by the temporary transfer APK. See MIGRATION.md.
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
