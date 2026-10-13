# Shiplog

Who is really building on Pons? Shiplog reads every Pons launch on Robinhood Chain straight from the chain, finds the
tokens that link a GitHub repository, and logs every release, real code change and new contract as a ship, each with a
link to its proof.

Live at [shiplogpons.xyz](https://shiplogpons.xyz) · [@ShipLogPons](https://x.com/ShipLogPons) ·
Telegram bot [@ShipLogPonsBot](https://t.me/ShipLogPonsBot)

## Data sources

- **Pons contracts** on Robinhood Chain (chain 4663)
  - V2 factory `0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e` (`TokenLaunched`)
  - V1 factories `0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB` and `0x0c37a24F5D23A486FA692d1500881d698B1F77a4`
- **Submissions** made on Shiplog, verified when the repo README contains the token address
- **GitHub** releases and commits (public feeds, or the API with `GITHUB_TOKEN`)
- **DexScreener** for price and liquidity only. Market data never changes a score.

## Pages

| Path | What it is |
| --- | --- |
| `/` | Home: building now, ship log, builders of the week, signals, fresh launches |
| `/explore` | Every tracked builder |
| `/log` | Every ship, newest first |
| `/leaderboard` | Builders of the week |
| `/signals` | New builders, graduations, major releases, dev sold, liquidity gone and more |
| `/reports`, `/reports/[week]` | Weekly reports written from the data |
| `/launch` | Launch a token on Pons v2 from your own wallet, with your GitHub repo attached |
| `/scan` | Is anyone building behind a token? |
| `/project/[slug]`, `/dev/[owner]` | Project and developer pages |
| `/launches`, `/copycats`, `/watchlist`, `/submit` | New launches, copycat tokens, personal watchlist, submit a repo |
| `/about`, `/method`, `/glossary`, `/corrections`, `/docs` | About, rules, glossary, corrections log, API docs |

## API

`/api/projects`, `/api/ships`, `/api/scan?address=0x…`, `/api/report?week=YYYY-MM-DD`, badge `/api/badge/[slug]`,
embed card `/embed/[slug]`. JSON responses allow cross-origin requests.

## How indexing works

`lib/indexer.js` runs in passes of about 45 seconds. Passes are triggered by Vercel crons (`vercel.json`), by page
visits when data is stale, or by calling `/api/indexer`. Each pass reads new launches, fills token metadata, walks
older Pons history backwards checking every launch once for a GitHub link, follows dev wallets, contract deploys and
liquidity, and sends Telegram alerts. State is stored in Vercel Blob.

## Environment variables

| Name | Needed | Purpose |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob store for state, submissions and logos |
| `RPC_URL` | Recommended | Private Robinhood Chain RPC (for example Alchemy). Falls back to the public RPC |
| `TELEGRAM_BOT_TOKEN` | Optional | Enables the Telegram bot and alerts |
| `GITHUB_TOKEN` | Optional | Reads GitHub through the API instead of public feeds |
| `SITE_URL` | Optional | Overrides the site address. By default it follows the project's production domain |
| `CRON_SECRET` | Optional | Protects `/api/indexer` |

Never commit these values.

## Develop

```bash
npm install
npm run dev
```

Community tool. Not affiliated with Pons or Robinhood. Not financial advice.
