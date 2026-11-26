/** Limits parallel work per key (a host for downloads, "convert" for image processing). */
export class HostLimiter {
    constructor(perHost = 2) {
        this.perHost = perHost;
        this.active = new Map();
        this.waiting = new Map();
    }

    async run(host, fn) {
        while ((this.active.get(host) ?? 0) >= this.perHost) {
            await new Promise((resolve) => {
                const list = this.waiting.get(host) ?? [];
                list.push(resolve);
                this.waiting.set(host, list);
            });
        }
        this.active.set(host, (this.active.get(host) ?? 0) + 1);
        try {
            return await fn();
        } finally {
            this.active.set(host, this.active.get(host) - 1);
            const next = this.waiting.get(host)?.shift();
            if (next) next();
        }
    }
}
