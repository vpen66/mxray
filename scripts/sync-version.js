const fs = require('fs');
const path = require('path');

// Extract version from command line argument or environment variables
let version = process.argv[2] || process.env.CI_COMMIT_TAG || process.env.GITHUB_REF_NAME;

if (!version) {
  console.error('Error: No version provided (set CI_COMMIT_TAG or pass as argument).');
  process.exit(1);
}

// Clean 'v' prefix if present
if (version.startsWith('v')) {
  version = version.substring(1);
}

const semverRegex = /^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.+-]+)?$/;
if (!semverRegex.test(version)) {
  console.error(`Error: Invalid semver version '${version}'`);
  process.exit(1);
}

console.log(`Syncing project configuration versions to: ${version}`);

// 1. Update package.json
const pkgPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated package.json to ${version}`);
}

// 2. Update src-tauri/tauri.conf.json
const tauriPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
if (fs.existsSync(tauriPath)) {
  const tauri = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));
  tauri.version = version;
  fs.writeFileSync(tauriPath, JSON.stringify(tauri, null, 2) + '\n');
  console.log(`Updated tauri.conf.json to ${version}`);
}

// 3. Update src-tauri/Cargo.toml
const cargoPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
if (fs.existsSync(cargoPath)) {
  let cargo = fs.readFileSync(cargoPath, 'utf8');
  cargo = cargo.replace(/^version\s*=\s*"[^"]*"/m, `version = "${version}"`);
  fs.writeFileSync(cargoPath, cargo);
  console.log(`Updated Cargo.toml version to ${version}`);
}
