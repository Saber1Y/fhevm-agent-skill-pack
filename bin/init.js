#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const COLORS = {
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function colorize(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

const TARGET_DIR = process.cwd();

const FILES_TO_COPY = [
  { src: "SKILL.md", dest: "SKILL.md" },
  { src: "references", dest: "references", isDir: true },
  { src: "scripts/fhevm-lint.js", dest: "scripts/fhevm-lint.js" },
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function updatePackageJson() {
  const pkgPath = path.join(TARGET_DIR, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.log(colorize("yellow", "No package.json found. Skipping script injection."));
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  if (!pkg.scripts) pkg.scripts = {};

  pkg.scripts["fhevm:lint"] = "node scripts/fhevm-lint.js";

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(colorize("green", "✓ Added fhevm:lint script to package.json"));
}

function main() {
  console.log(colorize("bold", "\n🔒 FHEVM Agent Skill — Initializing\n"));

  const skillRoot = path.resolve(__dirname, "..");

  let copied = 0;
  for (const file of FILES_TO_COPY) {
    const src = path.join(skillRoot, file.src);
    const dest = path.join(TARGET_DIR, file.dest);

    if (!fs.existsSync(src)) {
      console.log(colorize("yellow", `⚠ Source not found: ${file.src}`));
      continue;
    }

    copyRecursive(src, dest);
    console.log(colorize("green", `✓ Copied ${file.src} → ${file.dest}`));
    copied++;
  }

  updatePackageJson();

  console.log(colorize("bold", `\n${copied} file(s)/directory(ies) installed.\n`));
  console.log(colorize("blue", "Next steps:"));
  console.log(`  1. Drop SKILL.md into your AI agent workspace (Cursor, Claude Code, etc.)`);
  console.log(`  2. Run: npm run fhevm:lint`);
  console.log(`  3. Prompt: "Build a confidential voting dApp using FHEVM"`);
  console.log("");
}

main();
