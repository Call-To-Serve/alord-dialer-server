const http = require('http');
const url = require('url');
const crypto = require('crypto');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const APP_SID = process.env.TWILIO_APP_SID || '';
const CALLER_NUMBER = process.env.TWILIO_CALLER_NUMBER || '';

function base64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateToken(identity) {
  const now = Math.floor(Date.now() / 1000);
  const jti = ACCOUNT_SID + '-' + now;

  const header = base64url(JSON.stringify({
    cty: 'twilio-fpa;v=1',
    typ: 'JWT',
    alg: 'HS256'
  }));

  const payload = base64url(JSON.stringify({
    jti: jti,
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

  const sig = crypto
    .createHmac('sha256', AUTH_TOKEN)
    .update(header + '.' + payload)
    .digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return header + '.' + payload + '.' + sig;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200); res.end(); return;
  }

  const p = url.parse(req.url, true);

  if (p.pathname === '/token') {
    try {
      const token = generateToken(p.query.identity || 'ansaar');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ token, callerNumber: CALLER_NUMBER }));
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (p.pathname === '/voice') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const params = new URLSearchParams(body);
      const to = params.get('To') || p.query.To || '';
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${CALLER_NUMBER}" timeout="30">
    <Number>${to}</Number>
  </Dial>
</Response>`;
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(twiml);
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ALord Dialer Server Running');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));
