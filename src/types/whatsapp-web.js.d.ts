declare module "whatsapp-web.js" {
  export interface Contact {
    pushname?: string | null;
    number: string;
  }

  export interface Message {
    fromMe: boolean;
    timestamp: number;
    body: string;
    from: string;
    reply(text: string): Promise<void>;
    getContact(): Promise<Contact>;
  }

  export interface ClientOptions {
    authStrategy?: unknown;
    puppeteer?: {
      headless?: boolean;
      args?: string[];
      timeout?: number;
    };
  }

  export class LocalAuth {
    constructor(options?: { dataPath?: string });
  }

  export class Client {
    constructor(options?: ClientOptions);
    on(event: "loading_screen", listener: (percent: string, message: string) => void): this;
    on(event: "authenticated", listener: () => void): this;
    on(event: "qr", listener: (qr: string) => void): this;
    on(event: "ready", listener: () => void | Promise<void>): this;
    on(event: "auth_failure", listener: (msg: string) => void): this;
    on(event: "disconnected", listener: (reason: string) => void): this;
    on(event: "message", listener: (message: Message) => void | Promise<void>): this;
    on(event: "message_create", listener: (message: Message) => void | Promise<void>): this;
    initialize(): Promise<void>;
  }

  const whatsappWebJs: {
    Client: typeof Client;
    LocalAuth: typeof LocalAuth;
  };

  export default whatsappWebJs;
}
