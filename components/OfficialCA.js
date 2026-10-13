import { getOfficialToken } from '@/lib/official';
import CopyCA from './CopyCA';

// Shows the official $SHIPLOG contract address once the token is live. Renders nothing before that.
export default async function OfficialCA() {
  const t = await getOfficialToken();
  if (!t) return null;
  return (
    <div className="foot-ca">
      <span className="foot-ca-label">CA:</span>
      <code className="foot-ca-addr">{t.address}</code>
      <CopyCA address={t.address} />
    </div>
  );
}
