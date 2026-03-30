const { api } = require('../utils/api');

async function createRepo(args) {
    const name = args[0];
    if (!name) {
        console.log('  Usage: cv repo create <name> [--desc "description"] [--private]');
        return;
    }

    const isPrivate = args.includes('--private');
    const descIdx = args.indexOf('--desc');
    const description = descIdx !== -1 ? args[descIdx + 1] : null;

    try {
        const data = await api.createRepo({
            name,
            description,
            visibility: isPrivate ? 'private' : 'public'
        });
        console.log(`\n  ✅ Repository created!`);
        console.log(`  📦 ${data.name} (${data.visibility})`);
        console.log(`  🆔 Repo ID: ${data.repoId}`);
        console.log(`  🌿 Default branch: ${data.defaultBranch}`);
        if (description) console.log(`  📝 ${description}`);
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

async function listRepos() {
    try {
        const repos = await api.listRepos();
        if (repos.length === 0) {
            console.log('\n  No repositories found. Create one with: cv repo create <name>');
            return;
        }

        console.log(`\n  📂 Your Repositories (${repos.length}):\n`);
        repos.forEach(r => {
            const vis = r.visibility === 'public' ? '🌍' : '🔒';
            console.log(`  ${vis} ${r.name}  [ID: ${r.repoId}]`);
            if (r.description) console.log(`     ${r.description}`);
            console.log(`     💾 ${r.commitCount} commits  🌿 ${r.branchCount} branches  ⭐ ${r.starCount} stars`);
            console.log('');
        });
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

async function viewRepo(args) {
    const id = args[0];
    if (!id) {
        console.log('  Usage: cv repo view <repo-id>');
        return;
    }

    try {
        const r = await api.getRepo(id);
        console.log(`\n  📦 ${r.ownerName}/${r.name}`);
        console.log(`  ${r.visibility === 'public' ? '🌍 Public' : '🔒 Private'}`);
        if (r.description) console.log(`  📝 ${r.description}`);
        console.log(`  🌿 Default: ${r.defaultBranch}`);
        console.log(`  💾 ${r.commitCount} commits | 🌿 ${r.branchCount} branches | ⭐ ${r.starCount} stars`);
        console.log(`  🐛 ${r.openIssues} open issues | 🔀 ${r.openPrs} open PRs`);
        console.log(`  📅 Created: ${r.createdAt}`);
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

async function deleteRepo(args) {
    const id = args[0];
    if (!id) {
        console.log('  Usage: cv repo delete <repo-id>');
        return;
    }

    try {
        await api.deleteRepo(id);
        console.log(`\n  ✅ Repository ${id} deleted`);
    } catch (err) {
        console.error(`\n  ❌ Failed: ${err.message}`);
    }
}

module.exports = { createRepo, listRepos, viewRepo, deleteRepo };
