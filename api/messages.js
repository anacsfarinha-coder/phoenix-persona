// Vercel Serverless Function - API Proxy with Shared API Key
// This uses your API key stored in Vercel environment variables

const https = require('https');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, anthropic-version');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment variable (set in Vercel)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Server configuration error: API key not configured. Please set ANTHROPIC_API_KEY in Vercel environment variables.' 
    });
  }

  const body = JSON.stringify(req.body);
  
  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  return new Promise((resolve, reject) => {
    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      
      proxyRes.on('data', (chunk) => {
        data += chunk;
      });
      
      proxyRes.on('end', () => {
        res.status(proxyRes.statusCode);
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
        resolve();
      });
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy error:', error);
      res.status(500).json({ error: error.message });
      resolve();
    });

    proxyReq.write(body);
    proxyReq.end();
  });
};
