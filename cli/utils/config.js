const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.codevault');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

function loadConfig() {
    ensureConfigDir();
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    return {};
}

function saveConfig(config) {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getToken() {
    const config = loadConfig();
    return config.token || null;
}

function setToken(token) {
    const config = loadConfig();
    config.token = token;
    saveConfig(config);
}

function clearToken() {
    const config = loadConfig();
    delete config.token;
    delete config.user;
    saveConfig(config);
}

function setUser(user) {
    const config = loadConfig();
    config.user = user;
    saveConfig(config);
}

function getUser() {
    const config = loadConfig();
    return config.user || null;
}

function getServerUrl() {
    const config = loadConfig();
    return config.serverUrl || 'http://localhost:3001';
}

function setServerUrl(url) {
    const config = loadConfig();
    config.serverUrl = url;
    saveConfig(config);
}

// Local repo config (stored in .codevault in current project dir)
function getLocalConfig() {
    const localFile = path.join(process.cwd(), '.codevault', 'config.json');
    if (fs.existsSync(localFile)) {
        return JSON.parse(fs.readFileSync(localFile, 'utf8'));
    }
    return null;
}

function saveLocalConfig(config) {
    const dir = path.join(process.cwd(), '.codevault');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2));
}

module.exports = {
    loadConfig, saveConfig, getToken, setToken, clearToken,
    setUser, getUser, getServerUrl, setServerUrl,
    getLocalConfig, saveLocalConfig
};
