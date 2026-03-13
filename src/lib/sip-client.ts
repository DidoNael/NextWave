import JsSIP from "jssip";

export type SipStatus = "online" | "offline" | "connecting" | "error";

class SipClient {
    private ua: JsSIP.UA | null = null;
    private session: JsSIP.RTCSession | null = null;
    private statusListeners: ((status: SipStatus) => void)[] = [];
    private currentStatus: SipStatus = "offline";

    constructor() { }

    onStatusChange(callback: (status: SipStatus) => void) {
        this.statusListeners.push(callback);
    }

    private updateStatus(status: SipStatus) {
        this.currentStatus = status;
        this.statusListeners.forEach(cb => cb(status));
    }

    getStatus() {
        return this.currentStatus;
    }

    async init(config: any) {
        if (this.ua) {
            this.ua.stop();
        }

        if (!config || !config.sipDomain || !config.sipUser || !config.sipPassword) {
            this.updateStatus("offline");
            return;
        }

        this.updateStatus("connecting");

        const socket = new JsSIP.WebSocketInterface(config.sipDomain);
        const configuration = {
            sockets: [socket],
            uri: `sip:${config.sipUser}@${config.sipDomain.split('/')[2].split(':')[0]}`,
            password: config.sipPassword,
            display_name: config.sipUser,
            register: true
        };

        try {
            this.ua = new JsSIP.UA(configuration);

            this.ua.on("registered", () => {
                this.updateStatus("online");
            });

            this.ua.on("unregistered", () => {
                this.updateStatus("offline");
            });

            this.ua.on("registrationFailed", (e) => {
                console.error("SIP Registration Failed", e);
                this.updateStatus("error");
            });

            this.ua.on("newRTCSession", (data) => {
                this.session = data.session;
                // Handle incoming/outgoing session events here if needed
            });

            this.ua.start();
        } catch (error) {
            console.error("SIP Init Error", error);
            this.updateStatus("error");
        }
    }

    call(target: string) {
        if (!this.ua) return;

        const options = {
            mediaConstraints: { audio: true, video: false },
            pcConfig: {
                iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
            }
        };

        this.session = this.ua.call(`sip:${target}`, options);
    }

    terminate() {
        if (this.session) {
            this.session.terminate();
        }
    }

    toggleMute(isMuted: boolean) {
        if (this.session) {
            if (isMuted) {
                this.session.mute();
            } else {
                this.session.unmute();
            }
        }
    }

    stop() {
        if (this.ua) {
            this.ua.stop();
        }
    }
}

// Singleton for global use
export const sipClient = new SipClient();
