// Live price chart from DexScreener, shown once the token trades on a DEX pool.
export default function PriceChart({ market }) {
  if (!market?.pairAddress) return null;
  const src = `https://dexscreener.com/robinhood/${market.pairAddress}?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartDefaultOnMobile=1&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=60`;
  return (
    <div className="panel">
      <h2>Price</h2>
      <div className="chart-frame">
        <iframe src={src} title="Price chart from DexScreener" loading="lazy" referrerPolicy="no-referrer" />
      </div>
      <p className="note">
        Compare it with the activity calendar: did the price move after real work shipped, or on hype alone? Chart by{' '}
        <a href={market.url} target="_blank" rel="noopener noreferrer">DexScreener</a>.
      </p>
    </div>
  );
}
