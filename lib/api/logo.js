// Serves IPFS token logos through several public gateways, so one slow gateway does not leave a broken image.
const GATEWAYS = ['https://dweb.link/ipfs/', 'https://gateway.pinata.cloud/ipfs/', 'https://w3s.link/ipfs/', 'https://ipfs.io/ipfs/', 'https://4everland.io/ipfs/'];
const MAX = 3 * 1024 * 1024;

async function tryGateway(base, path, signal) {
  const res = await fetch(base + path, { signal, headers: { accept: 'image/*' } });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !/^image\//.test(type)) throw new Error('not an image');
  const buf = await res.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > MAX) throw new Error('bad size');
  return { buf, type };
}

export async function GET(_req, { params }) {
  const { cid } = await params;
  const path = (cid || []).join('/');
  if (!/^[A-Za-z0-9]{20,100}(\/[A-Za-z0-9._-]{1,120})*$/.test(path)) return new Response('Bad logo id', { status: 400 });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const { buf, type } = await Promise.any(GATEWAYS.map((g) => tryGateway(g, path, ctrl.signal)));
    ctrl.abort();
    return new Response(buf, {
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response('Logo not found', { status: 404, headers: { 'cache-control': 'public, s-maxage=3600' } });
  } finally {
    clearTimeout(timer);
  }
}
