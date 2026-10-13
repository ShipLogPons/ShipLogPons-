export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Checks that the private RPC accepts the calls the indexer makes. Never returns the RPC address.
async function rpc(url, method, params) {
  const t = Date.now();
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15000) });
    const j = await res.json();
    if (j.error) return { ok: false, ms: Date.now() - t, error: String(j.error.message || j.error.code).slice(0, 160) };
    return { ok: true, ms: Date.now() - t, size: Array.isArray(j.result) ? j.result.length : j.result };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, error: String(e.message).slice(0, 160) };
  }
}

export async function GET() {
  const url = process.env.RPC_URL;
  if (!url) return Response.json({ private: false });
  const head = await rpc(url, 'eth_blockNumber', []);
  const n = head.ok ? parseInt(head.size, 16) : 0;
  const hex = (x) => `0x${Math.max(0, x).toString(16)}`;
  const f = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';
  const topic = '0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607';
  const logs = {};
  for (const span of [2000, 50000, 1000000, 5000000]) logs[span] = await rpc(url, 'eth_getLogs', [{ address: f, topics: [topic], fromBlock: hex(n - span), toBlock: hex(n) }]);
  const open = await rpc(url, 'eth_getLogs', [{ topics: ['0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0'], fromBlock: hex(n - 30000), toBlock: hex(n) }]);
  return Response.json({ private: true, head: { ok: head.ok, block: n, ms: head.ms }, logs, unfilteredLogs30k: open });
}
