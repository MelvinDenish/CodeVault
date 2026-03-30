const readline = require('readline');
const { api } = require('../utils/api');
const { getLocalConfig } = require('../utils/config');

function prompt(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

function getRepoId(args) {
    const flagIdx = args.indexOf('--repo');
    if (flagIdx !== -1 && args[flagIdx + 1]) return args[flagIdx + 1];
    const local = getLocalConfig();
    if (local?.repoId) return local.repoId;
    return null;
}

async function createPR(args) {
    const repoId = getRepoId(args);
    if (!repoId) {
        console.log('  Usage: cv pr create [--repo <id>]');
        return;
    }

    // List branches first
    try {
        const branches = await api.listBranches(repoId);
        console.log('\n  Available branches:');
        branches.forEach(b => {
            console.log(`    ${b.branchId}: ${b.branchName}${b.isDefault ? ' (default)' : ''}`);
        });
    } catch { /* ignore */ }

    const title = await prompt('\n  PR title: ');
    const description = await prompt('  Description (optional): ');
    const sourceBranchId = await prompt('  Source branch ID: ');
    const targetBranchId = await prompt('  Target branch ID: ');

    try {
        const result = await api.createPR(repoId, {
            title,
            description: description || null,
            sourceBranchId: parseInt(sourceBranchId),
            targetBranchId: parseInt(targetBranchId)
        });
        console.log(`\n  ✅ Pull Request created!`);
        if (result.prId) console.log(`  🆔 PR #${result.prId}`);
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

async function listPRs(args) {
    const repoId = getRepoId(args) || args[0];
    if (!repoId) {
        console.log('  Usage: cv pr list [--repo <id>]');
        return;
    }

    try {
        const prs = await api.listPRs(repoId);
        if (prs.length === 0) {
            console.log('\n  No pull requests found');
            return;
        }

        console.log(`\n  🔀 Pull Requests (${prs.length}):\n`);
        prs.forEach(pr => {
            const status = pr.status === 'open' ? '🟢' : pr.status === 'merged' ? '🟣' : '🔴';
            console.log(`  ${status} #${pr.prId} ${pr.title} [${pr.status}]`);
            console.log(`    ${pr.sourceBranchName} → ${pr.targetBranchName} by ${pr.authorName}\n`);
        });
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

async function mergePR(args) {
    const prId = args[0];
    if (!prId) {
        console.log('  Usage: cv pr merge <pr-id>');
        return;
    }

    try {
        await api.mergePR(prId);
        console.log(`\n  ✅ PR #${prId} merged successfully!`);
    } catch (err) {
        console.error(`\n  ❌ Merge failed: ${err.message}`);
    }
}

async function closePR(args) {
    const prId = args[0];
    if (!prId) {
        console.log('  Usage: cv pr close <pr-id>');
        return;
    }

    try {
        await api.closePR(prId);
        console.log(`\n  ✅ PR #${prId} closed`);
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

module.exports = { createPR, listPRs, mergePR, closePR };
