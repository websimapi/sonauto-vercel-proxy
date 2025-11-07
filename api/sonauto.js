import fetch from 'node-fetch';

export default async function handler(req, res) {
    try {
        // 1. Get the full path (e.g., /api/sonauto/generations)
        const fullPath = req.url; 
        
        // 2. Strip the Vercel function path (/api/sonauto) to get the target path (/generations)
        // This regex ensures we only send the part Sonauto API expects.
        const targetPath = fullPath.replace(/^\/api\/sonauto/i, ''); 
        
        // Ensure the path is at least '/' if nothing follows the function name
        const finalPath = targetPath || '/'; 

        // 3. Forward the request to the external API
        const response = await fetch(`https://api.sonauto.ai/v1${finalPath}`, {
            method: req.method,
            headers: {
                // CRITICAL FIX: Securely inject the Authorization header here
                'Authorization': `Bearer ${process.env.SONAUTO_API_KEY}`,
                'Content-Type': 'application/json',
            },
            // Forward the body only for POST/PUT/PATCH requests
            body: req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' 
                  ? JSON.stringify(req.body) 
                  : undefined,
        });

        // 4. Send the API's response back to the client
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        // Log the error for internal debugging
        console.error("Proxy Error:", err);
        res.status(500).json({ error: 'Internal Proxy Error: ' + err.message });
    }
}
