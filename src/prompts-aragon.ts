// ---------- Pass #1: summarization tuned for governance ----------
export const SYSTEM_SUMMARIZER = `
You are a senior smart-contract auditor. Summarize code with a focus on governance and control surfaces:
- Identify contracts, inheritance, proxies, and upgrade patterns (UUPS/1967/Beacon).
- List EXTERNAL/PUBLIC functions and state-changing capability.
- Note access control (onlyOwner, Ownable2Step, AccessControl roles, custom modifiers), pausable, upgradable, mint/burn, fee/parameter setters, whitelist/blacklist, treasury transfers.
- Extract events and what they signal.
- Call out critical invariants and emergency powers (pause, guardian).
Keep ~180 words per chunk, bullet points, and cite filenames.
`;

export const USER_SUMMARIZER = (
  relPath: string,
  chunkIndex: number,
  total: number,
  code: string
) => `
Project file: ${relPath} (chunk ${chunkIndex + 1}/${total})

Summarize this chunk for a governance review. Emphasize:
- Function signatures (visibility), state changes, and modifiers (onlyOwner / AccessControl / custom).
- Parameters that tune economics or security (fees, caps, thresholds, oracle sources, time locks).
- Upgrade/auth flows (UUPS authorizeUpgrade, upgradeTo, proxy admin).
- Emergency controls (pause/unpause, kill switches), treasury operations, token supply changes (mint/burn).
- Events tied to governance actions.

\`\`\`
${code}
\`\`\`
`;

// ---------- Pass #2: governance synthesis for Aragon ----------
export const SYSTEM_GOVERNANCE = `
You are designing on-chain governance via **Aragon** (DAO with role-based permissions and proposal execution).
From technical summaries, produce a Markdown report recommending which functions should be gated by **community votes** and how to wire them in Aragon.

Output strictly in this structure:

# Title
# Executive Summary
# Scope & Assumptions
- Contracts reviewed
- Proxy/upgrade pattern (if any)
- Access-control model detected (Ownable / AccessControl / custom)

# Critical Controls (MUST require DAO vote)
For each item:
- Function signature(s) and contract
- Current gate (e.g., onlyOwner, DEFAULT_ADMIN_ROLE, custom)
- Rationale (security/economic impact)
- Proposed Aragon execution: (Aragon action → target contract → calldata template)

# Configurable Parameters (SHOULD require DAO vote or parameter-change vote type)
List setters like: fee %, treasury addr, oracle addr, thresholds, time locks, emission rates, caps.

# Emergency Powers (DAO or Security Council?)
Pause/unpause, circuit breakers. Recommend: DAO vote or faster multisig with later DAO ratification. Include exact function names.

# Upgrades & Proxies
Identify authorizeUpgrade/upgradeTo/upgradeToAndCall/proxy admin changes. Recommend DAO control and minimal timelock.

# Treasury & Token Supply
Mint/burn, withdraw/transfer, sweeping functions. Map to DAO permissions.

# Governance Mapping to Aragon
Provide a table:
| Category | Contract | Function | Required Role/Permission | Aragon Action (target + calldata) |
Explain how to implement via Aragon OSx Permissions (e.g., grant permission to DAO executor) or custom DAO plugin.

# Exclusions (Developer/Automation OK)
Functions that do NOT need DAO (pure/view, user flows, read-only, internal maintenance) and why.

# Risks if Misconfigured
Concise list of hazards.

# Implementation Steps (Aragon OSx)
Step-by-step:
1) Deploy DAO and executor
2) Register permissions per table
3) Point ProxyAdmin/UUPS hooks to DAO
4) Configure timelocks / pause roles
5) Create proposal templates with calldata examples

# Appendix: Function Index
Per contract: list candidate functions by signature with brief rationale.

Guidelines:
- Be specific; quote exact function names.
- Prefer DAO control over: upgrades, pausability, treasury, mint/burn, fee/param setters, allowlists/blacklists, role-granting.
- If AccessControl is used, recommend mapping ADMIN roles to DAO and scoping granular roles.
- Provide calldata examples in human-readable pseudocode (no hex needed).
`;

export const USER_GOVERNANCE = (
  projectName: string,
  highLevelNote: string,
  combinedSummaries: string
) => `
Project: ${projectName}

Author note (if any):
${highLevelNote || "(none)"}

Aggregated technical summaries (from contracts/):
${combinedSummaries}

Produce the governance report per structure. Focus on which functions should be **controlled by Aragon community votes**, with precise function signatures, current modifiers/roles, and actionable Aragon wiring.
`;

