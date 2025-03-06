import { ConfigManager } from "../config/config";
import { Context } from "./context";
import { handleMessages } from "../utils/utils_message";
import { end_completion, poll_completion, start_completion } from "./service";

export interface Privilege {
    limit: number,
    counter: number,
    timer: number,
    prob: number,
    standby: boolean
}

export class AI {
    id: string;
    context: Context;
    privilege: Privilege;
    streamId: string;

    constructor(id: string) {
        this.id = id;
        this.context = new Context();
        this.privilege = {
            limit: 100,
            counter: -1,
            timer: -1,
            prob: -1,
            standby: false
        };
    }

    static reviver(value: any, id: string): AI {
        const ai = new AI(id);
        const validKeys = ['context', 'image', 'privilege'];

        for (const k of validKeys) {
            if (value.hasOwnProperty(k)) {
                ai[k] = value[k];
            }
        }

        return ai;
    }

    clearData() {
        clearTimeout(this.context.timer);
        this.context.timer = null;
        this.context.counter = 0;
    }

    async chat(ctx: seal.MsgContext, msg: seal.Message): Promise<void> {
        if (this.streamId) {
            await end_completion(this.streamId);
        }

        this.streamId = '';

        //清空数据
        this.clearData();

        const messages = handleMessages(ctx, this);
        this.streamId = await start_completion(messages);

        let pollStatus = 'processing';
        let allReply = '';
        let after = 0;
        while (pollStatus == 'processing') {
            const { status, reply, nextAfter } = await poll_completion(this.streamId, after);
            pollStatus = status;
            after = nextAfter;

            if (reply.trim() !== '') {
                allReply += reply.trim();
                seal.replyToSender(ctx, msg, reply.trim());
            } else {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        await end_completion(this.streamId);

        await this.context.iteration(ctx, allReply, 'assistant');

        this.streamId = '';
    }
}

export class AIManager {
    static cache: { [key: string]: AI } = {};

    static clearCache() {
        this.cache = {};
    }

    static getAI(id: string) {
        if (!this.cache.hasOwnProperty(id)) {
            let data = new AI(id);

            try {
                data = JSON.parse(ConfigManager.ext.storageGet(`AI_${id}`) || '{}', (key, value) => {
                    if (key === "") {
                        return AI.reviver(value, id);
                    }

                    if (key === "context") {
                        return Context.reviver(value);
                    }

                    return value;
                });
            } catch (error) {
                console.error(`从数据库中获取${`AI_${id}`}失败:`, error);
            }

            this.cache[id] = data;
        }

        return this.cache[id];
    }

    static saveAI(id: string) {
        if (this.cache.hasOwnProperty(id)) {
            ConfigManager.ext.storageSet(`AI_${id}`, JSON.stringify(this.cache[id]));
        }
    }
}