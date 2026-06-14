interface IMessage {
    id: string;
    sender: 'user';
    text: string;
    timestamp: number;
    deviceId: string;
}
declare class _MiMessage {
    private _lastQueryMsg;
    private _tempQueryMsgs;
    /**
     * 获取下一条消息
     * @param deviceId 设备 ID
     */
    fetchNextMessage(deviceId: string): Promise<IMessage | undefined>;
    /**
     * 拉取第一条消息（初始化）
     */
    private _fetchFirstMessage;
    /**
     * 拉取下一条消息
     */
    private _fetchNextMessage;
    /**
     * 拉取最新的 2 条消息，用于和上一条消息比对是否连续
     */
    private _fetchNext2Messages;
    /**
     * 继续向上拉取其他新消息
     */
    private _fetchNextRemainingMessages;
    /**
     * 读取暂存的消息
     */
    private _fetchNextTempMessage;
    /**
     * 拉取历史消息
     */
    private _fetchHistoryMsgs;
    /**
     * 清除设备消息缓存
     */
    clear(deviceId: string): void;
    /**
     * 清除所有缓存
     */
    clearAll(): void;
}
declare const MiMessage: _MiMessage;

export { type IMessage, MiMessage };
