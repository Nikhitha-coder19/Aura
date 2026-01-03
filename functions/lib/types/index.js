"use strict";
// AURA Type Definitions
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionType = exports.RiskLevel = exports.Intent = void 0;
var Intent;
(function (Intent) {
    Intent["OPEN_WEB_APP"] = "OPEN_WEB_APP";
    Intent["SEND_MESSAGE"] = "SEND_MESSAGE";
    Intent["DRAFT_EMAIL"] = "DRAFT_EMAIL";
    Intent["SUMMARIZE"] = "SUMMARIZE";
    Intent["PLAY_MEDIA"] = "PLAY_MEDIA";
    Intent["SEARCH"] = "SEARCH";
    Intent["ASK_QUESTION"] = "ASK_QUESTION";
    Intent["VISION_ANALYZE"] = "VISION_ANALYZE";
    Intent["GREETING"] = "GREETING";
    Intent["UNKNOWN"] = "UNKNOWN";
})(Intent || (exports.Intent = Intent = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "LOW";
    RiskLevel["MEDIUM"] = "MEDIUM";
    RiskLevel["HIGH"] = "HIGH";
    RiskLevel["BLOCKED"] = "BLOCKED";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
var ActionType;
(function (ActionType) {
    ActionType["OPEN_URL"] = "OPEN_URL";
    ActionType["DRAFT_CONTENT"] = "DRAFT_CONTENT";
    ActionType["DISPLAY"] = "DISPLAY";
    ActionType["NONE"] = "NONE";
})(ActionType || (exports.ActionType = ActionType = {}));
//# sourceMappingURL=index.js.map