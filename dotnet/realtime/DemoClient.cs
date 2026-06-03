namespace ZyxxyzRealtime;

public static class DemoClient
{
    public const string Html = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Zyxxyz Chat — SignalR Demo</title>
          <style>
            body { font-family: sans-serif; max-width: 600px; margin: 2rem auto; background: #1a1a2e; color: #e8e8e8; }
            input, button { padding: 8px 12px; margin: 4px; border-radius: 4px; border: 1px solid #444; background: #16213e; color: #e8e8e8; }
            button { background: #e94560; border-color: #e94560; cursor: pointer; }
            #messages { border: 1px solid #444; height: 300px; overflow-y: auto; padding: 8px; margin: 8px 0; border-radius: 4px; }
            .msg { margin: 4px 0; } .msg .u { color: #e94560; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>SignalR Chat</h1>
          <div>
            <input id="room" value="general" placeholder="Room" />
            <input id="username" value="guest" placeholder="Username" />
            <button onclick="connect()">Connect</button>
          </div>
          <div id="messages"></div>
          <div>
            <input id="text" placeholder="Message…" style="width:70%" onkeydown="if(event.key==='Enter')send()" />
            <button onclick="send()">Send</button>
          </div>

          <script src="https://unpkg.com/@microsoft/signalr@latest/dist/browser/signalr.min.js"></script>
          <script>
            let conn;
            function log(html) {
              const div = document.getElementById('messages');
              div.innerHTML += html;
              div.scrollTop = div.scrollHeight;
            }
            async function connect() {
              const room = document.getElementById('room').value;
              const username = document.getElementById('username').value;
              conn = new signalR.HubConnectionBuilder().withUrl('/hubs/chat').build();
              conn.on('History', msgs => msgs.forEach(m => log(`<div class="msg"><span class="u">${m.username}</span>: ${m.text}</div>`)));
              conn.on('ReceiveMessage', m => log(`<div class="msg"><span class="u">${m.username}</span>: ${m.text}</div>`));
              conn.on('UserJoined', u => log(`<div class="msg" style="color:#888">${u} joined</div>`));
              conn.on('UserLeft', u => log(`<div class="msg" style="color:#888">${u} left</div>`));
              await conn.start();
              await conn.invoke('JoinRoom', room, username);
              log(`<div class="msg" style="color:#888">Connected to #${room}</div>`);
            }
            async function send() {
              const text = document.getElementById('text');
              if (!conn || !text.value.trim()) return;
              await conn.invoke('SendMessage', document.getElementById('room').value, document.getElementById('username').value, text.value);
              text.value = '';
            }
          </script>
        </body>
        </html>
        """;
}
