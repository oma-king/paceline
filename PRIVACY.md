# Paceline privacy policy

Paceline has no servers and collects no data.

## Credentials and browser sessions

Paceline does not read Claude API keys, OAuth tokens, passwords, browser cookie databases,
keychains, SSH keys, or environment-variable secrets. The local helper does not make network
requests.

The optional claude.ai fallback is different: if you enable it and grant the optional
`https://claude.ai/*` permission, the browser attaches your existing claude.ai session
credentials to two fixed requests for organization and usage data. Paceline never reads the
cookie or token, sends no request to any other origin, and stores only the returned limit
percentages and reset times.

## What the local helper reads (on your computer only)

- Claude Code session logs in `~/.claude/projects/` and Codex CLI rollout logs in `~/.codex/sessions/`, to compute token totals per session.
- `~/.claude/settings.json`, to install and later restore its status line.
- `~/.claude.json` and `.mcp.json`, for the **names** of configured MCP servers only.
- The **sizes** of `CLAUDE.md` files in your projects.
- The limit percentages Claude Code passes to its status line.
- Codex's local app-server, which returns the authenticated account's five-hour and seven-day
  rate-limit percentages and reset times. Paceline does not read or store Codex credentials.

The helper makes no network requests.

## What the extension receives from the helper

Numbers (tokens, costs, percentages, times), model names, tool names, MCP server names, and project and file paths. Never your prompts, Claude's replies, or file contents.

Codex plan limits are the exact values returned by the local Codex app-server. They are not
derived from token counts or API prices.

## What the extension stores

Your settings, the latest limit reading, and which alerts it already showed, in your browser's local extension storage.

## Optional claude.ai fallback

Off by default. If you turn it on, the extension asks for access to `claude.ai` and reads your limit percentages from claude.ai using your existing signed-in session. Nothing is sent anywhere else.

## Contact

Open an issue in the project's repository.
