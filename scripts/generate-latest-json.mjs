import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
    result[key] = value;
    if (value !== "true") i += 1;
  }
  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFileIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return false;
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function collectReleaseNotes(entry) {
  if (!entry) return "";
  const sections = [];
  const appendSection = (title, items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    sections.push(`${title}\n${items.map((item) => `- ${item}`).join("\n")}`);
  };
  appendSection("Added", entry.added);
  appendSection("Improved", entry.improved);
  appendSection("Fixed", entry.fixed);
  return sections.join("\n\n");
}

function findBundleAsset(bundleDir, version, matcher) {
  if (!fs.existsSync(bundleDir)) return null;
  const candidates = fs.readdirSync(bundleDir)
    .filter((fileName) => fileName.includes(version))
    .filter((fileName) => matcher(fileName))
    .sort((left, right) => left.localeCompare(right));
  return candidates.length > 0 ? path.join(bundleDir, candidates[0]) : null;
}

const args = parseArgs(process.argv.slice(2));
const packageJson = readJson(path.join(rootDir, "package.json"));
const tauriConfig = readJson(path.join(rootDir, "src-tauri", "tauri.conf.json"));
const releaseNotes = readJson(path.join(rootDir, "src", "renderer", "public", "release-notes.json"));

const version = args.version || packageJson.version;
const repo = args.repo || "JustDream-LoL/LucidPad";
const outputDir = args["output-dir"] || "release";

if (packageJson.version !== version) {
  throw new Error(`package.json version mismatch: expected ${version}, got ${packageJson.version}`);
}
if (tauriConfig.version !== version) {
  throw new Error(`src-tauri/tauri.conf.json version mismatch: expected ${version}, got ${tauriConfig.version}`);
}

const bundleRoot = path.join(rootDir, "src-tauri", "target", "release", "bundle");
const nsisInstaller = findBundleAsset(path.join(bundleRoot, "nsis"), version, (name) => name.endsWith(".exe") && !name.endsWith(".exe.sig"));
const msiInstaller = findBundleAsset(path.join(bundleRoot, "msi"), version, (name) => name.endsWith(".msi") && !name.endsWith(".msi.sig"));
const preferredInstaller = nsisInstaller || msiInstaller;

if (!preferredInstaller) {
  throw new Error("No Windows installer was found in src-tauri/target/release/bundle");
}

const preferredSig = `${preferredInstaller}.sig`;
if (!fs.existsSync(preferredSig)) {
  throw new Error(`Missing updater signature for ${path.basename(preferredInstaller)}`);
}

const releaseDir = path.join(rootDir, outputDir, `v${version}`);
ensureDir(releaseDir);

const copiedFiles = [];
for (const assetPath of [nsisInstaller, `${nsisInstaller}.sig`, msiInstaller, msiInstaller ? `${msiInstaller}.sig` : null]) {
  if (!assetPath) continue;
  const targetPath = path.join(releaseDir, path.basename(assetPath));
  if (copyFileIfExists(assetPath, targetPath)) {
    copiedFiles.push(path.basename(assetPath));
  }
}

const notesEntry = releaseNotes[version];
const pubDate = notesEntry?.date ? new Date(`${notesEntry.date}T00:00:00Z`).toISOString() : new Date().toISOString();
const preferredFileName = path.basename(preferredInstaller);
const preferredSigContent = fs.readFileSync(preferredSig, "utf8").trim();

const latestJson = {
  version,
  notes: collectReleaseNotes(notesEntry),
  pub_date: pubDate,
  platforms: {
    "windows-x86_64": {
      signature: preferredSigContent,
      url: `https://github.com/${repo}/releases/download/v${version}/${encodeURIComponent(preferredFileName)}`
    }
  }
};

fs.writeFileSync(path.join(releaseDir, "latest.json"), `${JSON.stringify(latestJson, null, 2)}\n`, "utf8");

const instructions = [
  `Upload these files to GitHub Release v${version}:`,
  ...copiedFiles.map((fileName) => `- ${fileName}`),
  "- latest.json",
  "",
  `Updater endpoint expected by the app: https://github.com/${repo}/releases/latest/download/latest.json`
].join("\n");

fs.writeFileSync(path.join(releaseDir, "UPLOAD.txt"), `${instructions}\n`, "utf8");

console.log(`Prepared release assets in ${releaseDir}`);
for (const fileName of [...copiedFiles, "latest.json", "UPLOAD.txt"]) {
  console.log(` - ${fileName}`);
}
