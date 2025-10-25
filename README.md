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
- `--max-chars <n>` Max characters per chunk for summarization (default: 4000)
- `--compress-target <n>` Target characters for compressed aggregated summaries (default: 8000)
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

## Tips & Troubleshooting

- If you encounter "server went away" or timeout errors:
  - Increase `--request-timeout` (e.g., 1800000 for 30 minutes)
  - Increase `--retries` (e.g., 8)
  - Use `--exclude` to skip large directories (e.g., `--exclude "web/**" "node_modules/**"`)
  - Lower `--max-chars` (e.g., 2200 or 1600)
  - Adjust `--compress-target` lower (e.g., 6000)
- For very large codebases (>120k chars of summaries), the tool automatically uses two-pass compression to avoid timeouts
- Large first request after model load can be slow; try a smaller request first.
- Ensure `--base` points to a reachable LM Studio server.

## Notes

- `src/index.ts` consolidates all flows; legacy `src/index-aragon.ts` and `src/index-whitepaper.ts` remain for reference.
- Summarizer blends patent and governance awareness to serve all outputs from a single pass.
