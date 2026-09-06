import * as vscode from 'vscode';
import { AgentServer } from '../server/server';

export class RemoteChatProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _server: AgentServer
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'sendMessage':
                    {
                        // User typed in the sidebar
                        const { text } = data;
                        this._server.broadcastMessage(text);
                        break;
                    }
            }
        });
    }

    public addMessage(sender: string, text: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'addMessage', sender, text });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Remote Chat</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }
                    .chat { height: 300px; overflow-y: auto; border: 1px solid var(--vscode-input-border); padding: 5px; margin-bottom: 5px; }
                    .input-box { display: flex; }
                    input { flex-grow: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 4px; }
                    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 4px 10px; cursor: pointer; }
                </style>
			</head>
			<body>
				<div class="chat" id="chat"></div>
                <div class="input-box">
                    <input type="text" id="msgInput" placeholder="Type here..." />
                    <button id="sendBtn">Send</button>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    const chat = document.getElementById('chat');
                    const input = document.getElementById('msgInput');
                    const btn = document.getElementById('sendBtn');

                    function addMessage(sender, text) {
                        const div = document.createElement('div');
                        div.textContent = sender + ': ' + text;
                        chat.appendChild(div);
                        chat.scrollTop = chat.scrollHeight;
                    }

                    btn.addEventListener('click', () => {
                        const text = input.value;
                        if(text) {
                            addMessage('Me', text);
                            vscode.postMessage({ type: 'sendMessage', text: text });
                            input.value = '';
                        }
                    });
                    
                    input.addEventListener('keypress', (e) => {
                         if (e.key === 'Enter') {
                             btn.click();
                         }
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'addMessage':
                                addMessage(message.sender, message.text);
                                break;
                        }
                    });
                </script>
			</body>
			</html>`;
    }
}
