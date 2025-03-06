import { LogConfig } from "./config_log";
import { MessageConfig } from "./config_message";
import { ReceivedConfig } from "./config_received";
import { RequestConfig } from "./config_request";

export class ConfigManager {
    static ext: seal.ExtInfo;
    static cache: {
        [key: string]: {
            timestamp: number,
            data: any
        }
    } = {}

    static registerConfig() {
        LogConfig.register();
        RequestConfig.register();
        MessageConfig.register();
        ReceivedConfig.register();
    }

    static getCache(key: string, getFunc: () => any) {
        const timestamp = Date.now()
        if (this.cache?.[key] && timestamp - this.cache[key].timestamp < 3000) {
            return this.cache[key].data;
        }

        const data = getFunc();
        this.cache[key] = {
            timestamp: timestamp,
            data: data
        }

        return data;
    }

    static get log() { return this.getCache('log', LogConfig.get) }
    static get request() { return this.getCache('request', RequestConfig.get) }
    static get message() { return this.getCache('message', MessageConfig.get) }
    static get received() { return this.getCache('received', ReceivedConfig.get) }
}