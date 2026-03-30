const fs = require('fs');
const path = require('path');
const { api } = require('../utils/api');
const { getLocalConfig, saveLocalConfig } = require('../utils/config');

async function push(args) {
    // Try to get repoId/branchId from --repo/--branch flags first, then local config
    let repoId = null;
    let branchId = null;
    let repoName = 'unknown';

    const repoFlagIdx = args.indexOf('--repo');
    const branchFlagIdx = args.indexOf('--branch');

    if (repoFlagIdx !== -1 && args[repoFlagIdx + 1]) {
        repoId = parseInt(args[repoFlagIdx + 1]);
    }
    if (branchFlagIdx !== -1 && args[branchFlagIdx + 1]) {
        branchId = parseInt(args[branchFlagIdx + 1]);
    }

    // Fall back to local config
    const local = getLocalConfig();
    if (!repoId && local) {
        repoId = local.repoId;
        repoName = local.repoName || repoId;
    }
    if (!branchId && local) {
        branchId = local.branchId;
    }

    if (!repoId) {
        console.log(`
  ❌ Cannot determine which repository to push to.

  Options:
    1. Run "cv clone <repo-id>" first, then "cv push" from that directory
    2. Run "cv init <repo-id>" in this directory to link it to a repo
    3. Use flags: cv push --repo <id> --branch <id> -m "message"
    `);
        return;
    }

    // If we have repoId but no branchId, auto-detect the default branch
    if (!branchId) {
        try {
            console.log('  🔍 Detecting default branch...');
            const branches = await api.listBranches(repoId);
            const defaultBranch = branches.find(b => b.isDefault) || branches[0];
            if (defaultBranch) {
                branchId = defaultBranch.branchId;
                console.log(`  🌿 Using branch: ${defaultBranch.branchName} (ID: ${branchId})`);
            } else {
                console.log('  ❌ No branches found for this repository');
                return;
            }
        } catch (err) {
            console.log(`  ❌ Failed to detect branch: ${err.message}`);
            return;
        }
    }

    const msgIdx = args.indexOf('-m');
    const message = msgIdx !== -1 ? args[msgIdx + 1] : `Push from CLI at ${new Date().toLocaleString()}`;

    // Collect files from current directory
    const files = collectFiles(process.cwd());
    if (files.length === 0) {
        console.log('  ❌ No files found to push (hidden dirs and node_modules are skipped)');
        return;
    }

    console.log(`\n  📤 Pushing ${files.length} files to repo ${repoName} (ID: ${repoId})...`);
    files.forEach(f => console.log(`    + ${f.path} (${f.content.length} bytes)`));

    try {
        const result = await api.createCommit(repoId, {
            branchId,
            message,
            files: files.map(f => ({ path: f.path, content: f.content }))
        });
        console.log(`\n  ✅ Pushed successfully!`);
        if (result.commitHash) console.log(`  🔑 Hash: ${result.commitHash}`);
        console.log(`  💬 ${message}`);
        console.log(`  📄 ${files.length} files committed`);
    } catch (err) {
        console.error(`\n  ❌ Push failed: ${err.message}`);
        if (err.message.includes('Branch not found')) {
            console.log(`  💡 Try: cv branch list --repo ${repoId}`);
        }
    }
}

async function pull(args) {
    let repoId = null;
    let branchId = null;

    const repoFlagIdx = args.indexOf('--repo');
    const branchFlagIdx = args.indexOf('--branch');

    if (repoFlagIdx !== -1) repoId = parseInt(args[repoFlagIdx + 1]);
    if (branchFlagIdx !== -1) branchId = parseInt(args[branchFlagIdx + 1]);

    const local = getLocalConfig();
    if (!repoId && local) repoId = local.repoId;
    if (!branchId && local) branchId = local.branchId;

    if (!repoId) {
        console.log('  ❌ Not in a CodeVault project. Run "cv clone" or "cv init" first.');
        return;
    }

    // Auto-detect branch if missing
    if (!branchId) {
        try {
            const branches = await api.listBranches(repoId);
            const defaultBranch = branches.find(b => b.isDefault) || branches[0];
            if (defaultBranch) branchId = defaultBranch.branchId;
        } catch (err) {
            console.log(`  ❌ Failed to detect branch: ${err.message}`);
            return;
        }
    }

    console.log(`\n  📥 Pulling latest from repo ${repoId}...`);

    try {
        const fileData = await api.getFiles(repoId, branchId);
        const files = fileData.files || [];

        if (files.length === 0) {
            console.log('  ⚠️  No files on server (empty repository)');
            return;
        }

        let updated = 0;
        for (const file of files) {
            const filePath = path.join(process.cwd(), file.filePath);
            const fileDir = path.dirname(filePath);

            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }

            const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
            if (existing !== (file.content || '')) {
                fs.writeFileSync(filePath, file.content || '');
                console.log(`  📄 Updated: ${file.filePath}`);
                updated++;
            }
        }

        console.log(`\n  ✅ Pull complete. ${updated} files updated, ${files.length - updated} unchanged.`);
    } catch (err) {
        console.error(`\n  ❌ Pull failed: ${err.message}`);
    }
}

function collectFiles(dir, baseDir = dir) {
    const results = [];
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
        return results;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        // Skip hidden dirs, node_modules, and common non-source files
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        if (entry.isDirectory()) {
            results.push(...collectFiles(fullPath, baseDir));
        } else {
            try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                results.push({ path: relPath, content });
            } catch (err) {
                // Skip binary files that can't be read as UTF-8
                console.log(`  ⚠️  Skipped (binary): ${path.relative(baseDir, fullPath)}`);
            }
        }
    }
    return results;
}

module.exports = { push, pull };
