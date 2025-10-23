import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * クリップボードにテキストをコピーする（OS別対応）
 */
export async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      // macOS
      execSync(`echo "${text}" | pbcopy`);
    } else if (platform === 'win32') {
      // Windows
      execSync(`echo ${text} | clip`, { shell: 'cmd' });
    } else {
      // Linux
      execSync(`echo "${text}" | xclip -selection clipboard`);
    }
  } catch (error) {
    // フォールバック: より汎用的な方法を試す
    try {
      if (platform === 'linux') {
        execSync(`echo "${text}" | xsel --clipboard --input`);
      }
    } catch (fallbackError) {
      throw new Error(`Failed to copy to clipboard: ${error}`);
    }
  }
}

/**
 * 依存関係がインストールされているかチェック
 */
export function checkDependenciesInstalled(): boolean {
  const packageLockExists = existsSync('package-lock.json');
  const nodeModulesExists = existsSync('node_modules');
  const webappNodeModulesExists = existsSync(join('webapp', 'node_modules'));

  return packageLockExists && nodeModulesExists && webappNodeModulesExists;
}

/**
 * 依存関係をインストールする
 */
export function installDependencies(): void {
  console.log('📦 Installing dependencies...');

  try {
    // ルートの依存関係をインストール
    execSync('npm install', { stdio: 'inherit' });

    // webappの依存関係をインストール
    execSync('npm install', {
      stdio: 'inherit',
      cwd: 'webapp',
    });

    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    throw new Error(`Failed to install dependencies: ${error}`);
  }
}

/**
 * 依存関係を確実にインストールする
 */
export function ensureDependencies(): void {
  if (!checkDependenciesInstalled()) {
    installDependencies();
  } else {
    console.log('✅ Dependencies already installed');
  }
}
