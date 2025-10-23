"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyToClipboard = copyToClipboard;
exports.checkDependenciesInstalled = checkDependenciesInstalled;
exports.installDependencies = installDependencies;
exports.ensureDependencies = ensureDependencies;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * クリップボードにテキストをコピーする（OS別対応）
 */
async function copyToClipboard(text) {
    const platform = process.platform;
    try {
        if (platform === 'darwin') {
            // macOS
            (0, child_process_1.execSync)(`echo "${text}" | pbcopy`);
        }
        else if (platform === 'win32') {
            // Windows
            (0, child_process_1.execSync)(`echo ${text} | clip`, { shell: 'cmd' });
        }
        else {
            // Linux
            (0, child_process_1.execSync)(`echo "${text}" | xclip -selection clipboard`);
        }
    }
    catch (error) {
        // フォールバック: より汎用的な方法を試す
        try {
            if (platform === 'linux') {
                (0, child_process_1.execSync)(`echo "${text}" | xsel --clipboard --input`);
            }
        }
        catch (fallbackError) {
            throw new Error(`Failed to copy to clipboard: ${error}`);
        }
    }
}
/**
 * 依存関係がインストールされているかチェック
 */
function checkDependenciesInstalled() {
    const packageLockExists = (0, fs_1.existsSync)('package-lock.json');
    const nodeModulesExists = (0, fs_1.existsSync)('node_modules');
    const webappNodeModulesExists = (0, fs_1.existsSync)((0, path_1.join)('webapp', 'node_modules'));
    return packageLockExists && nodeModulesExists && webappNodeModulesExists;
}
/**
 * 依存関係をインストールする
 */
function installDependencies() {
    console.log('📦 Installing dependencies...');
    try {
        // ルートの依存関係をインストール
        (0, child_process_1.execSync)('npm install', { stdio: 'inherit' });
        // webappの依存関係をインストール
        (0, child_process_1.execSync)('npm install', {
            stdio: 'inherit',
            cwd: 'webapp',
        });
        console.log('✅ Dependencies installed successfully');
    }
    catch (error) {
        throw new Error(`Failed to install dependencies: ${error}`);
    }
}
/**
 * 依存関係を確実にインストールする
 */
function ensureDependencies() {
    if (!checkDependenciesInstalled()) {
        installDependencies();
    }
    else {
        console.log('✅ Dependencies already installed');
    }
}
//# sourceMappingURL=clipboard.js.map