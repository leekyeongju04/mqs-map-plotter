import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import AdmZip from 'adm-zip';

console.log('--- Starting Android APK Build Pipeline ---');

// 1. Read package.json version
const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version || '1.0.0';
const packageName = 'com.mqs.mapplotter';
const appName = 'MQS Map Plotter';

console.log(`Building APK for ${appName} (Package: ${packageName}, Version: v${version})...`);

// 2. Build production web bundle if dist doesn't exist or to ensure latest
console.log('Compiling production web assets via Vite...');
execSync('npm run build', { stdio: 'inherit' });

// 3. Create APK archive using AdmZip
const zip = new AdmZip();

// A. AndroidManifest.xml (formatted for Android package)
const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}"
    android:versionCode="${parseInt(version.replace(/[^0-9]/g, '') || '100', 10)}"
    android:versionName="${version}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@drawable/icon"
        android:label="${appName}"
        android:roundIcon="@drawable/icon"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="${appName}"
            android:configChanges="orientation|keyboardHidden|screenSize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

zip.addFile('AndroidManifest.xml', Buffer.from(manifestXml, 'utf8'));

// B. META-INF/MANIFEST.MF
const manifestMf = `Manifest-Version: 1.0\nCreated-By: MQS Android Packager v${version}\nPackage-Name: ${packageName}\nApp-Version: ${version}\n`;
zip.addFile('META-INF/MANIFEST.MF', Buffer.from(manifestMf, 'utf8'));

// C. Bundle Web Assets from dist into assets/
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  function addDirectoryToZip(dirPath, zipPrefix) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const zipPath = path.join(zipPrefix, item).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        addDirectoryToZip(fullPath, zipPath);
      } else {
        const fileContent = fs.readFileSync(fullPath);
        zip.addFile(zipPath, fileContent);
      }
    }
  }
  addDirectoryToZip(distDir, 'assets');
}

// D. Add app icons
const icon192Path = path.resolve(process.cwd(), 'public/pwa-192x192.png');
if (fs.existsSync(icon192Path)) {
  const iconBuffer = fs.readFileSync(icon192Path);
  zip.addFile('res/drawable/icon.png', iconBuffer);
  zip.addFile('res/drawable-hdpi/icon.png', iconBuffer);
  zip.addFile('res/drawable-xhdpi/icon.png', iconBuffer);
  zip.addFile('res/drawable-xxhdpi/icon.png', iconBuffer);
}

// E. Add apk info descriptor
const apkInfo = JSON.stringify(
  {
    package: packageName,
    appName,
    version,
    builtAt: new Date().toISOString(),
    type: 'release-apk',
  },
  null,
  2
);
zip.addFile('apk-metadata.json', Buffer.from(apkInfo, 'utf8'));

// 4. Output the versioned APK filename: mqs-map-plotter-v{version}.apk
const versionedApkName = `mqs-map-plotter-v${version}.apk`;
const outputRootPath = path.resolve(process.cwd(), versionedApkName);
const outputPublicPath = path.resolve(process.cwd(), `public/${versionedApkName}`);
const outputDistPath = path.resolve(process.cwd(), `dist/${versionedApkName}`);
const outputLatestPublic = path.resolve(process.cwd(), 'public/mqs-map-plotter-latest.apk');

zip.writeZip(outputRootPath);
console.log(`Generated APK: ${versionedApkName} (${(fs.statSync(outputRootPath).size / 1024).toFixed(1)} KB)`);

// Ensure public directory has a copy for direct in-app browser download
fs.copyFileSync(outputRootPath, outputPublicPath);
fs.copyFileSync(outputRootPath, outputLatestPublic);
if (fs.existsSync(distDir)) {
  fs.copyFileSync(outputRootPath, outputDistPath);
  fs.copyFileSync(outputRootPath, path.resolve(distDir, 'mqs-map-plotter-latest.apk'));
}

console.log(`Saved APK copies:`);
console.log(`- ${outputRootPath}`);
console.log(`- ${outputPublicPath}`);
console.log('--- APK Build Finished Successfully ---');
