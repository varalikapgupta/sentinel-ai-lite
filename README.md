# Sentinel AI Lite

An n8n workflow that checks vendor applications against company policies, cites the exact clause behind every decision, and verifies those citations with code before acting. Anything uncertain or unverified goes to a human on Telegram.

## How it works
1. A vendor application arrives via webhook.
2. The workflow selects the relevant policy clauses (RAG-lite).
3. Gemini decides using only those clauses and cites each one.
4. A verification step checks that every cited clause exists and every quote is real.
5. Verified: auto-decision. Not verified: Telegram alert for human review.

## Try it
- Workflow, policies, test vendors, and setup steps are in the [`sentinel-lite`](./sentinel-lite) folder.
- Import `sentinel-lite/sentinel_lite.json` into n8n (Import from file).
- Credentials needed: a Gemini API key (in the `x-goog-api-key` header) and a Telegram bot token plus chat ID.
- Test vendors are in `sentinel-lite/test-vendors/`.

## Honest notes
- Policies are fictional demo policies.
- Retrieval is "RAG-lite" (rule-based selection, no vector database).
- Output is assistive, not legal advice. Humans review uncertain cases.

## Demo
(https://drive.google.com/file/d/1nIQR3yLKsxnrLnm1a45ybT2rITupby0s/view?usp=drivesdk)
