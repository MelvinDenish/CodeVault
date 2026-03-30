const readline = require('readline');
const { api } = require('../utils/api');
const { setToken, clearToken, setUser, getUser, getServerUrl, setServerUrl } = require('../utils/config');

function prompt(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
}

async function login() {
    console.log('\n🔐 CodeVault Login');
    console.log(`   Server: ${getServerUrl()}\n`);

    const email = await prompt('  Email: ');
    const password = await prompt('  Password: ');

    try {
        const data = await api.login({ email, password });
        setToken(data.token);
        setUser({ userId: data.userId, username: data.username, email: data.email });
        console.log(`\n  ✅ Logged in as ${data.username}`);
    } catch (err) {
        console.error(`\n  ❌ Login failed: ${err.message}`);
        process.exit(1);
    }
}

async function logout() {
    clearToken();
    console.log('  ✅ Logged out successfully');
}

async function whoami() {
    const user = getUser();
    if (!user) {
        console.log('  Not logged in. Run: cv login');
        return;
    }
    try {
        const data = await api.getMe();
        console.log(`\n  👤 ${data.username}`);
        console.log(`  📧 ${data.email}`);
        console.log(`  🆔 User ID: ${data.userId}`);
        if (data.bio) console.log(`  📝 ${data.bio}`);
    } catch (err) {
        console.log(`  Cached: ${user.username} (${user.email})`);
        console.log(`  ⚠️  Could not verify with server: ${err.message}`);
    }
}

async function register() {
    console.log('\n🚀 CodeVault Registration\n');

    const username = await prompt('  Username: ');
    const email = await prompt('  Email: ');
    const password = await prompt('  Password: ');

    try {
        const data = await api.register({ username, email, password });
        setToken(data.token);
        setUser({ userId: data.userId, username });
        console.log(`\n  ✅ Account created! Logged in as ${username}`);
    } catch (err) {
        console.error(`\n  ❌ Registration failed: ${err.message}`);
        process.exit(1);
    }
}

async function setServer(args) {
    if (args.length === 0) {
        console.log(`  Server: ${getServerUrl()}`);
        return;
    }
    setServerUrl(args[0]);
    console.log(`  ✅ Server set to: ${args[0]}`);
}

module.exports = { login, logout, whoami, register, setServer };
