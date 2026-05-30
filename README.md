# VerifAi — Automated AI Code Auditor

> **Your AI agent ships code.You ship safety.**

VerifAi is a pre-clone security tool designed to keep autonomous AI coding agents accountable. It allows developers to instantly fetch, map, and scan public or private GitHub repositories and Pull Requests for security vulnerabilities before pulling the code into a local environment.

## Why It Matters

AI writes the code, but you own the consequences. VerifAi provides continuous visibility into your AI's development cycles by mapping heavily modified files and pinpointing critical security vulnerabilities in a single scan.

## Key Features

- **Zero-Friction Audits:** Drop any GitHub repo or PR link to run a comprehensive static analysis in seconds.
- **Deep AI Analysis:** Fetches raw code via the GitHub API and utilizes LLMs to expose hidden flaws, bad patterns, and sloppy code.
- **Hierarchical Mapping:** Visualizes the entire repository tree, highlighting risky files instantly.
- **Actionable Metrics:** Generates an immediate codebase integrity score alongside concrete fix suggestions.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **APIs:** GitHub REST API (Trees & Pulls), Groq (Llama-3-70b-versatile)
