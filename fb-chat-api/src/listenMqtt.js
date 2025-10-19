"use strict";
const utils = require("../utils");
const log = require("npmlog");
const mqtt = require('mqtt');
const websocket = require('websocket-stream');
const HttpsProxyAgent = require('https-proxy-agent');
const EventEmitter = require('events');

const identity = function () { };
let form = {};
let getSeqId = function () { };

const topics = [
        "/legacy_web",
        "/webrtc",
        "/rtc_multi",
        "/onevc",
        "/br_sr", 
        
        "/sr_res",
        "/t_ms",
        "/thread_typing",
        "/orca_typing_notifications",
        "/notify_disconnect",
        
        "/orca_presence",
        

        "/legacy_web_mtouch"
        
        
        
        
        
        
        
];

function listenMqtt(defaultFuncs, api, ctx, globalCallback) {
        
        
        const chatOn = ctx.globalOptions.online;
        const foreground = false;

        const sessionID = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) + 1;
        const GUID = utils.getGUID();
        const username = {
                u: ctx.i_userID || ctx.userID,
                s: sessionID,
                chat_on: chatOn,
                fg: foreground,
                d: GUID,
                ct: "websocket",
                
                aid: "219994525426954",
                mqtt_sid: "",
                cp: 3,
                ecp: 10,
                st: [],
                pm: [],
                dc: "",
                no_auto_fg: true,
                gas: null,
                pack: [],
                a: ctx.globalOptions.userAgent,
                aids: null
        };

        const cookies = ctx.jar.getCookies('https://www.facebook.com').join('; ');

        let host;
        if (ctx.mqttEndpoint) {
                host = `${ctx.mqttEndpoint}&sid=${sessionID}&cid=${GUID}`;
        } else if (ctx.region) {
                host = `wss://edge-chat.facebook.com/chat?region=${ctx.region.toLowerCase()}&sid=${sessionID}&cid=${GUID}`;
        } else {
                host = `wss://edge-chat.facebook.com/chat?sid=${sessionID}&cid=${GUID}`;
        }

        const options = {
                clientId: 'mqttwsclient',
                protocolId: 'MQIsdp',
                protocolVersion: 3,
                username: JSON.stringify(username),
                clean: true,
                wsOptions: {
                        headers: {
                                Cookie: cookies,
                                Origin: 'https://www.facebook.com',
                                'User-Agent': ctx.globalOptions.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
                                Referer: 'https://www.facebook.com/',
                                Host: new URL(host).hostname
                        },
                        origin: 'https://www.facebook.com',
                        protocolVersion: 13,
                        binaryType: 'arraybuffer'
                },
                keepalive: 60,
                reschedulePings: true,
                reconnectPeriod: 3
        };

        if (typeof ctx.globalOptions.proxy != "undefined") {
                const agent = new HttpsProxyAgent(ctx.globalOptions.proxy);
                options.wsOptions.agent = agent;
        }

        ctx.mqttClient = new mqtt.Client(_ => websocket(host, options.wsOptions), options);

        const mqttClient = ctx.mqttClient;

        mqttClient.on('error', function (err) {
                log.error("listenMqtt", err);
                mqttClient.end();
                utils.checkLiveCookie(ctx, defaultFuncs)
                        .then(res => {
                                globalCallback({
                                        type: "stop_listen",
                                        error: err.message || "Connection refused: Server unavailable"
                                }, null);
                        })
                        .catch(checkErr => {
                                globalCallback({
                                        type: "account_inactive",
                                        error: "Maybe your account is blocked by facebook, please login and check at https://facebook.com"
                                }, null);
                        });
        });

        mqttClient.on('close', function () {
                globalCallback({
                        type: "stop_listen",
                        error: "Connection closed."
                }, null);
        });

        mqttClient.on('connect', function () {
                topics.forEach(function (topicsub) {
                        mqttClient.subscribe(topicsub);
                });

                let topic;
                const queue = {
                        sync_api_version: 10,
                        max_deltas_able_to_process: 1000,
                        delta_batch_size: 500,
                        encoding: "JSON",
                        entity_fbid: ctx.i_userID || ctx.userID
                };

                if (ctx.syncToken) {
                        topic = "/messenger_sync_get_diffs";
                        queue.last_seq_id = ctx.lastSeqId;
                        queue.sync_token = ctx.syncToken;
                } else {
                        topic = "/messenger_sync_create_queue";
                        queue.initial_titan_sequence_id = ctx.lastSeqId;
                        queue.device_params = null;
                }

                mqttClient.publish(topic, JSON.stringify(queue), { qos: 1, retain: false });
                
                
                mqttClient.publish("/foreground_state", JSON.stringify({ foreground: chatOn }), { qos: 1 });
                mqttClient.publish("/set_client_settings", JSON.stringify({ make_user_available_when_in_foreground: true }), { qos: 1 });

                const rTimeout = setTimeout(function () {
                        mqttClient.end();
                        globalCallback({
                                type: "stop_listen",
                                error: "Connection timed out (tmsWait)"
                        }, null);
                }, 5000);

                ctx.tmsWait = function () {
                        clearTimeout(rTimeout);
                        ctx.globalOptions.emitReady ? globalCallback({
                                type: "ready",
                                error: null
                        }) : "";
                        delete ctx.tmsWait;
                };

        });

        mqttClient.on('message', function (topic, message, _packet) {
                let jsonMessage = Buffer.isBuffer(message) ? Buffer.from(message).toString() : message;
                try {
                        jsonMessage = JSON.parse(jsonMessage);
                }
                catch (e) {
                        jsonMessage = {};
                }

                if (jsonMessage.type === "jewel_requests_add") {
                        globalCallback(null, {
                                type: "friend_request_received",
                                actorFbId: jsonMessage.from.toString(),
                                timestamp: Date.now().toString()
                        });
                }
                else if (jsonMessage.type === "jewel_requests_remove_old") {
                        globalCallback(null, {
                                type: "friend_request_cancel",
                                actorFbId: jsonMessage.from.toString(),
                                timestamp: Date.now().toString()
                        });
                }
                else if (topic === "/t_ms") {
                        if (ctx.tmsWait && typeof ctx.tmsWait == "function") {
                                ctx.tmsWait();
                        }

                        if (jsonMessage.firstDeltaSeqId && jsonMessage.syncToken) {
                                ctx.lastSeqId = jsonMessage.firstDeltaSeqId;
                                ctx.syncToken = jsonMessage.syncToken;
                        }

                        if (jsonMessage.lastIssuedSeqId) {
                                ctx.lastSeqId = parseInt(jsonMessage.lastIssuedSeqId);
                        }

                        
                        for (const i in jsonMessage.deltas) {
                                const delta = jsonMessage.deltas[i];
                                parseDelta(defaultFuncs, api, ctx, globalCallback, { "delta": delta });
                        }
                } else if (topic === "/thread_typing" || topic === "/orca_typing_notifications") {
                        const typ = {
                                type: "typ",
                                isTyping: !!jsonMessage.state,
                                from: jsonMessage.sender_fbid.toString(),
                                threadID: utils.formatID((jsonMessage.thread || jsonMessage.sender_fbid).toString())
                        };
                        (function () { globalCallback(null, typ); })();
                } else if (topic === "/orca_presence") {
                        if (!ctx.globalOptions.updatePresence) {
                                for (const i in jsonMessage.list) {
                                        const data = jsonMessage.list[i];
                                        const userID = data["u"];

                                        const presence = {
                                                type: "presence",
                                                userID: userID.toString(),
                                                
                                                timestamp: data["l"] * 1000,
                                                statuses: data["p"]
                                        };
                                        (function () { globalCallback(null, presence); })();
                                }
                        }
                }

        });

}

