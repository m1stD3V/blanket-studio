const http = require('http');
const { WebSocket, WebSocketServer } = require('ws');
const { exec } = require('child_process');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8765');
const TWITCH_IRC = process.env.TWITCH_IRC || 'wss://irc-ws.chat.twitch.tv:443';

let channel = '';
let oauth = '';
let twitch = null;
let twitchReconnectTimer = null;
let overlays = new Map();
let msgHistory = [];

// ── Twitch IRC ──────────────────────────────────────────────────────

function connectTwitch() {
  if (twitch) { try { twitch.close(); } catch {} twitch = null; }
  if (!channel) return;

  const nick = oauth ? channel : 'justinfan' + Math.floor(Math.random() * 100000);
  const pass = oauth ? 'oauth:' + oauth.replace(/^oauth:/, '') : 'SCHMOOPIIE';

  twitch = new WebSocket(TWITCH_IRC);
  twitch.on('open', () => {
    console.log('[IRC] Connected to Twitch');
    twitch.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
    twitch.send('PASS ' + pass);
    twitch.send('NICK ' + nick);
    twitch.send('JOIN #' + channel);
    broadcastStatus();
  });
  twitch.on('message', raw => { for (const line of raw.split('\r\n')) { if (line) handleIRCLine(line); } });
  twitch.on('close', (code, reason) => { console.log('[IRC] Disconnected (' + code + ')'); twitch = null; broadcastStatus(); twitchReconnectTimer = setTimeout(() => { if (channel) connectTwitch(); }, 5000); });
  twitch.on('error', err => { console.log('[IRC] Error:', err.message); });
}

