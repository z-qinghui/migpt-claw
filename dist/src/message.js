import { randomUUID } from 'node:crypto';
import { MiService } from './service.js';
import { firstOf, lastOf } from './utils/parse.js';
class _MiMessage {
    _lastQueryMsg = {};
    _tempQueryMsgs = {};
    /**
     * 获取下一条消息
     * @param deviceId 设备 ID
     */
    async fetchNextMessage(deviceId) {
        if (!this._lastQueryMsg[deviceId]) {
            return this._fetchFirstMessage(deviceId);
        }
        return this._fetchNextMessage(deviceId);
    }
    /**
     * 拉取第一条消息（初始化）
     */
    async _fetchFirstMessage(deviceId) {
        const msgs = await this._fetchHistoryMsgs(deviceId, {
            limit: 1,
            filterAnswer: false,
        });
        this._lastQueryMsg[deviceId] = msgs[0];
        return undefined;
    }
    /**
     * 拉取下一条消息
     */
    async _fetchNextMessage(deviceId) {
        if (this._tempQueryMsgs[deviceId] && this._tempQueryMsgs[deviceId].length > 0) {
            // 当前有暂存的新消息（从新到旧），依次处理之
            return this._fetchNextTempMessage(deviceId);
        }
        // 拉取最新的 2 条 msg（用于和上一条消息比对是否连续）
        const nextMsg = await this._fetchNext2Messages(deviceId);
        if (nextMsg !== 'continue') {
            return nextMsg;
        }
        // 继续向上拉取其他新消息
        return this._fetchNextRemainingMessages(deviceId);
    }
    /**
     * 拉取最新的 2 条消息，用于和上一条消息比对是否连续
     */
    async _fetchNext2Messages(deviceId) {
        const msgs = await this._fetchHistoryMsgs(deviceId, { limit: 2 });
        if (msgs.length < 1 || firstOf(msgs).timestamp <= this._lastQueryMsg[deviceId].timestamp) {
            // 没有拉到新消息
            return;
        }
        if (firstOf(msgs).timestamp > this._lastQueryMsg[deviceId].timestamp &&
            (msgs.length === 1 || lastOf(msgs).timestamp <= this._lastQueryMsg[deviceId].timestamp)) {
            // 刚好收到一条新消息
            this._lastQueryMsg[deviceId] = firstOf(msgs);
            return this._lastQueryMsg[deviceId];
        }
        // 还有其他新消息，暂存当前的新消息
        for (const msg of msgs) {
            if (msg.timestamp > this._lastQueryMsg[deviceId].timestamp) {
                if (!this._tempQueryMsgs[deviceId]) {
                    this._tempQueryMsgs[deviceId] = [];
                }
                this._tempQueryMsgs[deviceId].push(msg);
            }
        }
        return 'continue';
    }
    /**
     * 继续向上拉取其他新消息
     */
    async _fetchNextRemainingMessages(deviceId, options) {
        let currentPage = 0;
        const { maxPage = 3, pageSize = 10 } = options ?? {};
        while (true) {
            currentPage++;
            if (currentPage > maxPage) {
                // 拉取新消息超长，取消拉取
                return this._fetchNextTempMessage(deviceId);
            }
            const nextTimestamp = lastOf(this._tempQueryMsgs[deviceId]).timestamp;
            const msgs = await this._fetchHistoryMsgs(deviceId, {
                limit: pageSize,
                timestamp: nextTimestamp,
            });
            for (const msg of msgs) {
                if (msg.timestamp >= nextTimestamp) {
                    // 忽略上一页的消息
                }
                else if (msg.timestamp > this._lastQueryMsg[deviceId].timestamp) {
                    // 继续添加新消息
                    this._tempQueryMsgs[deviceId].push(msg);
                }
                else {
                    // 拉取到历史消息处
                    return this._fetchNextTempMessage(deviceId);
                }
            }
        }
    }
    /**
     * 读取暂存的消息
     */
    _fetchNextTempMessage(deviceId) {
        const nextMsg = this._tempQueryMsgs[deviceId].pop();
        if (nextMsg) {
            this._lastQueryMsg[deviceId] = nextMsg;
        }
        return nextMsg;
    }
    /**
     * 拉取历史消息
     */
    async _fetchHistoryMsgs(deviceId, options) {
        const filterAnswer = options?.filterAnswer ?? true;
        const conversation = await MiService.MiNA?.getConversations({
            limit: options?.limit,
            timestamp: options?.timestamp,
        });
        let records = conversation?.records ?? [];
        if (filterAnswer) {
            // 过滤有小爱回答的消息
            records = records.filter((e) => ['TTS', 'LLM'].includes(e.answers[0]?.type ?? '') && // 过滤 TTS 和 LLM 消息
                e.answers.length === 1);
        }
        return records.map((e) => {
            return {
                id: randomUUID(),
                sender: 'user',
                text: e.query,
                timestamp: e.time,
                deviceId,
            };
        });
    }
    /**
     * 清除设备消息缓存
     */
    clear(deviceId) {
        delete this._lastQueryMsg[deviceId];
        delete this._tempQueryMsgs[deviceId];
    }
    /**
     * 清除所有缓存
     */
    clearAll() {
        this._lastQueryMsg = {};
        this._tempQueryMsgs = {};
    }
}
export const MiMessage = new _MiMessage();
//# sourceMappingURL=message.js.map