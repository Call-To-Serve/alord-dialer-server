const http = require('http');
const url = require('url');
const crypto = require('crypto');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const APP_SID = process.env.TWILIO_APP_SID || '';
const CALLER_NUMBER = process.env.TWILIO_CALLER_NUMBER || '';

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateToken(identity) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' }));
  const now = Math.floor(Date.now() / 1000);

  const payload = base64url(JSON.stringify({
    jti: ACCOUNT_SID + '-' + now,
    iss: ACCOUNT_SID,
    sub: ACCOUNT_SID,
    exp: now + 3600,
    grants: {
      identity: identity,
      voice: {
        incoming: { allow: false },
        outgoing: { application_sid: APP_SID }
      }
    }
  }));

  const signature = crypto.createHmac('sha256', AUTH_TOKEN)
    .update(header + '.' + payload)
    .digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return header + '.' + payload + '.' + signature;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/token') {
    const identity = parsedUrl.query.identity || 'ansaar';
    try {
      const token = generateToken(identity);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, identity, callerNumber: CALLER_NUMBER }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (parsedUrl.pathname === '/voice') {
    const to = req.method === 'POST' ? '' : (parsedUrl.query.To || '');
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${CALLER_NUMBER}" timeout="30">
    <Number>${to}</Number>
  </Dial>
</Response>`;
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml);
    return;
  }

  if (parsedUrl.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ALord Dialer Server Running');
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));
