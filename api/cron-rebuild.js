// Daily rebuild so blog posts with a future date go live on their date.
// Vercel Cron (see vercel.json) calls this every morning with
// "Authorization: Bearer <CRON_SECRET>"; we then fire the project's Deploy Hook,
// which rebuilds the site from main (scripts/build-blog.js skips posts dated after today).
// Env: CRON_SECRET (set by Vercel when crons are enabled), DEPLOY_HOOK_URL
// (Project Settings → Git → Deploy Hooks).
module.exports = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const hook = process.env.DEPLOY_HOOK_URL;
  if (!hook) return res.status(500).json({ error: 'DEPLOY_HOOK_URL is not set' });

  const r = await fetch(hook, { method: 'POST' });
  const body = await r.text();
  if (!r.ok) return res.status(502).json({ error: 'deploy hook failed', status: r.status, body });
  return res.status(200).json({ ok: true, triggered: new Date().toISOString() });
};
