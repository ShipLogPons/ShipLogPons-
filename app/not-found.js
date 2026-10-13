import Link from 'next/link';

export default function NotFound() {
  return (
    <section>
      <div className="wrap prose">
        <h1 className="page-title">Not in the log</h1>
        <p className="lede">Shiplog has no page at this address. The project may have been renamed or is not indexed yet.</p>
        <p>
          <Link href="/explore">Browse builders</Link>, <Link href="/scan">scan a token</Link> or{' '}
          <Link href="/submit">submit a project</Link>.
        </p>
      </div>
    </section>
  );
}
