import * as vscode from 'vscode';
import { AgentServer } from './server/server';
import { RemoteChatProvider } from './chat/chatProvider';

let server: AgentServer;

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "remote-vscode-agent" is now active!');

    server = new AgentServer();

    // Register Chat Provider
    const sidebarProvider = new RemoteChatProvider(context.extensionUri, server);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "remote-agent.chat",
            sidebarProvider
        )
    );

    let startDisposable = vscode.commands.registerCommand('remote-agent.startServer', async () => {
        const portStr = await vscode.window.showInputBox({
            prompt: 'Enter port number',
            value: '3000'
        });

        if (portStr) {
            const port = parseInt(portStr);
            server.start(port);
            server.setChatProvider(sidebarProvider);
        }
    });

    let stopDisposable = vscode.commands.registerCommand('remote-agent.stopServer', () => {
        server.stop();
    });

    context.subscriptions.push(startDisposable);
    context.subscriptions.push(stopDisposable);
}

export function deactivate() {
    if (server) {
        server.stop();
    }
}

