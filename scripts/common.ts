import WebSocket from 'ws';
import pc from 'picocolors';
import { setTimeout as sleep } from 'node:timers/promises';
import { fetch } from 'undici';

export interface CreateRoomResponse {
  roomId: string;
  joinToken: string;
  wsUrl: string;
}

export interface DiagResponse {
  status: string;
  port: number;
  host: string;
  websocketPath: string;
  tokenTtlMinutes: number;
  basePath: string;
  logLevel: string;
  roomsOnline: number;
  uptimeSeconds: number;
}

export const DEFAULT_BASE_HTTP = process.env.BASE_HTTP || 'http://localhost:3000';

export function logInfo(msg: string) {
  process.stdout.write(pc.gray(`• ${msg}\n`));
}

export function logStep(msg: string) {
  process.stdout.write(pc.blue(`➤ ${msg}\n`));
}

export function logPass(msg: string) {
  process.stdout.write(pc.green(`✔ ${msg}\n`));
}

export function logFail(msg: string) {
  process.stdout.write(pc.red(`✘ ${msg}\n`));
}

export async function createRoom(base = DEFAULT_BASE_HTTP): Promise<CreateRoomResponse> {
  const res = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return (await res.json()) as CreateRoomResponse;
}

export async function getDiag(base = DEFAULT_BASE_HTTP): Promise<DiagResponse> {
  const res = await fetch(`${base}/diag`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as DiagResponse;
}

export function connect(wsUrl: string, timeoutMs = 10000): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const t = setTimeout(() => {
      ws.close();
      reject(new Error(`Timeout opening ${wsUrl}`));
    }, timeoutMs);
    ws.once('open', () => {
      clearTimeout(t);
      resolve(ws);
    });
    ws.once('error', (err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

export function waitForMessage<T = any>(ws: WebSocket, predicate: (m: any) => boolean, timeoutMs = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (predicate(msg)) {
          cleanup();
          resolve(msg as T);
        }
      } catch (e) {
        // ignore
      }
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error('Timeout waiting for message'));
    };
    const cleanup = () => {
      ws.off('message', onMessage);
      ws.off('error', onError);
      clearTimeout(timer);
    };
    ws.on('message', onMessage);
    ws.on('error', onError);
    const timer = setTimeout(onTimeout, timeoutMs);
  });
}

export async function send(ws: WebSocket, msg: any) {
  await new Promise<void>((resolve, reject) => {
    ws.send(JSON.stringify(msg), (err) => (err ? reject(err) : resolve()));
  });
}

export async function join(ws: WebSocket, roomId: string, token: string) {
  await send(ws, { type: 'JOIN', roomId, token });
  await waitForMessage(ws, (m) => m.type === 'STATE');
}

export async function expectClose(ws: WebSocket, expected: { code?: number; reasonIncludes?: string }, timeoutMs = 5000) {
  const { code, reasonIncludes } = expected;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for close')), timeoutMs);
    ws.once('close', (c, r) => {
      clearTimeout(timer);
      const reasonStr = (typeof r === 'string' ? r : (r as Buffer).toString()).toString();
      if (code !== undefined && c !== code) {
        reject(new Error(`Unexpected close code: ${c}, reason=${reasonStr}`));
        return;
      }
      if (reasonIncludes && !reasonStr.includes(reasonIncludes)) {
        reject(new Error(`Unexpected close reason: ${reasonStr}`));
        return;
      }
      resolve();
    });
  });
}

export async function wait(ms: number) {
  await sleep(ms);
}

export interface PlaceResult {
  moveCount: number;
  rateLimitCount: number;
  errors: Array<{ code: string; message?: string }>;
}

export function collectMessages(ws: WebSocket, out: { moves: any[]; errors: any[] }) {
  const onMessage = (raw: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'MOVE') out.moves.push(msg);
      if (msg.type === 'ERROR') out.errors.push(msg);
    } catch {}
  };
  ws.on('message', onMessage);
  return () => ws.off('message', onMessage);
}

