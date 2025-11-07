import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

// IMPORTANT: This secret MUST match the JWT_SECRET set in your Vercel Environment Variables.
const JWT_SECRET = process.env.JWT_SECRET; 

export default async function handler(req, res) {
    // 1. Set CORS Headers (Essential for cross-domain access)
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    // 2. Authorization (JWT) Check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization token (JWT) required.' });
    }

    const accessToken = authHeader.split(' ')[1];
    let decoded;

    try {
        // Verify the JWT using the secret key
        decoded = jwt.verify(accessToken, JWT_SECRET);
        // The token is valid and non-expired.
        console.log(`Request authorized by user: ${decoded.username}`);
        
    } catch (err) {
        // If JWT validation fails (invalid signature, expired token, etc.)
        return res.status(403).json({ error: 'Invalid or expired access token. Please re-authenticate.' });
    }

    // 3. Original Proxy Logic (Now only executes if the JWT is valid)
    try {
        const fullPath = req.url; 
        
        // Strip the Vercel function path (/api/sonauto) to get the target path (/generations)
        const targetPath = fullPath.replace(/^\/api\/sonauto/i, ''); 
        const finalPath = targetPath || '/'; 

        // 4. Forward the request to the external API
        const response = await fetch(`https://api.sonauto.ai/v1${finalPath}`, {
            method: req.method,
            headers: {
                // CRITICAL FIX: Inject the Sonauto API Key
                'Authorization': `Bearer ${process.env.SONAUTO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' 
                    ? JSON.stringify(req.body) 
                    : undefined,
        });

        // 5. Send the API's response back to the client
        const data = await response.json();
        
        // Add CORS header to the final response as well
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        res.status(response.status).json(data);
    } catch (err) {
        console.error("Proxy Forward Error:", err);
        res.status(500).json({ error: 'Internal Proxy Error during forwarding: ' + err.message });
    }
}
