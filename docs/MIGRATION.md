# Moving existing events to Remind 1.5

Remind 1.5 uses the unique application ID io.github.stahpps.remind. The former com.remind.app ID is already used by an unrelated app on Google Play. The display name remains Remind. Historical tags and older APKs are unchanged.

## Existing users (1.0–1.4)

1. Keep the old app installed. Do not clear its data.
2. Install remind-transfer.apk from the official 1.5 release over that app. It uses the original ID and signing key, has versionCode 6 and appears as **Remind (transfer)**.
3. In Remind (transfer), open Settings → Export events. Save the JSON backup outside the app's private storage, for example in Downloads.
4. Install remind.1.5.apk. This is the new application and can coexist with the transfer app.
5. Open its Settings → Import events, choose the saved file, review the event count and confirm.
6. Verify the imported titles, dates, categories and alert times. Allow notifications and Alarms & reminders for the new app when requested. Android notification sound and permission settings are separate for each installation.
7. Once the import is confirmed, disable notifications in the transfer app or uninstall it to avoid receiving duplicate alerts from both apps. Keep the JSON backup.

Imports add events without replacing existing records. Importing the same backup again skips records already present; a changed event with an ID conflict is kept separately. Files are checked before importing, and storage failures do not remove existing events. Backups contain events only, not settings or signing material. They are plain JSON with personal event details; keep them private.

## New users

Install remind.1.5.apk. No transfer APK is needed.

## Build the transfer APK

The release signing key must be the same key used for the previously distributed APKs. After npm run android:prepare, run the Android Gradle wrapper with:

```powershell
cd android
.\gradlew.bat assembleRelease -PlegacyMigration --init-script ../scripts/legacy-migration.init.gradle
```

Use a separate app build output directory when producing both APKs. Never submit the transfer package to F-Droid or Google Play. The normal unsigned F-Droid build uses only io.github.stahpps.remind and ignores the private signing key.

## Pașii în română

1. Nu dezinstala aplicația veche și nu îi șterge datele. Instalează remind-transfer.apk peste ea.
2. În **Remind (transfer)**, deschide Setări → Exportă evenimentele și salvează fișierul JSON în Descărcări.
3. Instalează remind.1.5.apk. În noua aplicație: Setări → Importă evenimente → alege fișierul → confirmă importul.
4. Verifică evenimentele și permite notificările în noua instalare.
5. După verificare, oprește notificările aplicației de transfer sau dezinstaleaz-o, pentru a evita alertele duble. Păstrează copia JSON privată.
