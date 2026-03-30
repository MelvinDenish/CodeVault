const fs = require('fs');
const path = require('path');
const { api } = require('../utils/api');
const { saveLocalConfig } = require('../utils/config');

async function clone(args) {
    const repoId = args[0];
    if (!repoId) {
        console.log('  Usage: cv clone <repo-id> [directory]');
        return;
    }

    try {
        // Get repo info
        const repo = await api.getRepo(repoId);
        const dirName = args[1] || repo.name;
        const targetDir = path.join(process.cwd(), dirName);

        console.log(`\n  📥 Cloning ${repo.ownerName}/${repo.name} into ${dirName}...`);

        // Create directory
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Get branches to find default branch
        const branches = await api.listBranches(repoId);
        const defaultBranch = branches.find(b => b.isDefault) || branches[0];

        if (!defaultBranch) {
            console.log('  ⚠️  No branches found. Empty repository cloned.');
            saveLocalConfigInDir(targetDir, {
                repoId: parseInt(repoId),
                repoName: repo.name,
                branchId: null,
                branchName: null
            });
            console.log(`\n  ✅ Cloned (empty) into ./${dirName}`);
            return;
        }

        // Get files from default branch
        let files = [];
        try {
            const fileData = await api.getFiles(repoId, defaultBranch.branchId);
            files = fileData.files || [];
        } catch (err) {
            console.log(`  ⚠️  Could not fetch files: ${err.message}`);
        }

        if (files.length === 0) {
            console.log('  ⚠️  No files in repository yet. Empty clone.');
        } else {
            // Write files
            for (const file of files) {
                const filePath = path.join(targetDir, file.filePath);
                const fileDir = path.dirname(filePath);

                if (!fs.existsSync(fileDir)) {
                    fs.mkdirSync(fileDir, { recursive: true });
                }

                fs.writeFileSync(filePath, file.content || '');
                console.log(`  📄 ${file.filePath}`);
            }
        }

        // Save local config
        saveLocalConfigInDir(targetDir, {
            repoId: parseInt(repoId),
            repoName: repo.name,
            branchId: defaultBranch.branchId,
            branchName: defaultBranch.branchName,
            server: 'http://localhost:3001'
        });

        console.log(`\n  ✅ Cloned ${files.length} files into ./${dirName}`);
        console.log(`  🌿 Branch: ${defaultBranch.branchName} (ID: ${defaultBranch.branchId})`);
        console.log(`\n  Next steps:`);
        console.log(`    cd ${dirName}`);
        console.log(`    cv push -m "your commit message"`);
    } catch (err) {
        console.error(`\n  ❌ Clone failed: ${err.message}`);
    }
}

async function init(args) {
    const repoId = args[0];
    if (!repoId) {
        console.log('  Usage: cv init <repo-id>');
        console.log('  Links the current directory to a CodeVault repository.');
        return;
    }

    try {
        // Verify repo exists
        const repo = await api.getRepo(repoId);
        console.log(`\n  🔗 Linking to repository: ${repo.ownerName}/${repo.name}`);

        // Get default branch
        const branches = await api.listBranches(repoId);
        const defaultBranch = branches.find(b => b.isDefault) || branches[0];

        const configDir = path.join(process.cwd(), '.codevault');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        const config = {
            repoId: parseInt(repoId),
            repoName: repo.name,
            branchId: defaultBranch ? defaultBranch.branchId : null,
            branchName: defaultBranch ? defaultBranch.branchName : null,
            server: 'http://localhost:3001'
        };

        fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(config, null, 2));

        console.log(`\n  ✅ Initialized! This directory is now linked to repo "${repo.name}"`);
        console.log(`  🌿 Branch: ${defaultBranch ? defaultBranch.branchName : 'none'} (ID: ${defaultBranch ? defaultBranch.branchId : 'N/A'})`);
        console.log(`\n  You can now use:`);
        console.log(`    cv push -m "message"    Push files to server`);
        console.log(`    cv pull                 Pull files from server`);
        console.log(`    cv log                  View commit history`);
    } catch (err) {
        console.error(`\n  ❌ Init failed: ${err.message}`);
    }
}

function saveLocalConfigInDir(dir, config) {
    const configDir = path.join(dir, '.codevault');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(path.join(configDir, 'config.json'), JSON.stringify(config, null, 2));
}

module.exports = { clone, init };
