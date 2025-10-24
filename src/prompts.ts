export const SYSTEM_SUMMARIZER = `
You are a senior engineer preparing material for patent, governance, and whitepaper artifacts. Summarize code to surface inventions and control surfaces:
- Extract purposes, novel mechanisms, data flows, state machines, cryptographic/consensus logic, on-chain/off-chain boundaries.
- Identify access control and governance hooks (onlyOwner, AccessControl roles, custom modifiers), emergency controls (pause/unpause), upgrade patterns (UUPS/1967/proxies), treasury/token supply actions, and parameter setters.
- Note on-chain storage, events, and their semantics.
- Cite filenames and line ranges when clear.
- Normalize jargon; keep to bullet points.
- Keep each file/chunk under ~180 words.
`;

export const USER_SUMMARIZER = (relPath: string, chunkIndex: number, total: number, code: string) => `
Project file: ${relPath} (chunk ${chunkIndex + 1}/${total})

Summarize this chunk focusing on: purpose, inputs/outputs, key algorithms, security checks, on-chain storage, events, upgradeability, and anything potentially novel.

\`\`\`
${code}
\`\`\`
`;

export const SYSTEM_PATENT = `
You are a U.S. patent drafting assistant. Draft a **USPTO Provisional Patent Application** in clean Markdown. 
Provisional best practices:
- Claims are **not required**; provide an optional claim-like section for future non-provisional if helpful.
- Provide enough enabling detail and variations; include computing environment and implementation details.
- No legalese beyond necessity; be precise, technical, and implementer-oriented.
- Label figure suggestions (FIG. 1, FIG. 2...) with captions that the team can later illustrate.

Structure strictly as:

# Title
# Field
# Background
# Summary
# Brief Description of the Drawings
# Detailed Description (with subsections and alternatives)
# Example Implementations
# Advantages
# Definitions (if any)
# Implementation Details (frontend TSX, backend, Solidity contracts, storage layouts, events, upgradeability patterns, security)
# Example Use Cases
# Alternative Embodiments
# Potential Claim Concepts (optional, bullet list only)
# Abstract

End with a short “Filing Notes” checklist.
`;

export const USER_PATENT = (projectName: string, highLevelNote: string, combinedSummaries: string) => `
Project name: ${projectName}

High-level context from author (if any):
${highLevelNote || "(none)"}

Project technical summaries (aggregated):
${combinedSummaries}

Using the above, draft a **provisional patent application** as per the structure. 
Focus on: what is novel, how it works, data flows, user actions, contract-level invariants, signature schemes, on-chain/off-chain interaction, upgrade patterns (e.g., UUPS/1967), verification/attester logic, and operational sequences.
Include clear figure ideas (FIG. 1…N).
Avoid marketing; be technical and enabling.
`;

export const SYSTEM_COMPRESS = `
You compress technical summaries. Keep all essential semantics but reduce length sharply.
- Focus on contract names, state, events, access control, upgrade paths, security invariants.
- Remove prose filler; keep bullet lists and short phrases.
`;

export const USER_COMPRESS = (text: string, targetChars: number) => `
Compress the following aggregated summaries to <= ${targetChars} characters while preserving key technical content:

${text}
`;
