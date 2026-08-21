# Desktop Remote Sessions and VPS Pairing

Hermes Desktop can use the multiplexer installed on each selected gateway host. Local routes operate on the Mac; a VPS route operates on that VPS. The renderer never receives an arbitrary shell RPC.

## Pair a VPS

On the VPS, after configuring the dashboard public HTTPS URL, run:

```bash
hermes gateway pair --url https://your-vps.example:8463 --label "Your VPS"
```

The command prints a credential-free `hermes://gateway/add?...` link. Open that link on the Mac running Hermes Desktop. Desktop opens Settings → Gateways with the URL, label, and OAuth mode prefilled. Review and save it explicitly; the deep link never stores a connection automatically and never carries a token.

Remote URLs must use HTTPS. Plain HTTP is accepted only for loopback development URLs.

## Persistent sessions

Open **Remote Sessions** in the Desktop sidebar. The page is scoped to the currently selected `(connection, profile)` route and shows:

- Hermes project working directories from that gateway's session history;
- live rmux sessions, with tmux as fallback;
- a persistent xterm view with literal input and allowlisted control keys;
- creation of a named persistent session in a selected project directory;
- a copyable `rmux attach -t <session>` command for Termius.

Closing the page or Hermes Desktop detaches only the UI. It does not kill the rmux/tmux session.

## Multiple VPS windows

From the machine selector:

- **Command-click** a machine to open a peer Hermes window pinned to it;
- **right-click** a machine for the same direct action.

The peer URL contains only an opaque connection ID. It never contains a gateway URL, OAuth token, or SSH credential.

## Claude Code and OpenAI Codex CLI accounts

Remote Sessions includes gateway-local account slots. Each slot is stored under:

```text
$HERMES_HOME/accounts/claude-code/<slot>/
$HERMES_HOME/accounts/openai-cli/<slot>/
```

Directories are mode `0700` on POSIX. Hermes launches the provider-owned login command inside a persistent mux session:

```text
CLAUDE_CONFIG_DIR=<slot> claude auth login --claudeai
CODEX_HOME=<slot> codex login
```

The fixed authorization dialog stays open while the browser is active. It displays the authorization URL and accepts a code returned by the website when the provider CLI asks for one. Submitted codes are bounded, sent literally to the mux pane, never logged, and never persisted by Hermes.

Native Hermes provider OAuth and CLI-owned accounts are deliberately separate. This avoids refresh-token rotation conflicts between Hermes inference credentials and provider CLI credentials.
