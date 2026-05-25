# VerifAi — Automated AI Code Auditor

> **Your AI agent ships code. [cite_start]You ship safety.** [cite: 2]

[cite_start]VerifAi is a pre-clone security tool designed to keep autonomous AI coding agents accountable[cite: 91]. [cite_start]It allows developers to instantly fetch, map, and scan public or private GitHub repositories and Pull Requests for security vulnerabilities before pulling the code into a local environment[cite: 87, 88].

## ✦ Why It Matters
AI writes the code, but you own the consequences. [cite_start]VerifAi provides continuous visibility into your AI's development cycles by mapping heavily modified files and pinpointing critical security vulnerabilities in a single scan[cite: 95]. 

## ✦ Key Features
* [cite_start]**Zero-Friction Audits:** Drop any GitHub repo or PR link to run a comprehensive static analysis in seconds[cite: 83].
* **Deep AI Analysis:** Fetches raw code via the GitHub API and utilizes LLMs to expose hidden flaws, bad patterns, and sloppy code[cite: 92, 93].
* [cite_start]**Hierarchical Mapping:** Visualizes the entire repository tree, highlighting risky files instantly[cite: 93].
* [cite_start]**Actionable Metrics:** Generates an immediate codebase integrity score alongside concrete fix suggestions[cite: 33, 34].

## ✦ Tech Stack
* **Frontend:** Next.js, React, TypeScript
* **APIs:** GitHub REST API (Trees & Pulls), Groq (Llama-3-70b-versatile)
