import Link from 'next/link';
import '../pages.css';
import './launch.css';
import LaunchForm from './LaunchForm';

export const metadata = {
  title: 'Launch a token on Pons',
  description: 'Launch a Pons token on Robinhood Chain with your GitHub repository attached, so Shiplog tracks your work from the first block.',
};

export default function LaunchPage() {
  return (
    <section>
      <div className="wrap" style={{ maxWidth: 760 }}>
        <h1 className="page-title">Launch on Pons</h1>
        <p className="lede">
          Launch a token on Pons with your GitHub repository attached. Shiplog starts tracking your commits and releases from
          the first block, so holders can see you are building.
        </p>
        <ul className="ln-facts">
          <li><b>0.0005 ETH</b><span>Pons launch fee, plus gas</span></li>
          <li><b>1B</b><span>fixed supply</span></li>
          <li><b>4.2 ETH</b><span>raised to graduate to Uniswap</span></li>
          <li><b>Locked</b><span>liquidity is locked forever at graduation</span></li>
        </ul>
        <LaunchForm />
        <div className="ln-notes">
          <h2>Before you launch</h2>
          <ul>
            <li>You sign the transaction in your own wallet, straight to the official Pons v2 contracts. Shiplog never holds your funds or keys, and adds no fee.</li>
            <li>When the bonding curve fills, Pons moves the liquidity into a Uniswap v4 pool and its locker holds it permanently. Nobody can pull it, including you.</li>
            <li>Pons describes its v2 contracts as unaudited while audits are in progress. Launch only what you can afford to lose.</li>
            <li>A launch from Shiplog is not an endorsement. Your token is judged by what you ship, like every other builder. <Link href="/method">How Shiplog works</Link></li>
          </ul>
        </div>
      </div>
    </section>
  );
}
