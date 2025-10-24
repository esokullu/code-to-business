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

- `--include <glob...>` Extra globs to include in scan (default scans repo broadly)
- `--max-chars <n>` Max characters per chunk for summarization (default: 4000)
- `--compress-target <n>` Target characters for compressed aggregated summaries (default: 8000)
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
  --include "contracts/**/*.sol" "foundry.toml" "hardhat.config.*"
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

- If the final synthesis stalls or errors:
  - Lower `--max-chars` (e.g., 2200 or 1600)
  - Narrow with `--include` (e.g., `contracts/**/*.sol`)
  - Adjust `--compress-target` lower (e.g., 6000)
- Large first request after model load can be slow; try a smaller request first.
- Ensure `--base` points to a reachable LM Studio server.

## Notes

- `src/index.ts` consolidates all flows; legacy `src/index-aragon.ts` and `src/index-whitepaper.ts` remain for reference.
- Summarizer blends patent and governance awareness to serve all outputs from a single pass.
