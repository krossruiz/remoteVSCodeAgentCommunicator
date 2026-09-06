import * as express from 'express';
import * as vscode from 'vscode';

export function registerWorkspaceRoutes(app: express.Express) {

    // List currently open workspace folders
    app.get('/workspaces', (req, res) => {
        const folders = vscode.workspace.workspaceFolders || [];
        const data = folders.map(f => ({
            name: f.name,
            path: f.uri.fsPath,
            index: f.index
        }));
        res.json({ workspaces: data });
    });

    // Open a project by path (switches window)
    app.post('/workspaces/switch', async (req, res) => {
        const { path, forceNewWindow } = req.body;

        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }

        try {
            const uri = vscode.Uri.file(path);
            // Verify existence? vscode.openFolder handles it gracefully usually, but good to check.
            // basic check
            try {
                await vscode.workspace.fs.stat(uri);
            } catch (e) {
                return res.status(404).json({ error: 'Path does not exist' });
            }

            // Execute command
            // forceNewWindow defaults to false (reuse window)
            await vscode.commands.executeCommand('vscode.openFolder', uri, {
                forceNewWindow: !!forceNewWindow
            });

            res.json({ success: true, message: `Switching to ${path}` });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // File Operations
    app.get('/file/read', async (req, res) => {
        const { path } = req.query;
        if (!path || typeof path !== 'string') return res.status(400).json({ error: 'Path required' });

        try {
            const uri = vscode.Uri.file(path);
            const content = await vscode.workspace.fs.readFile(uri);
            res.json({ content: content.toString() });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/file/write', async (req, res) => {
        const { path, content } = req.body;
        if (!path || content === undefined) return res.status(400).json({ error: 'Path and content required' });

        try {
            const uri = vscode.Uri.file(path);
            const data = Buffer.from(content);
            await vscode.workspace.fs.writeFile(uri, data);
            res.json({ success: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });
}
