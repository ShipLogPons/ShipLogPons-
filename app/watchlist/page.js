import WatchlistView from './WatchlistView';

export const metadata = { title: 'Watchlist' };

export default function Watchlist() {
  return (
    <section>
      <div className="wrap">
        <h1 className="page-title">Your watchlist</h1>
        <p className="lede">Builders you starred. Saved in this browser only, no account needed.</p>
        <WatchlistView />
      </div>
    </section>
  );
}