function parseDelta(defaultFuncs, api, ctx, globalCallback, v) {
        if (v.delta.class == "NewMessage") {
                
                if (ctx.globalOptions.pageID &&
                        ctx.globalOptions.pageID != v.queue
                )
                        return;

                (function resolveAttachmentUrl(i) {
                        if (i == (v.delta.attachments || []).length) {
                                let fmtMsg;
                                try {
                                        fmtMsg = utils.formatDeltaMessage(v);
                                } catch (err) {
                                        return globalCallback({
                                                error: "Problem parsing message object. Please open an issue at https://github.com/ntkhang03/fb-chat-api/issues.",
                                                detail: err,
                                                res: v,
                                                type: "parse_error"
                                        });
                                }
                                if (fmtMsg) {
                                        if (ctx.globalOptions.autoMarkDelivery) {
                                                markDelivery(ctx, api, fmtMsg.threadID, fmtMsg.messageID);
                                        }
                                }
                                return !ctx.globalOptions.selfListen &&
                                        (fmtMsg.senderID === ctx.i_userID || fmtMsg.senderID === ctx.userID) ?
                                        undefined :
                                        (function () { globalCallback(null, fmtMsg); })();
                        } else {
                                if (v.delta.attachments[i].mercury.attach_type == "photo") {
                                        api.resolvePhotoUrl(
                                                v.delta.attachments[i].fbid,
                                                (err, url) => {
                                                        if (!err)
                                                                v.delta.attachments[
                                                                        i
                                                                ].mercury.metadata.url = url;
                                                        return resolveAttachmentUrl(i + 1);
                                                }
                                        );
                                } else {
                                        return resolveAttachmentUrl(i + 1);
                                }
                        }
                })(0);
        }

        if (v.delta.class == "ClientPayload") {
                const clientPayload = utils.decodeClientPayload(
                        v.delta.payload
                );

                if (clientPayload && clientPayload.deltas) {
                        for (const i in clientPayload.deltas) {
                                const delta = clientPayload.deltas[i];
                                if (delta.deltaMessageReaction && !!ctx.globalOptions.listenEvents) {
                                        (function () {
                                                globalCallback(null, {
                                                        type: "message_reaction",
                                                        threadID: (delta.deltaMessageReaction.threadKey
                                                                .threadFbId ?
                                                                delta.deltaMessageReaction.threadKey.threadFbId : delta.deltaMessageReaction.threadKey
                                                                        .otherUserFbId).toString(),
                                                        messageID: delta.deltaMessageReaction.messageId,
                                                        reaction: delta.deltaMessageReaction.reaction,
                                                        senderID: delta.deltaMessageReaction.senderId == 0 ? delta.deltaMessageReaction.userId.toString() : delta.deltaMessageReaction.senderId.toString(),
                                                        userID: (delta.deltaMessageReaction.userId || delta.deltaMessageReaction.senderId).toString()
                                                });
                                        })();
                                } else if (delta.deltaRecallMessageData && !!ctx.globalOptions.listenEvents) {
                                        (function () {
                                                globalCallback(null, {
                                                        type: "message_unsend",
                                                        threadID: (delta.deltaRecallMessageData.threadKey.threadFbId ?
                                                                delta.deltaRecallMessageData.threadKey.threadFbId : delta.deltaRecallMessageData.threadKey
                                                                        .otherUserFbId).toString(),
                                                        messageID: delta.deltaRecallMessageData.messageID,
                                                        senderID: delta.deltaRecallMessageData.senderID.toString(),
                                                        deletionTimestamp: delta.deltaRecallMessageData.deletionTimestamp,
                        .timestamp
                                                });
                                        })();
                                } else if (delta.deltaRemoveMessage && !!ctx.globalOptions.listenEvents) {
                                        (function () {
                                                globalCallback(null, {
                                                        type: "message_self_delete",
                                                        threadID: (delta.deltaRemoveMessage.threadKey.threadFbId ?
                                                                delta.deltaRemoveMessage.threadKey.threadFbId : delta.deltaRemoveMessage.threadKey
                                                                        .otherUserFbId).toString(),
                                                        messageID: delta.deltaRemoveMessage.messageIds.length == 1 ? delta.deltaRemoveMessage.messageIds[0] : delta.deltaRemoveMessage.messageIds,
                                                        senderID: api.getCurrentUserID(),
                                                        deletionTimestamp: delta.deltaRemoveMessage.deletionTimestamp,
                                                        timestamp: delta.deltaRemoveMessage.timestamp
                                                });
                                        })();
                                }
                                else if (delta.deltaMessageReply) {
                                        
                                        let mdata =
                                                delta.deltaMessageReply.message === undefined ? [] :
                                                        delta.deltaMessageReply.message.data === undefined ? [] :
                                                                delta.deltaMessageReply.message.data.prng === undefined ? [] :
                                                                        JSON.parse(delta.deltaMessageReply.message.data.prng);
                                        let m_id = mdata.map(u => u.i);
                                        let m_offset = mdata.map(u => u.o);
                                        let m_length = mdata.map(u => u.l);

                                        const mentions = {};

                                        for (let i = 0; i < m_id.length; i++) {
                                                mentions[m_id[i]] = (delta.deltaMessageReply.message.body || "").substring(
                                                        m_offset[i],
                                                        m_offset[i] + m_length[i]
                                                );
                                        }
                                        
                                        const callbackToReturn = {
                                                type: "message_reply",
                                                threadID: (delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId ?
                                                        delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId : delta.deltaMessageReply.message.messageMetadata.threadKey
                                                                .otherUserFbId).toString(),
                                                messageID: delta.deltaMessageReply.message.messageMetadata.messageId,
                                                senderID: delta.deltaMessageReply.message.messageMetadata.actorFbId.toString(),
                                                attachments: (delta.deltaMessageReply.message.attachments || []).map(function (att) {
                                                        const mercury = JSON.parse(att.mercuryJSON);
                                                        Object.assign(att, mercury);
                                                        return att;
                                                }).map(att => {
                                                        let x;
                                                        try {
                                                                x = utils._formatAttachment(att);
                                                        } catch (ex) {
                                                                x = att;
                                                                x.error = ex;
                                                                x.type = "unknown";
              _x[... all 3 lines trimmed ...]
                                                
                                                body: delta.deltaMessageReply.message.body || "",
                                                isGroup: !!delta.deltaMessageReply.message.messageMetadata.threadKey.threadFbId,
                                                mentions: mentions,
                                                timestamp: delta.deltaMessageReply.message.messageMetadata.timestamp,
                                                participantIDs: (delta.deltaMessageReply.message.messageMetadata.cid.canonicalParticipantFbids || delta.deltaMessageReply.message.participants || []).map(e => e.toString())
                                        };

                                        if (delta.deltaMessageReply.repliedToMessage) {
                                                
                                                mdata =
                                                        delta.deltaMessageReply.repliedToMessage === undefined ? [] :
                                                                delta.deltaMessageReply.repliedToMessage.data === undefined ? [] :
                                                                        delta.deltaMessageReply.repliedToMessage.data.prng === undefined ? [] :
                                                                                JSON.parse(delta.deltaMessageReply.repliedToMessage.data.prng);
                                                m_id = mdata.map(u => u.i);
                                                m_offset = mdata.map(u => u.o);
                                                m_length = mdata.map(u => u.l);

                                                const rmentions = {};

                                                for (let i = 0; i < m_id.length; i++) {
                                                        rmentions[m_id[i]] = (delta.deltaMessageReply.repliedToMessage.body || "").substring(
                                                                m_offset[i],
                                                                m_offset[i] + m_length[i]
                                                        );
                                                }
                                                
                                                callbackToReturn.messageReply = {
                                                        threadID: (delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId ?
                                                                delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId : delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey
                                                                        .otherUserFbId).toString(),
                                                        messageID: delta.deltaMessageReply.repliedToMessage.messageMetadata.messageId,
                                                        senderID: delta.deltaMessageReply.repliedToMessage.messageMetadata.actorFbId.toString(),
                                                        attachments: delta.deltaMessageReply.repliedToMessage.attachments.map(function (att) {
                                                                const mercury = JSON.parse(att.mercuryJSON);
                                                                Object.assign(att, mercury);
                                                      _x[... all 7 lines trimmed ...]
                                                                        x.error = ex;
                                                                        x.type = "unknown";
                                                                }
                                                                return x;
                                                        }),
                                                        body: delta.deltaMessageReply.repliedToMessage.body || "",
                                                        isGroup: !!delta.deltaMessageReply.repliedToMessage.messageMetadata.threadKey.threadFbId,
                                                        mentions: rmentions,
                                                        timestamp: delta.deltaMessageReply.repliedToMessage.messageMetadata.timestamp
                                                };
source 
                                                        .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, {
                                                                "av": ctx.globalOptions.pageID,
                                                                "queries": JSON.stringify({
                                                                        "o0": {
                                  _x[... all 3 lines trimmed ...]
                                                                                        
                                                                                        "thread_and_message_id": {
source 
                                                                                                "message_id": delta.deltaMessageReply.replyToMessageId.id
                                                                                        }
source 
                                                                        }
                                                                })
                                                        })
                                                        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
                                _x[... all 30 lines trimmed ...]
                      s.map(att => {
                                                                        
                                                                                try {
                                                                                        x = utils._formatAttachment({
                                                            source 
                                                                                        });
                                                          s.error = ex;
                                                                                        x.type = "unknown";
                                                                                }
s.body || "",
                                                                        isGroup: callbackToReturn.isGroup,
                                                        s.timestamp_precise)
                                                                };
                                                        })
                                                        .catch((err) => {
source 
                                                        })
                                                        .finally(function () {
                                                                if (ctx.globalOptions.autoMarkDelivery) {
source 
                                                                }
                        _x[... all 5 lines trimmed ...]
                                        
                                        callbackToReturn.delta = delta;
id);
                                        }

                                        return !ctx.globalOptions.selfListen &&
source 
                                                undefined :
                                                (function () { globalCallback(null, callbackToReturn); })();
                                }
                        }
                        return;
section 
        }

        if (v.delta.class !== "NewMessage" &&
                !ctx.globalOptions.listenEvents
        )
                return;

        switch (v.delta.class) {
                case "ReadReceipt":
                        var fmtMsg;
                        try {
                                fmtMsg = utils.formatDeltaReadReceipt(v.delta);
source 
                        catch (err) {
                                return globalCallback({
                                        error: "Problem parsing message object. Please open an issue at https://github.com/ntkhang03/fb-chat-api/issues.",
source 
                                        res: v.delta,
                                        type: "parse_error"
                                });
                        }
                        return (function () { globalCallback(null, fmtMsg); })();
                case "AdminTextMessage":
                        switch (v.delta.type) {
                                case "change_thread_theme":
source 
                                case "change_thread_quick_reaction":
                                case "change_thread_admins":
source 
                                case "magic_words":
                                case "change_thread_approval_mode":
                                case "messenger_call_log":
                                case "participant_joined_group_call":
                                        var fmtMsg;
                                        try {
                                                fmtMsg = utils.formatDeltaEvent(v.delta);
                                        }
                                        catch (err) {
source 
                                                        detail: err,
                                                        res: v.delta,
source 
                                                });
                                        }
                                        return (function () { globalCallback(null, fmtMsg); })();
section 
                        }
                
                case "ForcedFetch":
                        if (!v.delta.threadKey) return;
                        var mid = v.delta.messageId;
                        var tid = v.delta.threadKey.threadFbId;
            _x[... all 300 lines trimmed ...]
                                                
s[n].entity.id] = (fetchData.message.text || "").substr(fetchData.message.ranges[n].offset, fetchData.message.ranges[n].length);
                                                                }
