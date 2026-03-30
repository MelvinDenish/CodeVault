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

async function createIssue(args) {
    const repoId = getRepoId(args);
    if (!repoId) {
        console.log('  Usage: cv issue create [--repo <id>]');
        return;
    }

    const title = await prompt('  Issue title: ');
    const description = await prompt('  Description (optional): ');

    try {
        const result = await api.createIssue(repoId, { title, description: description || null });
        console.log(`\n  ✅ Issue created!`);
        if (result.issueId) console.log(`  🆔 Issue #${result.issueId}`);
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

async function listIssues(args) {
    const repoId = getRepoId(args) || args[0];
    if (!repoId) {
        console.log('  Usage: cv issue list [--repo <id>]');
        return;
    }

    try {
        const issues = await api.listIssues(repoId);
        if (issues.length === 0) {
            console.log('\n  No issues found');
            return;
        }

        console.log(`\n  🐛 Issues (${issues.length}):\n`);
        issues.forEach(i => {
            const status = i.status === 'open' ? '🟢' : '🔴';
            console.log(`  ${status} #${i.issueId} ${i.title}`);
            console.log(`    by ${i.createdByName} | ${i.commentCount || 0} comments\n`);
        });
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

module.exports = { createIssue, listIssues };
