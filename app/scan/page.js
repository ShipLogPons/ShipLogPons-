import ScanForm from './ScanForm';

export const metadata = { title: 'Scan a Pons token' };

export default async function ScanPage({ searchParams }) {
  const sp = await searchParams;
  const initial = typeof sp.address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(sp.address) ? sp.address : '';
  return (
    <section>
      <div className="wrap">
        <h1 className="page-title">Is anyone building it?</h1>
        <p className="lede">
          Paste a Pons token address. Shiplog reads the token and its launch from the chain, follows any GitHub repo tied
          to it, and says plainly what it could and could not see.
        </p>
        <ScanForm initial={initial} />
      </div>
    </section>
  );
}
