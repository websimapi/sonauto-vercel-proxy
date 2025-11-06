// api/sonauto.js
export default async function handler(req, res) {
  const path = req.url.replace('/api/sonauto', ''); // remove prefix
  const url = `https://api.sonauto.ai/v1${path}`;

  const resp = await fetch(url, {
    method: req.method,
    headers: {
      'Authorization': `Bearer ${process.env.SONAUTO_KEY}`,
      'Content-Type': 'application/json'
    },
    body: req.method !== 'GET' ? await req.text() : undefined,
  });

  const text = await resp.text();
  res.status(resp.status).send(text);
}
