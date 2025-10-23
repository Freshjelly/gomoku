/**
 * クリップボードにテキストをコピーする（OS別対応）
 */
export declare function copyToClipboard(text: string): Promise<void>;
/**
 * 依存関係がインストールされているかチェック
 */
export declare function checkDependenciesInstalled(): boolean;
/**
 * 依存関係をインストールする
 */
export declare function installDependencies(): void;
/**
 * 依存関係を確実にインストールする
 */
export declare function ensureDependencies(): void;
//# sourceMappingURL=clipboard.d.ts.map