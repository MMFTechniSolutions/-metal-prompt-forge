// Test local du serveur MCP (sans Supabase) : node scripts/test-mcp.mjs
import mcp, { _test, protectedResourceMetadata } from '../api/_lib/mcp.js';
import profile from '../api/profile.js';
process.env.VITE_SUPABASE_URL ||= 'https://wlnttrzmjfefyghxlbyb.supabase.co';
const fakeRes = () => ({ code: 200, h: {}, status(c) { this.code = c; return this; }, setHeader(k, v) { this.h[k] = v; }, json(d) { this.body = d; return this; }, end() { return this; } });

let r = fakeRes(); await mcp({ method: 'POST', headers: {}, body: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} } }, r);
console.log('sans jeton →', r.code, r.h['WWW-Authenticate']);
r = fakeRes(); protectedResourceMetadata({}, r); console.log('PRM →', JSON.stringify(r.body));

const ctx = { allowed: true, owner: true, token: 'x', profile };
console.log('init →', JSON.stringify(await _test.handleOne({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, ctx)).slice(0, 160));
console.log('tools →', (await _test.handleOne({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, ctx)).result.tools.map(t => t.name));
const denied = await _test.handleOne({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'forger_prompt', arguments: { idee: 'thrash 1986' } } }, { ...ctx, allowed: false, owner: false });
console.log('non abonné →', denied.result.content[0].text);
for (const idee of ['florida death metal 1996', 'progressive death metal + jazz fusion 2018', 'black metal']) {
  const f = await _test.toolForger({ idee }, ctx); console.log('\n### forger', idee, '\n' + (f.text || f.error));
}
const rf = await _test.toolRiff({ style: 'thrash metal, 1986, 190 BPM, E standard' }); console.log('\n### riff\n' + (rf.text || rf.error).slice(0, 600));
