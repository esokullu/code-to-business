#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs/promises";
import { readProjectFiles, chunkText } from "./fsUtils.js";
import { chatCompletion } from "./lmStudio.js";
import {
  SYSTEM_SUMMARIZER,
  USER_SUMMARIZER,
  SYSTEM_GOVERNANCE,
  USER_GOVERNANCE,
} from "./prompts.js";

const program = new Command();

program
  .name("aragon-governance-analyzer")
  .description("Analyze Solidity contracts and recommend which functions should be controlled by Aragon community votes (LM Studio @ http://127.0.0.1:1234)")
  .argument("<folder>", "Root folder of your project (will scan contracts/ by default)")
  .option("-o, --out <file>", "Output file (Markdown)", "aragon_governance_report.md")
  .option("--model <name>", "LM Studio model id", process.env.LMSTUDIO_MODEL || "local-model")
  .option("--base <url>", "LM Studio base URL", process.env.LMSTUDIO_BASE_URL || "http://127.0.0.1:1234")
  .option("--max-chars <n>", "Max chars per chunk", (v) => parseInt(v, 10), 4000)
  .option("--include <glob...>", "Override globs (default scans contracts/**/*.sol plus key config files)")
  .option("--title <text>", "Report title", "")
  .option("--note <text>", "High-level governance intent / author note", "")
  .action(async (folder, opts) => {
    const root = path.resolve(process.cwd(), folder);
    console.log(`Reading project at: ${root}`);

    // Default to Solidity in contracts/, but allow override via --include
    const defaultGlobs = [
      "contracts/**/*.sol",
      "foundry.toml",
      "hardhat.config.*",
      "package.json",
      "README.md"
    ];
    const files = await readProjectFiles(root, opts.include || defaultGlobs);
    if (!files.length) {
      console.error("No files found. Check that contracts/ exists or pass --include globs.");
      process.exit(1);
    }

    // 1) Summarize for governance
    const perFileSummaries: string[] = [];
    for (const f of files) {
      const chunks = chunkText(f.content, opts.maxChars);
      const chunkSummaries: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const user = USER_SUMMARIZER(f.relPath, i, chunks.length, chunks[i]);
        const content = await chatCompletion(
          [
            { role: "system", content: SYSTEM_SUMMARIZER },
            { role: "user", content: user }
          ],
          { baseUrl: opts.base, model: opts.model, temperature: 0.1, maxTokens: 1200 }
        );
        chunkSummaries.push(content.trim());
        await new Promise((r) => setTimeout(r, 50));
      }
      perFileSummaries.push(`## ${f.relPath}\n${chunkSummaries.join("\n\n")}`);
      console.log(`Summarized: ${f.relPath}`);
    }
    const combinedSummaries = perFileSummaries.join("\n\n");

    // 2) Governance synthesis → which functions should be DAO-gated
    const projectName = opts.title || path.basename(root);
    const report = await chatCompletion(
      [
        { role: "system", content: SYSTEM_GOVERNANCE },
        { role: "user", content: USER_GOVERNANCE(projectName, opts.note, combinedSummaries) }
      ],
      { baseUrl: opts.base, model: opts.model, temperature: 0.2, maxTokens: 8192 }
    );

    // 3) Write output
    await fs.writeFile(opts.out, report, "utf8");
    console.log(`\n✅ Aragon governance report written to ${opts.out}`);
    console.log(`Tip: Grant DAO control over upgrades, pausability, treasury, and parameter setters first; then iterate on finer roles.`);
  });

program.parseAsync(process.argv);

