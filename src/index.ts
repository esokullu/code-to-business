#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import { readProjectFiles, chunkText } from "./fsUtils.js";
import { chatCompletion } from "./lmStudio.js";
import { SYSTEM_SUMMARIZER, USER_SUMMARIZER, SYSTEM_PATENT, USER_PATENT } from "./prompts.js";
import fs from "node:fs/promises";

const program = new Command();

program
  .name("provisional-patent-gen")
  .description("Generate a USPTO provisional patent draft from a TSX+Solidity project using LM Studio at http://127.0.0.1:1234")
  .argument("<folder>", "Root folder of your project")
  .option("-o, --out <file>", "Output file (Markdown)", "provisional_draft.md")
  .option("--model <name>", "LM Studio model id", process.env.LMSTUDIO_MODEL || "local-model")
  .option("--base <url>", "LM Studio base URL", process.env.LMSTUDIO_BASE_URL || "http://127.0.0.1:1234")
  .option("--max-chars <n>", "Max chars per chunk for summarization", (v) => parseInt(v, 10), 4000)
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

    // 1) Summarize each file (chunked)
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
        // Small delay helps some local runtimes breathe
        await new Promise(r => setTimeout(r, 50));
      }
      perFileSummaries.push(`## ${f.relPath}\n${chunkSummaries.join("\n\n")}`);
      console.log(`Summarized: ${f.relPath}`);
    }

    const combinedSummaries = perFileSummaries.join("\n\n");

    // 2) Patent draft synthesis
    const projectName = opts.title || path.basename(root);
    const patentDraft = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PATENT },
        { role: "user", content: USER_PATENT(projectName, opts.note, combinedSummaries) }
      ],
      { baseUrl: opts.base, model: opts.model, temperature: 0.2, maxTokens: 8192 }
    );

    // 3) Write output
    await fs.writeFile(opts.out, patentDraft, "utf8");
    console.log(`\n✅ Provisional draft written to ${opts.out}`);
    console.log(`Hint: Review and add figure drawings before filing. Provisional does not require claims, but you may later expand "Potential Claim Concepts".`);
  });

program.parseAsync(process.argv);

