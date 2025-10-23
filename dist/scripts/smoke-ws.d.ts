interface SmokeTestOptions {
    roomId: string;
    token: string;
    wsUrl: string;
    timeout?: number;
}
interface SmokeTestResult {
    success: boolean;
    error?: string;
    steps: string[];
}
/**
 * WebSocket接続のスモークテストを実行
 */
export declare function runSmokeTest(options: SmokeTestOptions): Promise<SmokeTestResult>;
export {};
//# sourceMappingURL=smoke-ws.d.ts.map