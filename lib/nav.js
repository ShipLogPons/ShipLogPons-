export const BOT_URL = 'https://t.me/ShipLogPonsBot';
export const X_URL = 'https://x.com/ShipLogPons';

// One menu, used by the header panel and the footer.
export const NAV_GROUPS = [
  {
    title: 'Discover',
    links: [
      ['/explore', 'Builders'],
      ['/log', 'Ship log'],
      ['/leaderboard', 'Builders of the week'],
      ['/signals', 'Signals'],
      ['/launches', 'New on Pons'],
    ],
  },
  {
    title: 'Research',
    links: [
      ['/reports', 'Weekly reports'],
      ['/scan', 'Scan a token'],
      ['/copycats', 'Copycats'],
    ],
  },
  {
    title: 'Monitor',
    links: [
      ['/watchlist', 'Watchlist'],
      [BOT_URL, 'Telegram alerts'],
      [X_URL, 'Follow on X'],
    ],
  },
  {
    title: 'For builders',
    links: [
      ['/launch', 'Launch a token'],
      ['/submit', 'Submit a project'],
      ['/docs#badge', 'README badge and card'],
    ],
  },
  {
    title: 'About',
    links: [
      ['/about', 'About Shiplog'],
      ['/method', 'How Shiplog works'],
      ['/glossary', 'Glossary'],
      ['/corrections', 'Corrections'],
      ['/docs', 'Open API'],
    ],
  },
];

export const PRIMARY = [
  ['/explore', 'Builders'],
  ['/log', 'Ship log'],
  ['/leaderboard', 'Top week'],
  ['/signals', 'Signals'],
  ['/reports', 'Reports'],
  ['/scan', 'Scan'],
  ['/launch', 'Launch'],
];
