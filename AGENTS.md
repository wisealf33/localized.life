<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Public-facing copy

- Treat user prompts, planning language, implementation notes, and product discussions as requirements, not publishable copy.
- Never place instructional phrases such as “for now,” “MVP,” “later,” “phase,” or implementation explanations into the public interface unless the user explicitly approves that exact wording.
- Write interface text from the visitor's point of view and review it separately from the feature logic before deployment.

## Product direction

- Before changing Person data, onboarding, roles, relationships, referrals, scheduling, account access, or network structure, read `docs/network-vision-and-design-guardrails.md`.
- Localized.life is not a standard marketplace, social network, CRM, or conventional service business. Do not import familiar product assumptions when the network model is unresolved.
- Treat the confirmed direction in that document as binding. Treat its open questions as questions for Garrett, not gaps to fill with guesses.
