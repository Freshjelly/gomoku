import { ChildProcess } from 'child_process';
export interface TunnelResult {
    url: string;
    process: ChildProcess;
}
/**
 * Cloudflare Tunnelを起動する
 */
export declare function startCloudflareTunnel(port: number): Promise<TunnelResult | null>;
/**
 * プロセスを安全に終了する
 */
export declare function killProcess(childProcess: ChildProcess): void;
//# sourceMappingURL=tunnel.d.ts.map