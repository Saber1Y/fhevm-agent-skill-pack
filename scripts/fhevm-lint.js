#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const COLORS = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function colorize(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function findSolFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
      files.push(...findSolFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".sol")) {
      files.push(fullPath);
    }
  }
  return files;
}

const checks = {
  MISSING_CONFIG: {
    name: "Missing ZamaEthereumConfig",
    severity: "error",
    description: "Contract must inherit from network config (e.g., SepoliaConfig)",
    test: (content) => {
      const hasContract = /contract\s+\w+/.test(content);
      if (!hasContract) return [];

      const hasConfig = /is\s+(SepoliaConfig|LocalFHEVMConfig|TestnetConfig|MainnetConfig|ZamaEthereumConfig)/.test(content);
      const hasImport = /ZamaConfig\.sol|FHEVMConfig/.test(content);

      const errors = [];
      if (hasContract && !hasConfig) {
        errors.push("Contract does not extend a network config (SepoliaConfig, LocalFHEVMConfig, etc.)");
      }
      if (hasContract && !hasImport) {
        errors.push("Missing import for network config (ZamaConfig.sol)");
      }
      return errors;
    },
  },

  MISSING_ALLOW_THIS: {
    name: "Missing FHE.allowThis()",
    severity: "error",
    description: "Encrypted values stored in state must have FHE.allowThis()",
    test: (content) => {
      const errors = [];
      const fheOperations = content.match(/FHE\.(add|sub|mul|div|rem|select|min|max|and|or|xor|not|shl|shr)\s*\(/g);
      const allowThisCalls = content.match(/FHE\.allowThis\s*\(/g);

      if (fheOperations && fheOperations.length > 0) {
        const hasAllowThis = allowThisCalls && allowThisCalls.length > 0;
        const hasStateAssign = /=\s*FHE\./.test(content);

        if (hasStateAssign && !hasAllowThis) {
          errors.push("FHE operations assigned to state but no FHE.allowThis() found on results");
        }
      }

      const fromExternalWithoutAllow = content.match(/FHE\.fromExternal\s*\([^)]+\)\s*;/g);
      if (fromExternalWithoutAllow) {
        const hasAllowThis = content.includes("FHE.allowThis");
        if (!hasAllowThis) {
          errors.push("FHE.fromExternal() used without FHE.allowThis()");
        }
      }

      return errors;
    },
  },

  MISSING_ALLOW: {
    name: "Missing FHE.allow() for user",
    severity: "warning",
    description: "Users need FHE.allow() to decrypt their encrypted values",
    test: (content) => {
      const errors = [];
      const hasFromExternal = content.includes("FHE.fromExternal");
      const hasAllowUser = /FHE\.allow\s*\([^,]+,\s*(msg\.sender|user|to|account|_user)/.test(content);

      if (hasFromExternal && !hasAllowUser) {
        errors.push("FHE.fromExternal() used but no FHE.allow() found for user decryption access");
      }

      const hasBalanceMapping = /mapping\s*\(\s*address\s*=>\s*euint/.test(content);
      if (hasBalanceMapping && !hasAllowUser) {
        errors.push("Encrypted balance mapping exists but no FHE.allow() for users");
      }

      return errors;
    },
  },

  ENCRYPTED_REQUIRE: {
    name: "Encrypted value in require()",
    severity: "error",
    description: "Encrypted values cannot be used in standard require() conditions",
    test: (content) => {
      const errors = [];
      const requireMatches = content.match(/require\s*\([^)]*\)/g);

      if (requireMatches) {
        for (const req of requireMatches) {
          if (/balances\[|FHE\.|euint|ebool/.test(req)) {
            errors.push(`Encrypted value found in require(): "${req.substring(0, 80)}..."`);
          }
        }
      }

      if (/if\s*\s*\(/.test(content) && /FHE\.gt|FHE\.lt|FHE\.gte|FHE\.lte|FHE\.eq/.test(content)) {
        errors.push("Encrypted comparison used in if condition — use FHE.select() instead");
      }

      return errors;
    },
  },

  RETURN_NO_ACL: {
    name: "Returning encrypted value without ACL",
    severity: "error",
    description: "Functions returning encrypted values must have ACL set",
    test: (content) => {
      const errors = [];
      const returnEncrypted = content.match(/returns\s*\(euint\d+|ebool|eaddress\)/g);

      if (returnEncrypted) {
        const hasAllowThis = content.includes("FHE.allowThis");
        const hasAllow = content.includes("FHE.allow");

        if (!hasAllowThis && !hasAllow) {
          errors.push("Function returns encrypted value but no ACL (FHE.allowThis/FHE.allow) found");
        }
      }

      return errors;
    },
  },

  MISSING_PROOF: {
    name: "Missing inputProof parameter",
    severity: "error",
    description: "External encrypted inputs require a bytes calldata inputProof",
    test: (content) => {
      const errors = [];
      const externalTypes = content.match(/externalEuint\d+|externalEbool|externalEaddress/g);

      if (externalTypes) {
        const functionSignatures = content.match(/function\s+\w+\s*\([^)]*\)/g);
        if (functionSignatures) {
          for (const sig of functionSignatures) {
            const hasExternal = /externalEuint\d+|externalEbool|externalEaddress/.test(sig);
            const hasProof = /bytes\s+calldata\s+\w*[Pp]roof/.test(sig);

            if (hasExternal && !hasProof) {
              errors.push(`Function with external encrypted input missing proof parameter: "${sig.substring(0, 80)}..."`);
            }
          }
        }
      }

      const fromExternalCalls = content.match(/FHE\.fromExternal\s*\([^)]+\)/g);
      if (fromExternalCalls) {
        for (const call of fromExternalCalls) {
          const args = call.match(/FHE\.fromExternal\s*\(([^)]+)\)/);
          if (args && args[1].split(",").length < 2) {
            errors.push(`FHE.fromExternal() called without proof: "${call}"`);
          }
        }
      }

      return errors;
    },
  },

  DECRYPT_IN_SOLIDITY: {
    name: "Attempting to decrypt in Solidity",
    severity: "warning",
    description: "Solidity cannot decrypt FHEVM ciphertexts directly",
    test: (content) => {
      const errors = [];

      const castPatterns = [
        /uint\d+\s*\(\s*euint/,
        /uint\d+\s*\(\s*encrypted/,
        /\)\s*as\s+uint\d+/,
      ];

      for (const pattern of castPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          errors.push("Attempting to cast encrypted type to plaintext integer — decryption must happen on frontend");
        }
      }

      if (/FHE\.decrypt\s*\(/.test(content)) {
        errors.push("FHE.decrypt() used — this decrypts on-chain and may leak information");
      }

      return errors;
    },
  },

  ENCRYPTED_EVENT: {
    name: "Encrypted handle in event",
    severity: "warning",
    description: "Encrypted handles in events are meaningless to off-chain listeners",
    test: (content) => {
      const errors = [];
      const events = content.match(/event\s+\w+\s*\([^)]*\)/g);

      if (events) {
        for (const event of events) {
          if (/euint\d+|ebool|eaddress/.test(event)) {
            errors.push(`Encrypted type found in event: "${event}"`);
          }
        }
      }

      return errors;
    },
  },
};

function lintFile(filePath, content) {
  const relativePath = path.relative(process.cwd(), filePath);
  const results = { file: relativePath, errors: [], warnings: [] };

  for (const [ruleId, check] of Object.entries(checks)) {
    const findings = check.test(content);
    for (const finding of findings) {
      const issue = { rule: ruleId, name: check.name, message: finding, severity: check.severity };
      if (check.severity === "error") {
        results.errors.push(issue);
      } else {
        results.warnings.push(issue);
      }
    }
  }

  return results;
}

function runLint(targetDir) {
  console.log(colorize("bold", "\n🔒 FHEVM Linter — Scanning for common mistakes\n"));

  const solFiles = findSolFiles(targetDir);

  if (solFiles.length === 0) {
    console.log(colorize("yellow", "No .sol files found in"), targetDir);
    process.exit(0);
  }

  console.log(colorize("blue", `Found ${solFiles.length} Solidity file(s)\n`));

  let totalErrors = 0;
  let totalWarnings = 0;
  let cleanFiles = 0;

  for (const filePath of solFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const results = lintFile(filePath, content);

    if (results.errors.length === 0 && results.warnings.length === 0) {
      console.log(colorize("green", `✓ ${results.file} — clean`));
      cleanFiles++;
      continue;
    }

    console.log(colorize("yellow", `✗ ${results.file}`));

    for (const issue of [...results.errors, ...results.warnings]) {
      const color = issue.severity === "error" ? "red" : "yellow";
      const prefix = issue.severity === "error" ? "  ERROR" : "  WARN ";
      console.log(colorize(color, `${prefix} [${issue.rule}] ${issue.message}`));
      console.log(colorize(color, `         ${issue.description}`));
    }

    totalErrors += results.errors.length;
    totalWarnings += results.warnings.length;
    console.log("");
  }

  console.log(colorize("bold", "\n─".repeat(50)));
  console.log(colorize("green", `✓ ${cleanFiles} clean file(s)`));

  if (totalErrors > 0) {
    console.log(colorize("red", `✗ ${totalErrors} error(s) found`));
  }
  if (totalWarnings > 0) {
    console.log(colorize("yellow", `⚠ ${totalWarnings} warning(s) found`));
  }

  console.log("─".repeat(50) + "\n");

  if (totalErrors > 0) {
    console.log(colorize("red", "FHEVM lint failed. Fix errors before testing or deploying.\n"));
    process.exit(1);
  } else {
    console.log(colorize("green", "FHEVM lint passed!\n"));
    process.exit(0);
  }
}

const targetDir = process.argv[2] || path.join(process.cwd(), "contracts");
runLint(targetDir);
