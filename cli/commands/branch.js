const { api } = require('../utils/api');
const { getLocalConfig } = require('../utils/config');

function getRepoId(args) {
    // Try --repo flag first, then local config
    const flagIdx = args.indexOf('--repo');
    if (flagIdx !== -1 && args[flagIdx + 1]) return args[flagIdx + 1];

    const local = getLocalConfig();
    if (local?.repoId) return local.repoId;

    return null;
}

async function createBranch(args) {
    const repoId = getRepoId(args);
    const repoFlagIdx = args.indexOf('--repo');
    const name = args.find((a, idx) => !a.startsWith('--') && (repoFlagIdx === -1 || idx !== repoFlagIdx + 1));

    if (!repoId || !name) {
        console.log('  Usage: cv branch create <name> [--repo <id>]');
        return;
    }

    try {
        const data = await api.createBranch(repoId, { branchName: name });
        console.log(`\n  ✅ Branch "${name}" created`);
        if (data.branchId) console.log(`  🆔 Branch ID: ${data.branchId}`);
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

async function listBranches(args) {
    const repoId = getRepoId(args) || args[0];
    if (!repoId) {
        console.log('  Usage: cv branch list [--repo <id>]');
        return;
    }

    try {
        const branches = await api.listBranches(repoId);
        console.log(`\n  🌿 Branches (${branches.length}):\n`);
        branches.forEach(b => {
            const def = b.isDefault ? ' ⭐ default' : '';
            const hash = b.headCommitHash ? ` [${b.headCommitHash}]` : '';
            console.log(`  • ${b.branchName}${def}${hash}`);
            if (b.headMessage) console.log(`    └─ ${b.headMessage}`);
        });
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

async function deleteBranch(args) {
    const repoId = getRepoId(args);
    const repoFlagIdx = args.indexOf('--repo');
    const branchId = args.find((a, idx) => !a.startsWith('--') && (repoFlagIdx === -1 || idx !== repoFlagIdx + 1));

    if (!repoId || !branchId) {
        console.log('  Usage: cv branch delete <branch-id> [--repo <id>]');
        return;
    }

    try {
        await api.deleteBranch(repoId, branchId);
        console.log(`\n  ✅ Branch deleted`);
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

module.exports = { createBranch, listBranches, deleteBranch };
