import fetch from 'node-fetch';

export default async function handler(req, res) {
    try {
        const path = req.url;
        const response = await fetch(`https://api.sonauto.ai/v1${path}`, {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${process.env.SONAUTO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
