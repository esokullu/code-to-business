# Patent/Whitepaper/Governance Generator

Single-pass code summarization, then parallel synthesis of:
- Provisional patent draft (USPTO-style)
- Aragon governance report (DAO-gated controls mapping)
- Web3 whitepaper

Backed by a local LM Studio server.

## Install

```bash
npm install
npm run build
```

Ensure LM Studio is running locally and serving OpenAI-compatible API:
- Default base URL: http://127.0.0.1:1234
- Or specify with `--base`

## CLI

Entry point: `node dist/index.js <folder> [options]`

- `--patent` Generate provisional patent
- `--aragon` Generate Aragon governance report
- `--whitepaper` Generate Web3 whitepaper
  - If none selected, all three are generated.

- `--patent-out <file>` Output file for patent (default: `provisional_draft.md`)
- `--aragon-out <file>` Output file for governance (default: `aragon_governance_report.md`)
- `--whitepaper-out <file>` Output file for whitepaper (default: `whitepaper.md`)

- `--include <glob...>` Extra globs to include in scan (adds to default patterns)
- `--exclude <glob...>` Globs to exclude from scan (e.g., `web/**` `app/**`)
- `--max-chars <n>` Max characters per chunk for summarization (default: 4000, set to 0 to disable chunking)
- `--compress-target <n>` Target characters for compressed aggregated summaries (default: 8000, set to 0 to disable compression)
- `--compress-intermediate-mult <n>` Intermediate multiplier for two-pass compression (default: 2.5, higher = less aggressive, range: 1.5-4.0)
- `--request-timeout <ms>` Request timeout in milliseconds for long operations (default: 900000 / 15 minutes)
- `--retries <n>` Number of retries for long operations (default: 5)
- `--title <text>` Override project title used in outputs
- `--note <text>` High-level author note (included in prompts)
- `--model <name>` LM Studio model id (default from env `LMSTUDIO_MODEL` or `local-model`)
- `--base <url>` Base URL for LM Studio (default from env `LMSTUDIO_BASE_URL` or `http://127.0.0.1:1234`)

## Examples

Generate all three artifacts from a project:
```bash
node dist/index.js ../your-project \
  --title "Project X" \
  --note "Key novelty and context here." \
  --model "oss-20b"
```

Patent only with focused scan and smaller chunks:
```bash
node dist/index.js ../../Documents/miras \
  --patent \
  --include "contracts/**/*.sol" "README.md" \
  --max-chars 2200 \
  --compress-target 8000 \
  --title "Miras – Trustless Inheritance Protocol" \
  --note "Attester registry with time-locked, threshold-gated release; phone-blob recovery; UUPS guardrails." \
  --model "oss-20b" \
  --base "http://127.0.0.1:1234" \
  --patent-out ./provisional_draft.md
```

Patent + Aragon, exclude large frontend:
```bash
node dist/index.js ../../Documents/miras \
  --patent --aragon \
  --exclude "web/**" "app/**" "frontend/**"
```

Whitepaper only:
```bash
node dist/index.js ../your-project --whitepaper --whitepaper-out whitepaper.md
```

## How it works

1) Reads files and chunk-summarizes the codebase using a governance-aware summarizer.
2) Aggregates all summaries, then compresses them to a target size using an LLM pass.
3) Feeds the compressed context to each synthesis prompt:
   - Patent: `src/prompts.ts`
   - Aragon governance: `src/prompts-aragon.ts`
   - Whitepaper: `src/prompts-whitepaper.ts`

All heavy code analysis happens once; synthesis prompts reuse the same compressed context.

## Expansive Mode (Maximum Detail Preservation)

For maximum detail preservation without compression limits:

```bash
node dist/index.js ../your-project \
  --max-chars 0 \
  --compress-target 0 \
  --request-timeout 1800000
```

This disables both chunking and compression, preserving all details. However:
- Your model must have a large enough context window (16k-32k+ tokens recommended)
- Generation may take significantly longer
- You may need to increase `--request-timeout` to 30+ minutes
- Consider using a model with larger context capacity in LM Studio

## Tips & Troubleshooting

- If you encounter "server went away" or timeout errors:
  - Increase `--request-timeout` (e.g., 1800000 for 30 minutes)
  - Increase `--retries` (e.g., 8)
  - Use `--exclude` to skip large directories (e.g., `--exclude "web/**" "node_modules/**"`)
  - Lower `--max-chars` (e.g., 2200 or 1600)
  - Adjust `--compress-target` lower (e.g., 6000)
- For very large codebases (>120k chars of summaries), the tool automatically uses two-pass compression to avoid timeouts
- If compression feels too aggressive (losing important details):
  - Increase `--compress-target` (e.g., 15000 or 20000) for more detail
  - Increase `--compress-intermediate-mult` (e.g., 3.0 or 3.5) to preserve more structure in pass 1
  - For maximum detail, use expansive mode: `--max-chars 0 --compress-target 0`
  - Example: For 223k chars → 10k target, default 2.5x multiplier gives ~25k intermediate (9x compression in pass 1, then 2.5x in pass 2)
- Context window considerations:
  - Most local models have 4k-8k token contexts; some have 16k-32k+
  - Roughly, 1 token ≈ 4 characters
  - A 20k char compressed context ≈ 5k tokens (fits in 8k context with room for output)
  - Expansive mode with large codebases requires 16k-32k+ context models
- Large first request after model load can be slow; try a smaller request first.
- Ensure `--base` points to a reachable LM Studio server.

## Notes

- `src/index.ts` consolidates all flows; legacy `src/index-aragon.ts` and `src/index-whitepaper.ts` remain for reference.
- Summarizer blends patent and governance awareness to serve all outputs from a single pass.
