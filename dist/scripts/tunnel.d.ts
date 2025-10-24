import { ChildProcess } from 'child_process';
export interface TunnelResult {
    url: string;
    process: ChildProcess;
    stop: () => void;
}
export interface StartTunnelOptions {
    timeoutMs?: number;
    silent?: boolean;
    protocol?: 'quic' | 'http2' | 'auto';
    targetUrl?: string;
}
/**
 * Cloudflare Tunnelを起動し、公開URLを取得する
 */
export declare function startCloudflareTunnel(port: number, options?: StartTunnelOptions): Promise<TunnelResult | null>;
export declare function isCloudflaredInstalled(): boolean;
/**
 * プロセスを安全に終了する
 */
export declare function killProcess(childProcess: ChildProcess | null | undefined): void;
//# sourceMappingURL=tunnel.d.ts.map