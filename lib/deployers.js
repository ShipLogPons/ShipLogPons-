import { unstable_cache } from 'next/cache';
import { deployerLaunches } from './pons';

// Deployer history is read from the chain on demand and kept for an hour.
export const getDeployerHistory = (address) =>
  unstable_cache(() => deployerLaunches(address), ['deployer-v1', address.toLowerCase()], { revalidate: 3600 })();
