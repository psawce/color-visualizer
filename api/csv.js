/**
 * Proxies the Dropbox CSV so the browser only talks to same-origin /api/csv.
 * Dropbox share URLs often 302 without CORS headers, which breaks client fetch().
 *
 * Optional: set DROPBOX_CSV_URL in Vercel → Project → Settings → Environment Variables.
 */
const DEFAULT_DROPBOX =
  'https://www.dropbox.com/scl/fi/x0wb6pipwf09lua53mr63/law_firm_colors.csv?rlkey=0rx29eox7x4102jh10c2ef7j6&raw=1';

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').send('Method Not Allowed');
    return;
  }

  let url = process.env.DROPBOX_CSV_URL || DEFAULT_DROPBOX;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('dropbox.com') && !u.searchParams.has('raw')) {
      u.searchParams.set('raw', '1');
      url = u.toString();
    }
  } catch (_) {
    res.status(500).send('Invalid DROPBOX_CSV_URL');
    return;
  }

  try {
    const r = await fetch(url, { redirect: 'follow' });
    const body = await r.text();
    if (!r.ok) {
      res.status(r.status).setHeader('Content-Type', 'text/plain; charset=utf-8').send(body);
      return;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=86400');
    res.status(200).send(body);
  } catch (e) {
    console.error(e);
    res.status(502).setHeader('Content-Type', 'text/plain; charset=utf-8').send('Upstream fetch failed');
  }
};
