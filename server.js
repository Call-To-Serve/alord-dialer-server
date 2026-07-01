const http = require('http');
const url = require('url');
const crypto = require('crypto');

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const APP_SID = process.env.TWILIO_APP_SID || '';
const CALLER_NUMBER = process.env.TWILIO_CALLER_NUMBER || '';

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

function generateToken(identity) {
  const now = Math.floor(Date.now()/1000);
  const header = base64url(JSON.stringify({cty:'twilio-fpa;v=1',typ:'JWT',alg:'HS256'}));
  const payload = base64url(JSON.stringify({jti:ACCOUNT_SID+'-'+now,iss:ACCOUNT_SID,sub:ACCOUNT_SID,exp:now+3600,grants:{identity:identity,voice:{incoming:{allow:false},outgoing:{application_sid:APP_SID}}}}));
  const sig = crypto.createHmac('sha256',AUTH_TOKEN).update(header+'.'+payload).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return header+'.'+payload+'.'+sig;
}

const DIALER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>A.Lord Dialer</title>
<script src="https://media.twiliocdn.com/sdk/js/client/v1.13/twilio.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#080808;color:#e8e8e8;font-family:sans-serif;min-height:100vh}
.topbar{background:#101010;border-bottom:1px solid #1e1e1e;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.logo{font-size:16px;font-weight:700;letter-spacing:2px}
.logo span{color:#c9a84c}
.pill{display:flex;align-items:center;gap:7px;background:#161616;border:1px solid #1e1e1e;border-radius:20px;padding:5px 12px;font-size:11px;color:#888}
.dot{width:7px;height:7px;border-radius:50%;background:#444;transition:all .3s}
.dot.ok{background:#3dba6e;box-shadow:0 0 6px #3dba6e}
.dot.ring{background:#c9a84c;box-shadow:0 0 6px #c9a84c;animation:blink 1s infinite}
.dot.err{background:#e03e3e}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
.tabs{display:flex;background:#101010;border-bottom:1px solid #1e1e1e}
.tab{flex:1;padding:11px;text-align:center;font-size:12px;color:#444;cursor:pointer;border-bottom:2px solid transparent}
.tab.on{color:#c9a84c;border-bottom-color:#c9a84c}
.page{display:none;padding:16px;max-width:480px;margin:0 auto}
.page.on{display:block}
.card{background:#101010;border:1px solid #1e1e1e;border-radius:12px;padding:16px;margin-bottom:14px}
.ctitle{font-size:10px;color:#444;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px}
.field{margin-bottom:12px}
.field label{display:block;font-size:11px;color:#888;margin-bottom:5px}
.field input,.field select,.field textarea{width:100%;background:#080808;border:1px solid #1e1e1e;border-radius:7px;padding:10px 12px;color:#e8e8e8;font-size:13px;outline:none;font-family:inherit}
.field textarea{resize:vertical;min-height:60px}
.btn{width:100%;padding:12px;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:8px}
.gold{background:#c9a84c;color:#080808}
.green{background:#0f2a1a;border:1px solid #3dba6e;color:#3dba6e}
.red{background:#2a0f0f;border:1px solid #e03e3e;color:#e03e3e}
.ghost{background:transparent;border:1px solid #1e1e1e;color:#888}
.ndisplay{background:#080808;border:1px solid #1e1e1e;border-radius:10px;padding:16px;text-align:center;margin-bottom:14px;min-height:60px;display:flex;align-items:center;justify-content:center;flex-direction:column}
.num{font-size:24px;letter-spacing:3px;color:#fff;font-weight:300}
.hint{font-size:12px;color:#333}
.cname{font-size:12px;color:#c9a84c;margin-bottom:3px}
.timer{text-align:center;font-size:26px;font-weight:300;color:#3dba6e;letter-spacing:3px;padding:8px;display:none}
.timer.on{display:block}
.keypad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.key{background:#161616;border:1px solid #1e1e1e;border-radius:10px;padding:13px 8px;text-align:center;cursor:pointer;user-select:none}
.key:active{transform:scale(.94)}
.d{font-size:19px;font-weight:300;color:#fff;display:block;line-height:1}
.l{font-size:8px;color:#444;letter-spacing:1.5px;margin-top:2px}
.cactions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.outcomes{display:none;margin-top:12px}
.outcomes.on{display:block}
.olabel{font-size:11px;color:#888;margin-bottom:8px;text-align:center}
.ogrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ob{padding:9px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:inherit}
.an{background:#0f2a1a;color:#3dba6e;border:1px solid #3dba6e}
.na{background:#1a1a1a;color:#888;border:1px solid #1e1e1e}
.cb{background:#1a1a0a;color:#c9a84c;border:1px solid #7a6530}
.ni{background:#2a0f0f;color:#e03e3e;border:1px solid #e03e3e}
.cnotes{display:none;margin-top:10px}
.cnotes.on{display:block}
.cbar{background:#161616;border:1px solid #1e1e1e;border-radius:7px;padding:8px 12px;display:flex;justify-content:space-between;margin-bottom:10px;font-size:11px}
.sgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}
.scard{background:#161616;border:1px solid #1e1e1e;border-radius:10px;padding:14px;text-align:center}
.snum{font-size:26px;font-weight:300;color:#c9a84c}
.slbl{font-size:10px;color:#444;margin-top:4px;letter-spacing:1px;text-transform:uppercase}
.ci{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #1e1e1e;cursor:pointer}
.ci:last-child{border:none}
.av{width:36px;height:36px;border-radius:50%;background:#161616;border:1px solid #1e1e1e;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#c9a84c;flex-shrink:0}
.cinfo{flex:1;min-width:0}
.cname2{font-size:13px;font-weight:500}
.cmeta{font-size:11px;color:#888;margin-top:1px}
.cph{font-size:11px;color:#444}
.cbts{display:flex;gap:6px}
.ib{width:30px;height:30px;border-radius:6px;border:1px solid #1e1e1e;background:#161616;color:#888;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px}
.hi{padding:11px 0;border-bottom:1px solid #1e1e1e}
.hi:last-child{border:none}
.htop{display:flex;justify-content:space-between;margin-bottom:3px}
.hn{font-size:13px;font-weight:500}
.ht{font-size:10px;color:#444}
.hmeta{display:flex;align-items:center;gap:8px;font-size:11px;color:#888}
.tag{padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
.ta{background:#0f2a1a;color:#3dba6e}
.tn{background:#1a1a1a;color:#888}
.tc{background:#1a1a0a;color:#c9a84c}
.ti{background:#2a0f0f;color:#e03e3e}
.hnote{font-size:11px;color:#444;margin-top:3px;font-style:italic}
.empty{text-align:center;padding:36px 20px;color:#444;font-size:12px}
</style>
</head>
<body>
<div class="topbar">
  <div class="logo">A.<span>LORD</span></div>
  <div class="pill"><div class="dot" id="dot"></div><span id="stxt">Connecting...</span></div>
</div>
<div class="tabs">
  <div class="tab on" onclick="pg('dial',this)">📞 Dial</div>
  <div class="tab" onclick="pg('contacts',this)">👥 Contacts</div>
  <div class="tab" onclick="pg('history',this)">📋 History</div>
  <div class="tab" onclick="pg('setup',this)">⚙️ Setup</div>
</div>
<div class="page on" id="page-dial">
  <div class="cbar" style="font-size:11px;"><span style="color:#444">Calling from</span><span style="color:#c9a84c;font-weight:600" id="callerDisp">Loading...</span></div>
  <div class="ndisplay" id="ndisp"><div class="hint">Enter number or pick a contact</div></div>
  <div class="timer" id="timer">00:00</div>
  <div class="keypad">
    <div class="key" onclick="pk('1')"><span class="d">1</span></div>
    <div class="key" onclick="pk('2')"><span class="d">2</span><span class="l">ABC</span></div>
    <div class="key" onclick="pk('3')"><span class="d">3</span><span class="l">DEF</span></div>
    <div class="key" onclick="pk('4')"><span class="d">4</span><span class="l">GHI</span></div>
    <div class="key" onclick="pk('5')"><span class="d">5</span><span class="l">JKL</span></div>
    <div class="key" onclick="pk('6')"><span class="d">6</span><span class="l">MNO</span></div>
    <div class="key" onclick="pk('7')"><span class="d">7</span><span class="l">PQRS</span></div>
    <div class="key" onclick="pk('8')"><span class="d">8</span><span class="l">TUV</span></div>
    <div class="key" onclick="pk('9')"><span class="d">9</span><span class="l">WXYZ</span></div>
    <div class="key" onclick="pk('*')"><span class="d">*</span></div>
    <div class="key" onclick="pk('0')"><span class="d">0</span></div>
    <div class="key" onclick="dk()" style="color:#888;font-size:17px">⌫</div>
  </div>
  <div class="cactions">
    <button class="btn green" onclick="mcall()">📞 Call</button>
    <button class="btn red" id="endBtn" onclick="ecall()" disabled>✕ End</button>
  </div>
  <div class="outcomes" id="outcomes">
    <div class="olabel">How did the call go?</div>
    <div class="ogrid">
      <button class="ob an" onclick="sout('answered')">✅ Answered</button>
      <button class="ob na" onclick="sout('no-answer')">📵 No Answer</button>
      <button class="ob cb" onclick="sout('callback')">🔄 Callback</button>
      <button class="ob ni" onclick="sout('not-interested')">❌ Not Interested</button>
    </div>
  </div>
  <div class="cnotes" id="cnotes">
    <div class="field"><label>Notes</label><textarea id="noteInput" placeholder="e.g. Interested in website, call back Thursday..."></textarea></div>
    <button class="btn gold" onclick="savelog()">Save & Next Call</button>
  </div>
</div>
<div class="page" id="page-contacts">
  <div class="card">
    <div class="ctitle">Add Contact</div>
    <div class="field"><label>Name</label><input id="cN" placeholder="John Smith"/></div>
    <div class="field"><label>Phone</label><input id="cP" type="tel" placeholder="+14045551234"/></div>
    <div class="field"><label>Business Type</label>
      <select id="cT"><option value="">Select...</option><option>Plumber</option><option>HVAC</option><option>Dental Clinic</option><option>Salon</option><option>Barber</option><option>Auto Repair</option><option>Roofing</option><option>Other</option></select>
    </div>
    <div class="field"><label>City / State</label><input id="cC" placeholder="Atlanta, GA"/></div>
    <button class="btn gold" onclick="addC()">Add Contact</button>
  </div>
  <div class="card"><div class="ctitle">Contacts</div><div id="clist"><div class="empty">No contacts yet.</div></div></div>
</div>
<div class="page" id="page-history">
  <div class="sgrid">
    <div class="scard"><div class="snum" id="stotal">0</div><div class="slbl">Total Calls</div></div>
    <div class="scard"><div class="snum" id="sans">0</div><div class="slbl">Answered</div></div>
    <div class="scard"><div class="snum" id="scb">0</div><div class="slbl">Callbacks</div></div>
    <div class="scard"><div class="snum" id="stime">0m</div><div class="slbl">Talk Time</div></div>
  </div>
  <div class="card"><div class="ctitle">Call History</div><div id="hlist"><div class="empty">No calls yet.</div></div></div>
  <button class="btn ghost" onclick="clrH()">Clear History</button>
</div>
<div class="page" id="page-setup">
  <div class="card"><div class="ctitle">Connection Status</div><div id="connSt" style="font-size:12px;color:#888">Connecting...</div></div>
  <div class="card"><div class="ctitle">Caller ID</div><div style="font-size:13px;color:#c9a84c">+14704503795 (Atlanta, GA)</div></div>
</div>
<script>
var SERVER=window.location.origin;
var device=null,curCall=null,dialNum='',curCName='',callStart=null,callDur=0,timerInt=null,curOut=null,pendLog=null;
window.onload=function(){rContacts();rHistory();connect()};
function st(txt,state){document.getElementById('stxt').textContent=txt;document.getElementById('dot').className='dot '+(state||'')}
function pg(id,el){document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on')});document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on')});document.getElementById('page-'+id).classList.add('on');el.classList.add('on')}
function gd(k){try{return JSON.parse(localStorage.getItem(k))||[]}catch(e){return[]}}
function sd(k,v){localStorage.setItem(k,JSON.stringify(v))}
function connect(){
  st('Connecting...','ring');
  fetch(SERVER+'/token?identity=ansaar')
    .then(function(r){return r.json()})
    .then(function(d){
      if(!d.token)throw new Error('No token');
      document.getElementById('callerDisp').textContent=d.callerNumber||'+14704503795';
      device=new Twilio.Device(d.token,{codecPreferences:['opus','pcmu'],enableRingingState:true,debug:false});
      device.on('ready',function(){st('Ready to call','ok');document.getElementById('connSt').textContent='Connected successfully!'});
      device.on('error',function(e){st('Error','err');document.getElementById('connSt').textContent='Error: '+e.message});
      device.on('disconnect',function(){onEnd()});
    })
    .catch(function(e){st('Failed','err');document.getElementById('connSt').textContent='Failed: '+e.message});
}
function pk(k){dialNum+=k;ud()}
function dk(){dialNum=dialNum.slice(0,-1);if(!dialNum)curCName='';ud()}
function ud(){
  var d=document.getElementById('ndisp');
  if(!dialNum){d.innerHTML='<div class="hint">Enter number or pick a contact</div>';return}
  var n=curCName?'<div class="cname">'+curCName+'</div>':'';
  d.innerHTML=n+'<div class="num">'+dialNum+'</div>';
}
function mcall(){
  if(!device){alert('Not connected');return}
  if(!dialNum||dialNum.length<7){alert('Enter a valid number');return}
  var num=dialNum;
  if(num.indexOf('+')<0)num='+1'+num;
  st('Calling '+num+'...','ring');
  curCall=device.connect({To:num});
  curOut=null;
  pendLog={number:num,name:curCName,start:new Date()};
  document.getElementById('endBtn').disabled=false;
  document.getElementById('outcomes').classList.remove('on');
  document.getElementById('cnotes').classList.remove('on');
  curCall.on('accept',function(){st('On call','ring');startT()});
  curCall.on('disconnect',function(){onEnd()});
  curCall.on('reject',function(){onEnd()});
}
function ecall(){if(curCall)curCall.disconnect();if(device)device.disconnectAll();onEnd()}
function onEnd(){
  stopT();st('Ready to call','ok');
  document.getElementById('endBtn').disabled=true;
  if(pendLog){document.getElementById('outcomes').classList.add('on');document.getElementById('cnotes').classList.add('on');document.getElementById('noteInput').value=''}
  curCall=null;
}
function startT(){callStart=Date.now();callDur=0;document.getElementById('timer').classList.add('on');timerInt=setInterval(function(){callDur=Math.floor((Date.now()-callStart)/1000);document.getElementById('timer').textContent=ft(callDur)},1000)}
function stopT(){clearInterval(timerInt);document.getElementById('timer').classList.remove('on');document.getElementById('timer').textContent='00:00'}
function ft(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function sout(o){curOut=o;document.querySelectorAll('.ob').forEach(function(b){b.style.opacity='.4'});event.currentTarget.style.opacity='1'}
function savelog(){
  if(!pendLog)return;
  var h=gd('alord_h');
  h.unshift({id:Date.now(),number:pendLog.number,name:pendLog.name||pendLog.number,time:new Date().toLocaleString(),duration:callDur,outcome:curOut||'no-answer',note:document.getElementById('noteInput').value.trim()});
  sd('alord_h',h);rHistory();
  pendLog=null;curOut=null;dialNum='';curCName='';callDur=0;ud();
  document.getElementById('outcomes').classList.remove('on');
  document.getElementById('cnotes').classList.remove('on');
  document.querySelectorAll('.ob').forEach(function(b){b.style.opacity='1'});
}
function addC(){
  var n=document.getElementById('cN').value.trim(),p=document.getElementById('cP').value.trim(),t=document.getElementById('cT').value,c=document.getElementById('cC').value.trim();
  if(!n||!p){alert('Name and phone required');return}
  var cs=gd('alord_c');cs.push({id:Date.now(),name:n,phone:p,type:t,city:c});sd('alord_c',cs);
  document.getElementById('cN').value='';document.getElementById('cP').value='';document.getElementById('cC').value='';document.getElementById('cT').value='';
  rContacts();
}
function dialC(ph,nm){dialNum=ph.replace(/\D/g,'');curCName=nm;ud();pg('dial',document.querySelectorAll('.tab')[0])}
function delC(id){if(!confirm('Delete?'))return;sd('alord_c',gd('alord_c').filter(function(c){return c.id!==id}));rContacts()}
function rContacts(){
  var cs=gd('alord_c'),l=document.getElementById('clist');
  if(!cs.length){l.innerHTML='<div class="empty">No contacts yet.</div>';return}
  l.innerHTML=cs.map(function(c){return '<div class="ci"><div class="av">'+c.name[0].toUpperCase()+'</div><div class="cinfo"><div class="cname2">'+c.name+'</div><div class="cmeta">'+(c.type||'')+(c.type&&c.city?' · ':'')+(c.city||'')+'</div><div class="cph">'+c.phone+'</div></div><div class="cbts"><div class="ib" onclick="dialC(\''+c.phone+'\',\''+c.name.replace(/'/g,'')+'\')">📞</div><div class="ib" onclick="delC('+c.id+')">🗑</div></div></div>'}).join('');
}
function rHistory(){
  var h=gd('alord_h');
  document.getElementById('stotal').textContent=h.length;
  document.getElementById('sans').textContent=h.filter(function(x){return x.outcome==='answered'}).length;
  document.getElementById('scb').textContent=h.filter(function(x){return x.outcome==='callback'}).length;
  document.getElementById('stime').textContent=Math.floor(h.reduce(function(s,x){return s+(x.duration||0)},0)/60)+'m';
  var l=document.getElementById('hlist');
  if(!h.length){l.innerHTML='<div class="empty">No calls yet.</div>';return}
  var tc={answered:'ta','no-answer':'tn',callback:'tc','not-interested':'ti'};
  var tl={answered:'Answered','no-answer':'No Answer',callback:'Callback','not-interested':'Not Interested'};
  l.innerHTML=h.map(function(x){return '<div class="hi"><div class="htop"><div class="hn">'+x.name+'</div><div class="ht">'+x.time+'</div></div><div class="hmeta"><span class="tag '+(tc[x.outcome]||'tn')+'">'+(tl[x.outcome]||x.outcome)+'</span>'+(x.duration?'<span>'+ft(x.duration)+'</span>':'')+'</div>'+(x.note?'<div class="hnote">'+x.note+'</div>':'')+'</div>'}).join('');
}
function clrH(){if(!confirm('Clear all history?'))return;sd('alord_h',[]);rHistory()}
<\/script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
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
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${CALLER_NUMBER}" timeout="30"><Number>${to}</Number></Dial></Response>`;
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(twiml);
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(DIALER_HTML);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port ' + PORT));
