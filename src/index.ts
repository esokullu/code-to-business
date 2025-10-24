#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import { readProjectFiles, chunkText } from "./fsUtils.js";
import { chatCompletion } from "./lmStudio.js";
import { SYSTEM_SUMMARIZER, USER_SUMMARIZER, SYSTEM_PATENT, USER_PATENT, SYSTEM_COMPRESS, USER_COMPRESS } from "./prompts.js";
import { SYSTEM_GOVERNANCE, USER_GOVERNANCE } from "./prompts-aragon.js";
import { SYSTEM_WHITEPAPER, USER_WHITEPAPER } from "./prompts-whitepaper.js";
import fs from "node:fs/promises";

const program = new Command();

program
  .name("code-artifacts-gen")
  .description("Single-pass summarization, then generate patent, Aragon governance report, and whitepaper using LM Studio at http://127.0.0.1:1234")
  .argument("<folder>", "Root folder of your project")
  .option("--patent", "Generate provisional patent output")
  .option("--aragon", "Generate Aragon governance report output")
  .option("--whitepaper", "Generate Web3 whitepaper output")
  .option("--patent-out <file>", "Patent output file (Markdown)", "provisional_draft.md")
  .option("--aragon-out <file>", "Aragon report output file (Markdown)", "aragon_governance_report.md")
  .option("--whitepaper-out <file>", "Whitepaper output file (Markdown)", "whitepaper.md")
  .option("--model <name>", "LM Studio model id", process.env.LMSTUDIO_MODEL || "local-model")
  .option("--base <url>", "LM Studio base URL", process.env.LMSTUDIO_BASE_URL || "http://127.0.0.1:1234")
  .option("--max-chars <n>", "Max chars per chunk for summarization", (v) => parseInt(v, 10), 4000)
  .option("--compress-target <n>", "Target max characters for compressed summaries", (v) => parseInt(v, 10), 8000)
  .option("--include <glob...>", "Additional file globs to include")
  .option("--title <text>", "Override project title", "")
  .option("--note <text>", "High-level author note / context", "")
  .action(async (folder, opts) => {
    const root = path.resolve(process.cwd(), folder);
    console.log(`Reading project at: ${root}`);
    const files = await readProjectFiles(root, opts.include);
    if (!files.length) {
      console.error("No files found. Adjust globs or check the folder.");
      process.exit(1);
    }

    const selectedAny = opts.patent || opts.aragon || opts.whitepaper;
    const doPatent = selectedAny ? !!opts.patent : true;
    const doAragon = selectedAny ? !!opts.aragon : true;
    const doWhitepaper = selectedAny ? !!opts.whitepaper : true;

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
        await new Promise(r => setTimeout(r, 50));
      }
      perFileSummaries.push(`## ${f.relPath}\n${chunkSummaries.join("\n\n")}`);
      console.log(`Summarized: ${f.relPath}`);
    }

    const combinedSummaries = perFileSummaries.join("\n\n");
    const projectName = opts.title || path.basename(root);

    // Compress the aggregated summaries to keep the final prompts reliably small
    const compressedSummaries = await chatCompletion(
      [
        { role: "system", content: SYSTEM_COMPRESS },
        { role: "user", content: USER_COMPRESS(combinedSummaries, opts.compressTarget) }
      ],
      { baseUrl: opts.base, model: opts.model, temperature: 0.1, maxTokens: 2048, requestTimeoutMs: 300000, retries: 4 }
    );

    if (doPatent) {
      const patentDraft = await chatCompletion(
        [
          { role: "system", content: SYSTEM_PATENT },
          { role: "user", content: USER_PATENT(projectName, opts.note, compressedSummaries) }
        ],
        { baseUrl: opts.base, model: opts.model, temperature: 0.2, maxTokens: 8192, requestTimeoutMs: 300000, retries: 4 }
      );
      await fs.writeFile(opts["patentOut"] || opts["patent-out"] || opts.patentOut || "provisional_draft.md", patentDraft, "utf8");
      console.log(`\n✅ Provisional draft written to ${opts["patentOut"] || opts["patent-out"] || "provisional_draft.md"}`);
    }

    if (doAragon) {
      const aragonReport = await chatCompletion(
        [
          { role: "system", content: SYSTEM_GOVERNANCE },
          { role: "user", content: USER_GOVERNANCE(projectName, opts.note, compressedSummaries) }
        ],
        { baseUrl: opts.base, model: opts.model, temperature: 0.2, maxTokens: 8192, requestTimeoutMs: 300000, retries: 4 }
      );
      await fs.writeFile(opts["aragonOut"] || opts["aragon-out"] || opts.aragonOut || "aragon_governance_report.md", aragonReport, "utf8");
      console.log(`\n✅ Aragon governance report written to ${opts["aragonOut"] || opts["aragon-out"] || "aragon_governance_report.md"}`);
    }

    if (doWhitepaper) {
      const whitepaper = await chatCompletion(
        [
          { role: "system", content: SYSTEM_WHITEPAPER },
          { role: "user", content: USER_WHITEPAPER(projectName, opts.note, compressedSummaries) }
        ],
        { baseUrl: opts.base, model: opts.model, temperature: 0.2, maxTokens: 8192, requestTimeoutMs: 300000, retries: 4 }
      );
      await fs.writeFile(opts["whitepaperOut"] || opts["whitepaper-out"] || opts.whitepaperOut || "whitepaper.md", whitepaper, "utf8");
      console.log(`\n✅ Whitepaper written to ${opts["whitepaperOut"] || opts["whitepaper-out"] || "whitepaper.md"}`);
    }
  });

program.parseAsync(process.argv);

