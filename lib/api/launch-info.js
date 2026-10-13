import { NextResponse } from 'next/server';
import { parseAbi, encodeFunctionData, decodeFunctionResult } from 'viem';
import { client } from '@/lib/pons';

const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';
const ROUTER = '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948';
const ABI = parseAbi([
  'function launchFee() view returns (uint256)',
  'function canLaunch(address) view returns (bool)',
  'function launchConfigCount() view returns (uint256)',
  'function maxCreatorTaxBps() view returns (uint16)',
  'function approvedPairTokens(address) view returns (bool)',
  'function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)',
  'function getLaunchConfig(uint256 id) view returns ((uint256 supply, uint256 curveFeeBps, uint256 phantomQuote, uint256 graduationThreshold, uint24 poolFee, int24 tickSpacing, bool enabled))',
]);

async function call(fn, args = [], to = FACTORY) {
  try {
    const data = encodeFunctionData({ abi: ABI, functionName: fn, args });
    const res = await client.request({ method: 'eth_call', params: [{ to, data }, 'latest'] });
    const v = decodeFunctionResult({ abi: ABI, functionName: fn, data: res });
    return JSON.parse(JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? x.toString() : x)));
  } catch (e) {
    return { error: String(e.shortMessage || e.message).slice(0, 200) };
  }
}

// Public read of the Pons v2 launch settings, used by the launch page.
export async function GET(req) {
  const who = new URL(req.url).searchParams.get('address') || '0x000000000000000000000000000000000000dEaD';
  const count = await call('launchConfigCount');
  const n = Math.min(Number(count) || 0, 8);
  const configs = [];
  for (let i = 0; i < n; i++) configs.push({ id: i, config: await call('getLaunchConfig', [BigInt(i)]), economicsEth: await call('previewLaunchEconomics', [BigInt(i), '0x0000000000000000000000000000000000000000']) });
  const routerCode = await client.request({ method: 'eth_getCode', params: [ROUTER, 'latest'] }).catch(() => null);
  return NextResponse.json({
    factory: FACTORY,
    router: ROUTER,
    routerDeployed: Boolean(routerCode && routerCode !== '0x'),
    launchFee: await call('launchFee'),
    canLaunch: { address: who, value: await call('canLaunch', [who]) },
    maxCreatorTaxBps: await call('maxCreatorTaxBps'),
    ethPairApproved: await call('approvedPairTokens', ['0x0000000000000000000000000000000000000000']),
    wethPairApproved: await call('approvedPairTokens', ['0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73']),
    launchConfigCount: count,
    configs,
  });
}
