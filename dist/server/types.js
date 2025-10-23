"use strict";
// WebSocketメッセージ型定義
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
// エラーコード
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    ErrorCode["ROOM_NOT_FOUND"] = "ROOM_NOT_FOUND";
    ErrorCode["ROOM_FULL"] = "ROOM_FULL";
    ErrorCode["INVALID_MOVE"] = "INVALID_MOVE";
    ErrorCode["NOT_YOUR_TURN"] = "NOT_YOUR_TURN";
    ErrorCode["GAME_ENDED"] = "GAME_ENDED";
    ErrorCode["RATE_LIMIT"] = "RATE_LIMIT";
    ErrorCode["INVALID_MESSAGE"] = "INVALID_MESSAGE";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
//# sourceMappingURL=types.js.map