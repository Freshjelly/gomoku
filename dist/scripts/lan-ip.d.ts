/**
 * LAN IPアドレスを検出する
 * 優先順位: 10.x.x.x > 172.16-31.x.x > 192.168.x.x > localhost
 */
export declare function getLanIp(): string;
/**
 * 利用可能なポートを検出する
 */
export declare function findAvailablePort(startPort?: number, maxAttempts?: number): Promise<number>;
//# sourceMappingURL=lan-ip.d.ts.map