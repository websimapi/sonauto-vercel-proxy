import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

// --- Configuration ---
// Note: You MUST set JWT_SECRET as an environment variable in Vercel.
const JWT_SECRET = process.env.JWT_SECRET || 'a-very-strong-secret-default'; 
// Updated URL
const WEBSIM_AUTH_URL = 'https://sonauto-api.on.websim.com'; 
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes for the challenge to be verified
const ACCESS_TOKEN_LIFETIME_SECONDS = 60 * 60; // 1 hour access token

// --- Helper Functions ---

// Generates a JWT token for the user
function generateAccessToken(username) {
    return jwt.sign(
        { username, authorized: true },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_LIFETIME_SECONDS }
    );
}

// Generates a simple, secure challenge token
function generateChallengeToken() {
    return uuidv4();
}

// Fetches the latest challenge records from the publicly accessible Websim database
async function fetchWebsimChallenges() {
    // The query URL is updated to use the new Websim base URL
    const url = `${WEBSIM_AUTH_URL}/api/v1/auth_challenge_v1/list/latest?limit=20`;
    
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Websim API fetch failed: ${response.status} ${response.statusText}`);
    }
    return response.json(); 
}


export default async function handler(req, res) {
    // Set CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    // Extract the path after /api/auth
    const path = req.url.replace(/^\/api\/auth\/?/i, '');
    
    try {
        if (path.startsWith('challenge')) {
            // --- 1. CHALLENGE ROUTE: Generate and return a token ---
            const challengeToken = generateChallengeToken();
            
            return res.status(200).json({ 
                challenge_token: challengeToken,
                challenge_expires_at: Date.now() + CHALLENGE_EXPIRY_MS,
                // The client side will use this URL to redirect the user
                websim_auth_url: WEBSIM_AUTH_URL,
            });

        } else if (path.startsWith('verify') && req.method === 'POST') {
            // --- 2. VERIFY ROUTE: Check Websim DB and issue access token ---
            const { challenge_token, username } = req.body;

            if (!challenge_token || !username) {
                return res.status(400).json({ error: 'Missing challenge_token or username.' });
            }

            const challenges = await fetchWebsimChallenges();
            
            // Find a matching, recent challenge
            const match = challenges.rows.find(row => 
                row.token === challenge_token && 
                row.username === username &&
                (Date.now() - new Date(row.created_at).getTime() < CHALLENGE_EXPIRY_MS)
            );

            if (match) {
                const accessToken = generateAccessToken(username);
                return res.status(200).json({ 
                    access_token: accessToken,
                    token_type: 'Bearer',
                    expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
                    username: username
                });
            } else {
                return res.status(401).json({ error: 'Authorization failed. Token/Username mismatch or challenge expired.' });
            }

        } else {
            return res.status(404).json({ error: 'Not Found' });
        }
    } catch (err) {
        console.error("Auth Proxy Error:", err);
        res.status(500).json({ error: 'Internal Server Error during authorization: ' + err.message });
    }
}
