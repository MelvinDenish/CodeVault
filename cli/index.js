#!/usr/bin/env node

const { login, logout, whoami, register, setServer } = require('./commands/auth');
const { createRepo, listRepos, viewRepo, deleteRepo } = require('./commands/repo');
const { createBranch, listBranches, deleteBranch } = require('./commands/branch');
const { commit, log } = require('./commands/commit');
const { clone, init } = require('./commands/clone');
const { push, pull } = require('./commands/push');
const { createIssue, listIssues } = require('./commands/issue');
const { createPR, listPRs, mergePR, closePR } = require('./commands/pr');
const { getToken } = require('./utils/config');

const VERSION = '1.0.0';

const HELP = `
  ╔═══════════════════════════════════════════╗
  ║       🔐 CodeVault CLI v${VERSION}            ║
  ║   Git-like VCS powered by Oracle DB       ║
  ╚═══════════════════════════════════════════╝

  USAGE: cv <command> [sub-command] [options]

  AUTH:
    cv login                    Sign in to CodeVault
    cv logout                   Clear saved credentials
    cv whoami                   Show current user info
    cv register                 Create a new account
    cv set-server <url>         Set API server URL

  REPOSITORIES:
    cv repo create <name>       Create a new repository
      --desc "text"               Set description
      --private                   Make private
    cv repo list                List your repositories
    cv repo view <id>           View repository details
    cv repo delete <id>         Delete a repository

  BRANCHES:
    cv branch create <name>     Create a branch
    cv branch list              List branches
    cv branch delete <id>       Delete a branch
      --repo <id>                 Specify repository

  COMMITS:
    cv commit -m "message"      Commit current directory files
    cv log                      View commit history
      --repo <id>                 Specify repository
      --branch <id>               Specify branch

  SYNC:
    cv init <repo-id>           Link current dir to a repo
    cv clone <repo-id> [dir]    Clone a repository locally
    cv push -m "message"        Push local files to server
      --repo <id>                 Override repo (no .codevault needed)
      --branch <id>               Override branch
    cv pull                     Pull latest files from server

  ISSUES:
    cv issue create             Create an issue (interactive)
    cv issue list               List issues
      --repo <id>                 Specify repository

  PULL REQUESTS:
    cv pr create                Create a PR (interactive)
    cv pr list                  List pull requests
    cv pr merge <id>            Merge a pull request
    cv pr close <id>            Close a pull request
      --repo <id>                 Specify repository

  EXAMPLES:
    cv login
    cv repo create my-project --desc "My app" --private
    cv clone 1 ./my-project
    cv push -m "Initial commit"
    cv branch create feature-x --repo 1
    cv pr create --repo 1
    cv issue create --repo 1
`;

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        console.log(HELP);
        return;
    }

    if (args[0] === '--version' || args[0] === '-v') {
        console.log(`  CodeVault CLI v${VERSION}`);
        return;
    }

    const command = args[0];
    const subCommand = args[1];
    const restArgs = args.slice(2);

    // Commands that don't need auth
    const noAuthCommands = ['login', 'register', 'set-server', '--help', '-h', '--version', '-v'];

    if (!noAuthCommands.includes(command)) {
        const token = getToken();
        if (!token) {
            console.log('\n  ⚠️  Not logged in. Run: cv login\n');
            process.exit(1);
        }
    }

    try {
        switch (command) {
            // Auth
            case 'login':
                await login();
                break;
            case 'logout':
                await logout();
                break;
            case 'whoami':
                await whoami();
                break;
            case 'register':
                await register();
                break;
            case 'set-server':
                await setServer(args.slice(1));
                break;

            // Repos
            case 'repo':
                switch (subCommand) {
                    case 'create': await createRepo(restArgs); break;
                    case 'list': await listRepos(); break;
                    case 'view': await viewRepo(restArgs); break;
                    case 'delete': await deleteRepo(restArgs); break;
                    default:
                        console.log('  Usage: cv repo <create|list|view|delete> [options]');
                }
                break;

            // Branches
            case 'branch':
                switch (subCommand) {
                    case 'create': await createBranch(restArgs); break;
                    case 'list': await listBranches(restArgs); break;
                    case 'delete': await deleteBranch(restArgs); break;
                    default:
                        console.log('  Usage: cv branch <create|list|delete> [options]');
                }
                break;

            // Commits
            case 'commit':
                await commit(args.slice(1));
                break;
            case 'log':
                await log(args.slice(1));
                break;

            // Sync
            case 'init':
                await init(args.slice(1));
                break;
            case 'clone':
                await clone(args.slice(1));
                break;
            case 'push':
                await push(args.slice(1));
                break;
            case 'pull':
                await pull(args.slice(1));
                break;

            // Issues
            case 'issue':
                switch (subCommand) {
                    case 'create': await createIssue(restArgs); break;
                    case 'list': await listIssues(restArgs); break;
                    default:
                        console.log('  Usage: cv issue <create|list> [options]');
                }
                break;

            // Pull Requests
            case 'pr':
                switch (subCommand) {
                    case 'create': await createPR(restArgs); break;
                    case 'list': await listPRs(restArgs); break;
                    case 'merge': await mergePR(restArgs); break;
                    case 'close': await closePR(restArgs); break;
                    default:
                        console.log('  Usage: cv pr <create|list|merge|close> [options]');
                }
                break;

            default:
                console.log(`\n  ❌ Unknown command: ${command}`);
                console.log('  Run "cv --help" to see available commands\n');
        }
    } catch (err) {
        console.error(`\n  ❌ Error: ${err.message}`);
        process.exit(1);
    }
}

main();