source 
                                                                        messageID: fetchData.message_id,
                                                                        senderID: fetchData.message_sender.id.toString(),
                                                                        attachments: fetchData.message.blob_attachment.map(att => {
                                                                                let x;
source 
                                                                                        x = utils._formatAttachment({
                                                                                                blob_attachment: att
source 
                                                                                        x = att;
                                                            source 
                                                                                
s.body || "",
          _x[... all 3 lines trimmed ...]
                                                        })
source 
                                                
                                                        log.error("forcedFetch", fetchData);
                                                }
                                        })
                                        .catch((err) => {
source 
                                        });
                        }
                        break;
s:
                case "ApprovalQueue":
                        var formattedEvent;
                        try {
                                formattedEvent = utils.formatDeltaEvent(v.delta);
source 
                                        error: "Problem parsing message object. Please open an issue at https://github.com/ntkhang03/fb-chat-api/issues.",
                                        detail: err,
                            s: v.delta,
                                        type: "parse_error"
                                });
                        }
                D === ctx.userID)) || !ctx.loggedIn ?
                                undefined :
                                (function () { globalCallback(null, formattedEvent); })();
section 
}

function markDelivery(ctx, api, threadID, messageID) {
        if (threadID && messageID) {
                api.markAsDelivered(threadID, messageID, (err) => {
                        if (err) {
                                log.error("markAsDelivered", err);
source 
                                if (ctx.globalOptions.autoMarkRead) {
                                        api.markAsRead(threadID, (err) => {
                                                if (err) {
                                                        log.error("markAsDelivered", err);
source 
                                        });
                                }
section 
                });
        }
}



module.exports = function (defaultFuncs, api, ctx) {
        let globalCallback = identity;
        getSeqId = function getSeqId() {
                ctx.t_mqttCalled = false;
                defaultFuncs
                        .post("https://www.facebook.com/api/graphqlbatch/", ctx.jar, form)
                        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
sData) != "Array") throw { error: "Not logged in", res: resData };
                                if (resData && resData[resData.length - 1].error_results > 0) throw resData[0].o0.errors;
                                if (resData[resData.length - 1].successful_results === 0) throw { error: "getSeqId: there was no successful_results", res: resData };
s.sync_sequence_id) {
                                        ctx.lastSeqId = resData[0].o0.data.viewer.message_threads.sync_sequence_id;
source 
                                } else throw { error: "getSeqId: no sync_sequence_id found.", res: resData };
                        })
                        .catch((err) => {
                                log.error("getSeqId", err);
source 
                                return globalCallback(err);
  S: "message", message);
                });

          t Listen)
                        ctx.lastSeqId = null;
                ctx.syncToken = undefined;
                ctx.t_mqttCalled = false;

                form = {
                        "av": ctx.globalOptions.pageID,
                        "queries": JSON.stringify({
                                "o0": {
                                        "doc_id": "3336396659757871",
                                        "query_params": {
                                                "limit": 1,
s: ["INBOX"],
                                                "includeDeliveryReceipts": false,
                                      s: "listenMqtt",
                                        }
                                }
        _x[... all 3 lines trimmed ...]
                        getSeqId(defaultFuncs, api, ctx, globalCallback);
section 
                }

                api.stopListening = msgEmitter.stopListening;
                api.stopListeningAsync = msgEmitter.stopListeningAsync;
                return msgEmitter;
        };
};