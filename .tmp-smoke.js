const { createRequire } = require('module');
const requireFromRoot = createRequire(process.cwd() + '/');
const WebSocket = requireFromRoot('ws');
(async () => {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (!res.ok) throw new Error('create room HTTP ' + res.status);
    const { roomId, joinToken } = await res.json();
    const ws = new WebSocket('ws://127.0.0.1:3000/ws');
    let gotState = false, gotMove = false;
    const timer = setTimeout(() => { console.error('Timeout'); process.exit(2); }, 10000);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'JOIN', roomId, token: joinToken })));
    ws.on('message', (data) => {
      try {
        const m = JSON.parse(data.toString());
        if (m.type === 'STATE' && !gotState) { gotState = true; setTimeout(() => ws.send(JSON.stringify({ type:'PLACE', x:0, y:0 })), 200); }
        if (m.type === 'MOVE' && !gotMove) { gotMove = true; clearTimeout(timer); console.log('Local WS smoke PASS'); process.exit(0); }
        if (m.type === 'ERROR') { console.error('ERROR', m.code, m.message||''); }
      } catch {}
    });
    ws.on('close', (c, r) => { if (!gotMove) { console.error('WS closed', c, r?.toString()); process.exit(3);} });
    ws.on('error', (e) => { console.error('WS error', e.message); process.exit(4); });
  } catch (e) { console.error('Smoke setup error', e.message||e); process.exit(5); }
})();
