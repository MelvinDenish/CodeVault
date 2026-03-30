const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { api } = require('../utils/api');
const { getLocalConfig } = require('../utils/config');

function getRepoId(args) {
    const flagIdx = args.indexOf('--repo');
    if (flagIdx !== -1 && args[flagIdx + 1]) return args[flagIdx + 1];
    const local = getLocalConfig();
    if (local?.repoId) return local.repoId;
    return null;
}

function getBranchId(args) {
    const flagIdx = args.indexOf('--branch');
    if (flagIdx !== -1 && args[flagIdx + 1]) return args[flagIdx + 1];
    const local = getLocalConfig();
    if (local?.branchId) return local.branchId;
    return null;
}

function collectFiles(dir, baseDir = dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        // Skip hidden dirs and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        if (entry.isDirectory()) {
            results.push(...collectFiles(fullPath, baseDir));
        } else {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            results.push({ path: relPath, content });
        }
    }
    return results;
}

async function commit(args) {
    const repoId = getRepoId(args);
    const branchId = getBranchId(args);

    if (!repoId) {
        console.log('  Usage: cv commit -m "message" [--repo <id>] [--branch <id>]');
        console.log('  Or run from a cloned project directory');
        return;
    }

    const msgIdx = args.indexOf('-m');
    const message = msgIdx !== -1 ? args[msgIdx + 1] : null;

    if (!message) {
        console.log('  ❌ Commit message required. Use: cv commit -m "your message"');
        return;
    }

    // Collect all files from current directory
    const files = collectFiles(process.cwd());
    if (files.length === 0) {
        console.log('  ❌ No files found to commit');
        return;
    }

    console.log(`\n  📦 Staging ${files.length} files...`);
    files.forEach(f => console.log(`    + ${f.path}`));

    try {
        const commitData = {
            branchId: parseInt(branchId),
            message,
            files: files.map(f => ({ path: f.path, content: f.content }))
        };

        const result = await api.createCommit(repoId, commitData);
        console.log(`\n  ✅ Commit created!`);
        if (result.commitHash) console.log(`  🔑 Hash: ${result.commitHash}`);
        console.log(`  💬 ${message}`);
        console.log(`  📄 ${files.length} files committed`);
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

async function log(args) {
    const repoId = getRepoId(args) || args[0];
    const branchId = getBranchId(args);

    if (!repoId) {
        console.log('  Usage: cv log [--repo <id>] [--branch <id>]');
        return;
    }

    try {
        const commits = await api.listCommits(repoId, branchId);
        if (commits.length === 0) {
            console.log('\n  No commits found');
            return;
        }

        console.log(`\n  📜 Commit History (${commits.length}):\n`);
        commits.forEach(c => {
            console.log(`  ${c.commitHash || '------'} ${c.message}`);
            console.log(`    by ${c.authorName} on ${new Date(c.commitTime).toLocaleString()}`);
            console.log(`    📄 ${c.fileCount} files | ID: ${c.commitId}\n`);
        });
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

module.exports = { commit, log };
