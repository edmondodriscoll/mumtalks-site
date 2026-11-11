// Vercel serverless form handler (used instead of forms/submit.php on Vercel).
// Set these in Vercel > Project > Settings > Environment Variables:
//   RESEND_API_KEY   – from resend.com (free tier) to email submissions
//   TO_EMAIL         – where submissions go (default hello@mumtalks.ie)
//   FROM_EMAIL       – a sender on a domain verified in Resend
//   MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID – optional, adds newsletter sign-ups to Mailchimp
const crypto = require('crypto');

function parseMultipart(buf, boundary) {
  const out = {};
  const parts = buf.toString('utf8').split('--' + boundary);
  for (const part of parts) {
    const m = /name="([^"]+)"[^\r\n]*\r\n(?:[^\r\n]+\r\n)*\r\n([\s\S]*?)\r\n$/.exec(part);
    if (!m) continue;
    const k = m[1], v = m[2];
    if (k.endsWith('[]')) { const kk = k.slice(0, -2); (out[kk] = out[kk] || []).push(v); }
    else out[k] = v;
  }
  return out;
}
async function readBody(req) {
  const chunks = []; for await (const c of req) chunks.push(c);
  const buf = Buffer.concat(chunks);
  const ct = req.headers['content-type'] || '';
  const b = /boundary=([^;]+)/.exec(ct);
  if (b) return parseMultipart(buf, b[1].replace(/"/g, ''));
  const out = {}; new URLSearchParams(buf.toString()).forEach((v, k) => {
    if (k.endsWith('[]')) { const kk = k.slice(0, -2); (out[kk] = out[kk] || []).push(v); } else out[k] = v; });
  return out;
}

module.exports = async (req, res) => {
  const json = (code, ok, message) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok, status: ok ? 'mail_sent' : 'mail_failed', message })); };
  if (req.method !== 'POST') return json(405, false, 'Method not allowed.');
  const raw = await readBody(req);
  const fields = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_wpcf7') || k.startsWith('_mc4wp')) continue;
    fields[k] = (Array.isArray(v) ? v.join(', ') : String(v)).slice(0, 5000).trim();
  }
  const email = fields.email || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, false, 'Please enter a valid email address.');
  const isNews = raw._wpcf7 === '85' || 'checkbox' in raw;
  const formName = isNews ? 'Newsletter sign-up' : (raw._wpcf7 === '94' ? 'Contact form' : 'Website form');

  const env = process.env;
  try {
    if (isNews && env.MAILCHIMP_API_KEY && env.MAILCHIMP_LIST_ID) {
      const dc = env.MAILCHIMP_API_KEY.split('-')[1] || 'us1';
      const hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
      const auth = 'Basic ' + Buffer.from('mt:' + env.MAILCHIMP_API_KEY).toString('base64');
      const base = `https://${dc}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_LIST_ID}/members/${hash}`;
      await fetch(base, { method: 'PUT', headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: email, status_if_new: 'pending' }) });
      const tags = (fields.checkbox || '').split(',').map(s => s.trim()).filter(Boolean);
      if (tags.length) await fetch(base + '/tags', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: tags.map(name => ({ name, status: 'active' })) }) });
    }
    const text = `New ${formName} from mumtalks.ie\n\n` + Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n');
    console.log('[form]', formName, JSON.stringify(fields));
    if (env.RESEND_API_KEY) {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST',
        headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: env.FROM_EMAIL || 'Mum Talks <onboarding@resend.dev>', to: [env.TO_EMAIL || 'hello@mumtalks.ie'],
          reply_to: email, subject: `[Mum Talks] ${formName}`, text }) });
      if (!r.ok) throw new Error('email ' + r.status);
    }
    return json(200, true, isNews ? 'Thank you for subscribing! Keep an eye on your inbox.' : 'Thank you for your message. It has been sent.');
  } catch (e) {
    console.error(e);
    return json(500, false, 'There was an error trying to send your message. Please try again later.');
  }
};
