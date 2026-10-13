import { getIndex } from '@/lib/data';
import { getHolders } from '@/lib/holders';
import { marketFor } from '@/lib/market';
import { readRepo, ownerRepos } from '@/lib/github';
import { scoreProject } from '@/lib/score';
import { readTokenMeta, findLaunch, readCurves, deployerLaunches, githubFromMeta, blockTimestamp, CHAIN, PONS_URL, PHASE } from '@/lib/pons';

// Everything Shiplog can say about one token address, used by the Scan page and the Telegram bot.
export async function scanToken(input) {
  const address = (input || '').trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return { error: 'Paste a full token address: 0x followed by 40 characters.' };

  const [index, meta, market, launch] = await Promise.all([getIndex(), readTokenMeta(address), marketFor(address), findLaunch(address)]);
  const seen = [];
  const blind = [];

  const isPons = Boolean(meta?.ponsInfo || launch);
  if (isPons) seen.push('Pons token contract');
  else blind.push('Not a Pons token, or the chain did not answer');
  if (launch) seen.push('Pons launch record');
  if (market) seen.push('DEX market');
  else blind.push('No DEX market yet');

  let curve = null;
  let launchedAt = null;
  let deployer = null;
  let holders = null;
  if (launch) {
    const [curves, ts, dep, hold] = await Promise.all([
      launch.version === 'v2' ? readCurves([address]) : new Map(),
      blockTimestamp(launch.block),
      launch.deployer ? deployerLaunches(launch.deployer) : null,
      getHolders(address, { block: launch.block, deployer: launch.deployer, curve: launch.curve, pool: market?.pairAddress, budgetMs: 18000 }).catch(() => null),
    ]);
    holders = hold;
    if (holders) seen.push('Token transfer history');
    curve = curves.get(address) || null;
    launchedAt = ts;
    if (dep) {
      const builderTokens = new Set(index.projects.filter((p) => p.token).map((p) => p.token));
      deployer = { address: launch.deployer, count: dep.count, complete: dep.complete, withRepo: dep.launches.filter((l) => builderTokens.has(l.token)).length };
    }
  }

  const project = index.projects.find((p) => p.token === address) || null;
  let builder = null;
  let identity = 'none';
  if (project) {
    identity = project.verified ? 'verified' : 'metadata';
    builder = { slug: project.slug, status: project.status, momentum: project.momentum, lastShip: project.lastShip, repos: project.repos };
  } else {
    const links = githubFromMeta(meta);
    if (links.length) {
      const g = links[0];
      const repos = g.repo ? [`${g.owner}/${g.repo}`] : await ownerRepos(g.owner, 1);
      if (repos.length) {
        const read = await readRepo(repos[0]);
        const score = scoreProject({ ships: read.ships, repoCount: 1, readableCount: read.readable ? 1 : 0 });
        identity = 'metadata';
        builder = { repos, status: score.status, momentum: score.momentum, lastShip: score.lastShip };
        seen.push('GitHub repository from token metadata');
      }
    } else {
      blind.push('The token links no GitHub repository');
    }
  }

  let verdict;
  if (builder && ['shipping', 'resumed', 'active'].includes(builder.status)) {
    verdict = { level: 'strong', title: 'Someone is building this', text: 'A repository tied to this token shows real releases or code work in the last 30 days.' };
  } else if (builder) {
    verdict = { level: 'weak', title: 'A builder is linked, but quiet', text: 'Shiplog found a repository, but little recent real work on it.' };
  } else if (isPons) {
    verdict = { level: 'none', title: 'A Pons token with no builder in sight', text: 'The token links no repository Shiplog can read. That is not proof of anything bad, only that building cannot be seen.' };
  } else {
    verdict = { level: 'none', title: 'Shiplog cannot find this token on Pons', text: 'Check the address. Shiplog only reads tokens launched through the Pons contracts on Robinhood Chain.' };
  }

  return {
    address,
    verdict,
    identity,
    builder,
    token: meta ? { name: meta.name, symbol: meta.symbol, logo: meta.logo, description: meta.description, socials: meta.socials } : null,
    launch: launch ? { version: launch.version, block: launch.block, deployer: launch.deployer, ts: launchedAt, phase: curve ? PHASE[curve.phase] : null, progress: curve?.progress ?? null } : null,
    deployer,
    holders: holders
      ? { partial: holders.partial, holders: holders.holders, top10Pct: holders.top10Pct, circulatingPct: holders.circulatingPct, dev: holders.dev ? { status: holders.dev.status, nowPct: holders.dev.nowPct, peakPct: holders.dev.peakPct, soldPct: holders.dev.soldPct, movedPct: holders.dev.movedPct } : null }
      : null,
    market: market ? { name: market.name, symbol: market.symbol, fdv: market.fdv, liquidity: market.liquidity, volume24: market.volume24, url: market.url } : null,
    seen,
    blind,
    pons: PONS_URL(address),
    explorer: `${CHAIN.explorer}/token/${address}`,
  };
}
