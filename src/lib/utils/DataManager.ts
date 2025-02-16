import { writable, type Writable } from 'svelte/store';

export class DataManager<T> {
    private firstFetch = false;
    private controller: AbortController | null = null;
    private query: (signal: AbortSignal) => Promise<T>;
    private store: Writable<T | null>;

    constructor(query: (signal: AbortSignal) => Promise<T>) {
        this.query = query;
        this.store = writable(null);
    }

    async refresh() {
        this.controller?.abort();
        this.controller = new AbortController();
        try {
            const result = await this.query(this.controller.signal);
            this.store.set(result);
        } catch (error) {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
                throw error;
            }
        }
        this.firstFetch = true;
        return this.data;
    }

    get data() {
        let result: T | null = null;
        this.store.subscribe(value => {
            result = value;
        })();
        return result;
    }

    subscribe(run: (value: T | null) => void) {
        return this.store.subscribe(run);
    }

    get promise() {
        if (this.firstFetch) return this.data;
        return new Promise((resolve) => this.refresh().then(resolve));
    }
} 