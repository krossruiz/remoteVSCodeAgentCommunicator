import * as crypto from 'crypto';

export class Authenticator {
    private secret: string | null = null;
    private token: string | null = null;

    constructor() {
        this.rotateSecret();
    }

    // Generate a new 6-digit PIN or similar for the user to type
    // and a long-lived JWT-like token for the session
    public rotateSecret() {
        this.secret = crypto.randomBytes(3).toString('hex'); // 6 chars
        this.token = crypto.randomBytes(32).toString('hex');
    }

    public getSecret(): string {
        return this.secret!;
    }

    public getToken(): string {
        return this.token!;
    }

    // Validate the handshake PIN
    public validateSecret(inputSecret: string): boolean {
        return inputSecret === this.secret;
    }

    // Validate the session token for subsequent requests
    public validateToken(inputToken: string): boolean {
        return inputToken === this.token;
    }
}
