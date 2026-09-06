import * as express from 'express';
import * as http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as vscode from 'vscode';
import * as cors from 'cors';
import { Authenticator } from './auth';
import { registerWorkspaceRoutes } from './routes';

export class AgentServer {
    private app: express.Express;
    private server: http.Server | null = null;
    private io: SocketIOServer | null = null;
    private port: number = 3000;
    private auth: Authenticator;
    private chatProvider: IChatProvider | null = null;

    constructor() {
        this.app = express();
        this.auth = new Authenticator();

        // Middleware
        this.app.use(cors({ origin: '*' }));
        this.app.use(express.json());

        // Basic routes
        this.app.get('/status', (req, res) => {
            res.json({ status: 'running', version: '0.0.1' });
        });

        this.app.post('/auth/handshake', (req, res) => {
            const { secret } = req.body;
            if (this.auth.validateSecret(secret)) {
                res.json({ token: this.auth.getToken() });
            } else {
                res.status(401).json({ error: 'Invalid secret' });
            }
        });

        // Register Workspace API
        registerWorkspaceRoutes(this.app);
    }

    public start(port: number = 3000) {
        if (this.server) {
            return;
        }

        this.port = port;
        this.server = http.createServer(this.app);
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: "*", // Adjust for security later
                methods: ["GET", "POST"]
            }
        });

        this.setupSocketHandlers();

        this.server.listen(this.port, () => {
            vscode.window.showInformationMessage(`Remote Agent Server started on port ${this.port}. Secret: ${this.auth.getSecret()}`);
            console.log(`Server listening on port ${this.port}`);
        });
    }

    public stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
            this.io = null;
            vscode.window.showInformationMessage('Remote Agent Server stopped.');
        }
    }

    public setChatProvider(provider: IChatProvider) {
        this.chatProvider = provider;
    }

    public broadcastMessage(message: string) {
        if (this.io) {
            this.io.emit('message', { type: 'agent', content: message });
        }
    }

    private setupSocketHandlers() {
        if (!this.io) return;

        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (this.auth.validateToken(token)) {
                next();
            } else {
                next(new Error("Unauthorized"));
            }
        });

        this.io.on('connection', (socket) => {
            console.log('Client connected', socket.id);
            socket.emit('message', { type: 'system', content: 'Connected to VSCode Agent' });

            socket.on('message', (data) => {
                if (this.chatProvider && data.content) {
                    this.chatProvider.addMessage('Remote', data.content);
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected', socket.id);
            });
        });
    }
}

export interface IChatProvider {
    addMessage(sender: string, text: string): void;
}
