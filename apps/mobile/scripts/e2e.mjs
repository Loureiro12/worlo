#!/usr/bin/env node
/**
 * Release builds for E2E without paying for a native build on every change.
 *
 *   node scripts/e2e.mjs fingerprint <ios|android>  → prints the native fingerprint
 *   node scripts/e2e.mjs build <ios|android>        → e2e-artifacts/<platform>-latest.<app|apk>
 *   node scripts/e2e.mjs install <ios|android>      → installs it on the booted simulator/emulator
 *
 * The native binary is cached under its Expo fingerprint (native deps, config
 * plugins, app config...). While the fingerprint is unchanged, only the JS bundle
 * is rebuilt and repacked into the cached binary (seconds instead of minutes).
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createFingerprintAsync } from '@expo/fingerprint';

const [command, platform] = process.argv.slice(2);
if (
  !['fingerprint', 'build', 'install'].includes(command) ||
  !['ios', 'android'].includes(platform)
) {
  console.error('Usage: e2e.mjs <fingerprint|build|install> <ios|android>');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'e2e-artifacts');
const ext = platform === 'ios' ? 'app' : 'apk';
const latest = path.join(outDir, `${platform}-latest.${ext}`);

const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
const log = (msg) => console.error(`[e2e] ${msg}`);

async function fingerprint() {
  const { hash } = await createFingerprintAsync(root, { platforms: [platform] });
  return hash;
}

function nativeBuild() {
  run('npx', ['expo', 'prebuild', '--platform', platform]);
  if (platform === 'ios') {
    run('xcodebuild', [
      '-workspace',
      'ios/Worlo.xcworkspace',
      '-scheme',
      'Worlo',
      '-configuration',
      'Release',
      '-sdk',
      'iphonesimulator',
      '-destination',
      'generic/platform=iOS Simulator',
      '-derivedDataPath',
      'ios/build',
      'CODE_SIGNING_ALLOWED=NO',
      '-quiet',
      'build',
    ]);
    return path.join(root, 'ios/build/Build/Products/Release-iphonesimulator/Worlo.app');
  }
  run('./gradlew', ['assembleRelease', '--quiet'], path.join(root, 'android'));
  return path.join(root, 'android/app/build/outputs/apk/release/app-release.apk');
}

async function build() {
  mkdirSync(outDir, { recursive: true });
  const hash = await fingerprint();
  const base = path.join(outDir, `${platform}-${hash}.${ext}`);

  rmSync(latest, { recursive: true, force: true });
  if (existsSync(base)) {
    log(`native fingerprint ${hash.slice(0, 8)} cached → repacking JS only`);
    run('npx', [
      'repack-app',
      '--platform',
      platform,
      '--source-app',
      base,
      '--output',
      latest,
      '--js-bundle-only',
    ]);
    return;
  }

  log(`native fingerprint ${hash.slice(0, 8)} changed → full native build`);
  for (const old of readdirSync(outDir)) {
    if (old.startsWith(`${platform}-`)) rmSync(path.join(outDir, old), { recursive: true });
  }
  const artifact = nativeBuild();
  cpSync(artifact, base, { recursive: true });
  cpSync(artifact, latest, { recursive: true });
}

function install() {
  if (platform === 'ios') run('xcrun', ['simctl', 'install', 'booted', latest]);
  else run('adb', ['install', '-r', latest]);
}

if (command === 'fingerprint') console.log(await fingerprint());
if (command === 'build') await build();
if (command === 'install') install();