function handleIRCLine(line) {
  if (line.startsWith('PING')) { twitch.send('PONG :' + line.split(':')[1]); return; }
  const m = line.match(/^(?:@([^ ]+) )?:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #(\w+) :(.+)$/);
  if (!m) return;
  const tags = parseTags(m[1] || '');
  const username = tags['display-name'] || m[2];
  const color = tags['color'] || '#5a7cff';
  const message = m[4];
  const badges = (tags['badges'] || '').split(',').filter(Boolean).map(b => b.split('/')[0]);

  const msg = { type: 'chat', username, color, message, badges, time: Date.now() };
  msgHistory.push(msg);
  if (msgHistory.length > 200) msgHistory.shift();
  broadcast(msg);

  const text = message.trim().toLowerCase();
  const parts = text.split(/\s+/);
  const cmd = parts[0];
  const sender = username;

  for (const [ws, reg] of overlays) {
    for (const c of (reg.commands || [])) {
      if (cmd === '!' + c.cmd.toLowerCase()) {
        const now = Date.now();
        if (c._lastUsed && now - c._lastUsed < (c.cd || 10) * 1000) continue;
        c._lastUsed = now;
        if (twitch && twitch.readyState === 1 && oauth) twitch.send('PRIVMSG #' + channel + ' :' + c.resp);
        broadcast({ type: 'command_response', command: '!' + c.cmd, response: c.resp, target: sender });
        break;
      }
    }

    const qd = reg.quotes || [];
    if (qd.length && (cmd === '!quote' || cmd === '!q')) {
      if (parts[1] === 'add') {
        const qt = parts.slice(2).join(' ');
        if (qt && sender !== 'stream') {
          const nq = { id: qd.reduce((m, q) => Math.max(m, q.id || 0), 0) + 1, txt: qt, by: sender };
          qd.push(nq);
          ws.send(JSON.stringify({ type: 'quote_added', quote: nq }));
          if (twitch && twitch.readyState === 1 && oauth) twitch.send('PRIVMSG #' + channel + ' :Added quote #' + nq.id);
        }
      } else if ((parts[1] === 'del' || parts[1] === 'remove') && parts[2]) {
        const qn = parseInt(parts[2]);
        const idx = qd.findIndex(q => q.id === qn);
        if (idx >= 0) { qd.splice(idx, 1); ws.send(JSON.stringify({ type: 'quote_removed', id: qn })); if (twitch && twitch.readyState === 1 && oauth) twitch.send('PRIVMSG #' + channel + ' :Removed quote #' + qn); }
      } else {
        const q = qd[Math.floor(Math.random() * qd.length)];
        if (q) { broadcast({ type: 'quote_response', quote: q }); if (twitch && twitch.readyState === 1 && oauth) twitch.send('PRIVMSG #' + channel + ' :Quote #' + q.id + ': "' + q.txt + '" \u2014 ' + (q.by || 'Unknown')); }
      }
      break;
    }
  }
}

function parseTags(raw) {
  const tags = {};
  if (!raw) return tags;
  for (const pair of raw.split(';')) { const i = pair.indexOf('='); if (i > 0) tags[pair.slice(0, i)] = pair.slice(i + 1); }
  return tags;
}

// ── WebSocket Server ────────────────────────────────────────────────

const wss = new WebSocketServer({ noServer: true });

function handleOverlayWS(ws) {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  overlays.set(ws, { commands: [], quotes: [], channel: '' });
  ws.on('message', raw => {
    try {
      const d = JSON.parse(raw.toString());
      if (d.type === 'register') {
        const r = overlays.get(ws) || { commands: [], quotes: [], channel: '' };
        if (d.commands) r.commands = d.commands;
        if (d.quotes) r.quotes = d.quotes;
        if (d.channel) r.channel = d.channel;
        overlays.set(ws, r);
        if (r.channel && !channel) { channel = r.channel; connectTwitch(); }
        broadcastStatus();
      }
    } catch {}
  });
  ws.on('close', () => { overlays.delete(ws); broadcastStatus(); });
}

function broadcast(data) {
  const m = JSON.stringify(data);
  for (const [ws] of overlays) { if (ws.readyState === WebSocket.OPEN) ws.send(m); }
}

function broadcastStatus() {
  broadcast({ type: 'status', connected: twitch !== null && twitch.readyState === 1, channel, overlays: overlays.size });
}

// ── Heartbeat ───────────────────────────────────────────────────────

setInterval(() => { for (const [ws] of overlays) { if (ws.readyState === WebSocket.OPEN) ws.ping(); } }, 30000);

// ── Dashboard HTML (self-contained) ─────────────────────────────────

const DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Blanket Companion</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d0f1a;color:#e8edf5;font-family:system-ui,-apple-system,sans-serif;display:flex;height:100vh}
.sidebar{width:280px;background:#131626;border-right:1px solid #1e2240;padding:20px;display:flex;flex-direction:column;gap:12px;flex-shrink:0}
.sidebar h1{font-size:16px;font-weight:600;letter-spacing:-.3px}
.sidebar h1 span{color:#5a7cff}
.sidebar .sub{font-size:11px;color:#8890b8}
.sidebar label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8890b8;display:block;margin-bottom:3px}
.sidebar input{width:100%;padding:7px 10px;background:#0d0f1a;border:1px solid #1e2240;border-radius:6px;color:#e8edf5;font-size:13px;outline:none;font-family:inherit}
.sidebar input:focus{border-color:#5a7cff}
.sidebar .hint{font-size:10px;color:#5a6179;margin-top:2px}
.sidebar .hint a{color:#5a7cff;text-decoration:none}
.sidebar .ver{font-size:10px;color:#3a4160;border-top:1px solid #1e2240;padding-top:10px;margin-top:auto}
.btn{display:block;width:100%;padding:8px;border:none;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;text-align:center;font-family:inherit}
.btn-primary{background:#5a7cff;color:#fff}
.btn-primary:hover{background:#4a6ae8}
.btn-primary:disabled{opacity:.4;cursor:default}
.btn-danger{background:#e05060;color:#fff}
.btn-danger:hover{background:#c84050}
.btn-danger:disabled{opacity:.4;cursor:default}
.main{flex:1;display:flex;flex-direction:column;padding:20px;gap:12px;min-width:0}
.main h2{font-size:13px;font-weight:500;color:#8890b8;text-transform:uppercase;letter-spacing:1px}
.status-bar{display:flex;gap:12px;flex-wrap:wrap;padding:10px 14px;background:#131626;border:1px solid #1e2240;border-radius:8px;align-items:center;font-size:12px}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}
.dot.on{background:#34d399;box-shadow:0 0 8px rgba(52,211,153,.4)}
.dot.off{background:#5a6179}
.dot.err{background:#e05060;box-shadow:0 0 8px rgba(224,80,96,.4)}
.chat-log{flex:1;overflow-y:auto;background:#131626;border:1px solid #1e2240;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:3px;font-size:12px;line-height:1.4;min-height:0}
.msg{padding:3px 6px;border-radius:4px;background:rgba(255,255,255,.02)}
.msg .user{font-weight:600}
.msg .time{font-size:9px;color:#5a6179;margin-left:6px}
.badge{display:inline-block;font-size:9px;padding:0 4px;border-radius:3px;background:rgba(90,124,255,.15);color:#5a7cff;margin-right:2px}
.empty{text-align:center;padding:40px;color:#5a6179;font-size:13px}
</style>
</head>
<body>
<div class="sidebar">
  <h1>Blanket <span>Companion</span></h1>
  <div class="sub">Twitch chat relay for your overlay</div>
  <div style="flex:1;display:flex;flex-direction:column;gap:8px">
    <div>
      <label>Your Twitch Channel</label>
      <input id="channel-input" placeholder="yourchannel" autocomplete="off">
    </div>
    <div>
      <label>Chat Token <span style="color:#5a6179;font-weight:400">(optional)</span></label>
      <input id="oauth-input" type="password" placeholder="oauth:xxx" autocomplete="off">
      <div class="hint">Only needed if you want the bot to reply in chat.<br>Get one at <a href="https://twitchapps.com/tmi/" target="_blank">twitchapps.com/tmi</a></div>
    </div>
    <button class="btn btn-primary" id="connect-btn" onclick="connect()">Connect</button>
    <button class="btn btn-danger" id="disconnect-btn" style="display:none" onclick="disconnect()">Disconnect</button>
  </div>
  <div class="ver">Blanket Companion v1.0 &mdash; ws://localhost:${PORT}/ws</div>
</div>
<div class="main">
  <div class="status-bar">
    <span class="dot off" id="status-dot"></span>
    <span id="status-text">Not connected</span>
    <span style="flex:1"></span>
    <span id="overlay-count" style="color:#5a6179;font-size:11px">0 overlays connected</span>
  </div>
  <h2>Chat Log</h2>
  <div class="chat-log" id="chat-log"><div class="empty">Connect to a channel to see live chat.</div></div>
</div>
<script>
var pollTimer=null;
async function connect(){
  var ch=document.getElementById('channel-input').value.trim();
  var tk=document.getElementById('oauth-input').value.trim();
  if(!ch)return;
  await fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel:ch,oauth:tk||undefined})});
  document.getElementById('connect-btn').style.display='none';
  document.getElementById('disconnect-btn').style.display='';
  document.getElementById('channel-input').disabled=true;
  document.getElementById('oauth-input').disabled=true;
  pollStatus();
}
async function disconnect(){
  await fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channel:'',oauth:''})});
  document.getElementById('connect-btn').style.display='';
  document.getElementById('disconnect-btn').style.display='none';
  document.getElementById('channel-input').disabled=false;
  document.getElementById('oauth-input').disabled=false;
  document.getElementById('status-dot').className='dot off';
  document.getElementById('status-text').textContent='Not connected';
  if(pollTimer){clearTimeout(pollTimer);pollTimer=null}
}
async function pollStatus(){
  try{
    var r=await fetch('/api/status'),d=await r.json();
    document.getElementById('status-dot').className='dot '+(d.connected?'on':'off');
    document.getElementById('status-text').textContent=d.connected?'Connected to #'+d.channel:d.channel?'Connecting...':'Not connected';
    document.getElementById('overlay-count').textContent=d.overlays+' overlays connected';
    var log=document.getElementById('chat-log'),prev=parseInt(log.dataset.len||'0');
    if(d.recent&&d.recent.length){
      for(var i=prev;i<d.recent.length;i++)addMsg(d.recent[i]);
      log.dataset.len=d.recent.length;
    }
  }catch(_){}
  if(document.getElementById('connect-btn').style.display==='none')pollTimer=setTimeout(pollStatus,1000);
}
function addMsg(m){
  var log=document.getElementById('chat-log');
  var e=log.querySelector('.empty');if(e)e.remove();
  var el=document.createElement('div');el.className='msg';
  var h='';
  for(var b=0;b<(m.badges||[]).length;b++)h+='<span class="badge">'+esc(m.badges[b])+'</span>';
  h+='<span class="user" style="color:'+esc(m.color||'#e8edf5')+'">'+esc(m.username)+':</span> <span>'+esc(m.message)+'</span>';
  el.innerHTML=h;log.appendChild(el);log.scrollTop=log.scrollHeight;
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
<\/script>
</body>
</html>`;

// ── HTTP Server ─────────────────────────────────────────────────────

function serve() {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.method === 'POST' && req.url === '/api/config') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const d = JSON.parse(body);
          if (d.channel !== undefined) channel = d.channel.trim().toLowerCase();
          if (d.oauth !== undefined) oauth = d.oauth.trim();
          if (d.channel !== undefined || d.oauth !== undefined) connectTwitch();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: e.message })); }
      });
      return;
    }

    if (req.url === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ connected: twitch !== null && twitch.readyState === 1, channel: channel || null, overlays: overlays.size, recent: msgHistory.slice(-20) }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
    res.end(DASHBOARD);
  });

  server.on('upgrade', (req, socket, head) => {
    if ((req.url || '') === '/ws') {
      wss.handleUpgrade(req, socket, head, handleOverlayWS);
    } else { socket.destroy(); }
  });

  server.listen(PORT, () => {
    console.log('Blanket Companion running');
    console.log('Dashboard: http://localhost:' + PORT);
    console.log('Overlay WS: ws://localhost:' + PORT + '/ws');
    // Auto-open browser
    const url = 'http://localhost:' + PORT;
    const plat = process.platform;
    if (plat === 'win32') exec('start "" "' + url + '"');
    else if (plat === 'darwin') exec('open "' + url + '"');
    else exec('xdg-open "' + url + '" 2>/dev/null');
  });
}

// ── Start ───────────────────────────────────────────────────────────

// Handle channel from CLI args
const chIdx = process.argv.indexOf('--channel');
if (chIdx > 0) { channel = (process.argv[chIdx + 1] || '').toLowerCase(); if (channel) connectTwitch(); }

serve();

// Keep alive on Windows so the console doesn't vanish on double-click
if (process.platform === 'win32' && !process.argv.includes('--no-pause')) {
  process.stdin.on('data', () => {});
  process.on('SIGINT', () => process.exit(0));
}
process.on('uncaughtException', () => {});
