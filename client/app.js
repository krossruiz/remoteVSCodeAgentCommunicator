let token = null;
let socket = null;

function getHost() {
    return document.getElementById('hostUrl').value.replace(/\/$/, '');
}

function setStatus(text, color = 'black') {
    const el = document.getElementById('status');
    el.textContent = 'Status: ' + text;
    el.style.color = color;
}

function enableApp() {
    document.getElementById('app').style.opacity = '1';
    document.getElementById('app').style.pointerEvents = 'auto';
}

async function authenticate() {
    const host = getHost();
    const secret = document.getElementById('secret').value;

    setStatus('Authenticating...');

    try {
        const res = await fetch(`${host}/auth/handshake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret })
        });

        const data = await res.json();

        if (data.token) {
            token = data.token;
            setStatus('Authenticated!', 'green');
            enableApp();
            connectSocket(host, token);
        } else {
            setStatus('Auth Failed: ' + (data.error || 'Unknown'), 'red');
        }
    } catch (e) {
        setStatus('Connection Error: ' + e.message, 'red');
    }
}

function connectSocket(host, token) {
    if (socket) socket.disconnect();

    socket = io(host, {
        auth: { token }
    });

    socket.on('connect', () => {
        addChatMessage('System', 'Connected via WebSocket');
    });

    socket.on('message', (msg) => {
        // msg structure: { type: 'agent'|'system', content: '...' }
        const sender = msg.type === 'agent' ? 'Agent' : 'System';
        addChatMessage(sender, msg.content);
    });

    socket.on('disconnect', () => {
        addChatMessage('System', 'Disconnected');
    });
}

function addChatMessage(sender, text) {
    const box = document.getElementById('chat-box');
    const div = document.createElement('div');
    div.className = `message ${sender === 'Me' ? 'me' : 'remote'}`;
    div.textContent = `${sender}: ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function handleChatEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value;
    if (!text || !socket) return;

    addChatMessage('Me', text);
    socket.emit('message', { content: text });
    input.value = '';
}

async function listWorkspaces() {
    const host = getHost();
    try {
        const res = await fetch(`${host}/workspaces`);
        const data = await res.json();
        const list = document.getElementById('workspace-list');
        list.innerHTML = '';
        data.workspaces.forEach(ws => {
            const li = document.createElement('li');
            li.textContent = `${ws.name} (${ws.path})`;
            // Add switch button next to it
            const btn = document.createElement('button');
            btn.textContent = 'Switch';
            btn.style.marginLeft = '10px';
            btn.style.padding = '2px 5px';
            btn.style.fontSize = '0.8em';
            btn.onclick = () => {
                document.getElementById('switchPath').value = ws.path;
                switchWorkspace();
            };
            li.appendChild(btn);
            list.appendChild(li);
        });
    } catch (e) {
        alert('Error listing workspaces: ' + e.message);
    }
}

async function switchWorkspace() {
    const host = getHost();
    const path = document.getElementById('switchPath').value;
    if (!path) return;

    try {
        const res = await fetch(`${host}/workspaces/switch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path })
        });
        const data = await res.json();
        if (data.success) {
            alert('Switched! VSCode might reload.');
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Req Error: ' + e.message);
    }
}

async function readFile() {
    const host = getHost();
    const path = document.getElementById('filePath').value;
    if (!path) return;

    try {
        const res = await fetch(`${host}/file/read?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        if (data.content) {
            document.getElementById('fileContent').value = data.content;
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Req Error: ' + e.message);
    }
}

async function writeFile() {
    const host = getHost();
    const path = document.getElementById('filePath').value;
    const content = document.getElementById('fileContent').value;

    if (!path) return;

    try {
        const res = await fetch(`${host}/file/write`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, content })
        });
        const data = await res.json();
        if (data.success) {
            alert('File written successfully');
        } else {
            alert('Error: ' + data.error);
        }
    } catch (e) {
        alert('Req Error: ' + e.message);
    }
}
