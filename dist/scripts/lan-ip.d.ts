import { z } from 'zod';
declare const LanIpSchema: z.ZodObject<{
    ip: z.ZodString;
    family: z.ZodEnum<["IPv4", "IPv6"]>;
    interface: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ip: string;
    family: "IPv4" | "IPv6";
    interface: string;
}, {
    ip: string;
    family: "IPv4" | "IPv6";
    interface: string;
}>;
export type LanIp = z.infer<typeof LanIpSchema>;
/**
 * LAN IPアドレスを検出する
 * 優先順位: 10.x.x.x > 172.16-31.x.x > 192.168.x.x > その他のプライベートIP
 */
export declare function getLanIp(): LanIp | null;
/**
 * 利用可能なポートを検出する
 */
export declare function findAvailablePort(startPort?: number, maxAttempts?: number): Promise<number>;
export {};
//# sourceMappingURL=lan-ip.d.ts.map