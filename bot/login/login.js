const defaultRequire = require;

function decode(text) {
  text = Buffer.from(text, "hex").toString("utf8");
  text = Buffer.from(text, "hex").toString("utf8");
  text = Buffer.from(text, "base64").toString("utf8");
  return text;
}

const gradient = defaultRequire("gradient-string");
const axios = defaultRequire("axios");
const path = defaultRequire("path");
const readline = defaultRequire("readline");
const fs = defaultRequire("fs-extra");
const toptp = defaultRequire("totp-generator");
const login = defaultRequire("fca-nx");
const qr = new (defaultRequire("qrcode-reader"))();
const Canvas = defaultRequire("canvas");
const https = defaultRequire("https");

async function getName(userID) {
  try {
    const user = await axios.post(
      `https://www.facebook.com/api/graphql/?q=node(${userID}){name}`
    );
    return user.data[userID].name;
  } catch (error) {
    return null;
  }
}

function compareVersion(version1, version2) {
  const v1 = version1.split(".");
  const v2 = version2.split(".");
  for (let i = 0; i < 3; i++) {
    if (parseInt(v1[i]) > parseInt(v2[i])) return 1;
    if (parseInt(v1[i]) < parseInt(v2[i])) return -1;
  }
  return 0;
}

const { writeFileSync, readFileSync, existsSync, watch } = require("fs-extra");
const handlerWhenListenHasError = require("./handlerWhenListenHasError.js");
const checkLiveCookie = require("./checkLiveCookie.js");
const { callbackListenTime, storage5Message } = global.GoatBot;
const {
  log,
  logColor,
  getPrefix,
  createOraDots,
  jsonStringifyColor,
  getText,
  convertTime,
  colors,
  randomString
} = global.utils;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const currentVersion = require(`${process.cwd()}/package.json`).version;

function centerText(text, length) {
  const width = process.stdout.columns || 50;
  const leftPadding = Math.floor((width - (length || text.length)) / 2);
  const rightPadding = width - leftPadding - (length || text.length);
  const paddedString =
    " ".repeat(leftPadding > 0 ? leftPadding : 0) +
    text +
    " ".repeat(rightPadding > 0 ? rightPadding : 0);
  console.log(paddedString);
}

const titles = [
  [
    " ██████╗  ██████╗  █████╗ ████████╗██████╗  ██████╗ ████████╗    ██╗   ██╗██████╗ ",
    "██╔════╝ ██╔═══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔═══██╗╚══██╔══╝    ██║   ██║╚════██╗",
    "██║  ███╗██║   ██║███████║   ██║   ██████╔╝██║   ██║   ██║       ██║   ██║ █████╔╝",
    "██║   ██║██║   ██║██╔══██║   ██║   ██╔══██╗██║   ██║   ██║       ╚██╗ ██╔╝██╔═══╝ ",
    "╚██████╔╝╚██████╔╝██║  ██║   ██║   ██████╔╝╚██████╔╝   ██║        ╚████╔╝ ███████╗",
    " ╚═════╝  ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═════╝  ╚═════╝    ╚═╝         ╚═══╝  ╚══════╝"
  ],
  [
    "█▀▀ █▀█ ▄▀█ ▀█▀  █▄▄ █▀█ ▀█▀  ▀▄▀ █▄",
    "█▄█ █▄█ █▀█ ░█░  █▄█ █▄█ ░█░  █░█ ▀█"
  ],
  ["G O A T B O T  V 2 @" + currentVersion],
  ["GOATBOT V2"]
];

const maxWidth = process.stdout.columns || 50;
const title =
  maxWidth > 58
    ? titles[0]
    : maxWidth > 36
    ? titles[1]
    : maxWidth > 22
    ? titles[2]
    : titles[3];

let widthConsole = process.stdout.columns || 50;
if (widthConsole > 50) widthConsole = 50;

function createLine(content, isMaxWidth = false) {
  const targetWidth = isMaxWidth ? process.stdout.columns || 50 : widthConsole;
  if (!content) {
    return Array(targetWidth).fill("─").join("");
  } else {
    content = ` ${content.trim()} `;
    const lengthContent = content.length;
    const lengthLine = targetWidth - lengthContent;
    let left = Math.floor(lengthLine / 2);
    if (left < 0 || isNaN(left)) left = 0;
    const lineOne = Array(left).fill("─").join("");
    return lineOne + content + lineOne;
  }
}

console.log(gradient("#f5af19", "#f12711")(createLine(null, true)));
console.log();

for (const text of title) {
  const textColor = gradient("#FA8BFF", "#2BD2FF", "#2BFF88")(text);
  centerText(textColor, text.length);
}

let subTitle = `GoatBot V2@${currentVersion} - A simple Bot chat messenger use personal account`;
const subTitleArray = [];

if (subTitle.length > maxWidth) {
  while (subTitle.length > maxWidth) {
    let lastSpace = subTitle.slice(0, maxWidth).lastIndexOf(" ");
    lastSpace = lastSpace == -1 ? maxWidth : lastSpace;
    subTitleArray.push(subTitle.slice(0, lastSpace).trim());
    subTitle = subTitle.slice(lastSpace).trim();
  }
  subTitle ? subTitleArray.push(subTitle) : "";
} else {
  subTitleArray.push(subTitle);
}

const author = "Created by NTKhang with ♡";
const srcUrl = "Source code: https://github.com/ntkhang03/Goat-Bot-V2";
const fakeRelease = "ALL VERSIONS NOT RELEASED HERE ARE FAKE";

for (const t of subTitleArray) {
  const textColor2 = gradient("#9F98E8", "#AFF6CF")(t);
  centerText(textColor2, t.length);
}

centerText(gradient("#9F98E8", "#AFF6CF")(author), author.length);
centerText(gradient("#9F98E8", "#AFF6CF")(srcUrl), srcUrl.length);
centerText(gradient("#f5ab00", "#f12711")(fakeRelease), fakeRelease.length);

const character = createLine();

const clearLines = (n) => {
  for (let i = 0; i < n; i++) {
    const y = i === 0 ? null : -1;
    process.stdout.moveCursor?.(0, y);
    process.stdout.clearLine?.(1);
  }
  process.stdout.cursorTo?.(0);
  process.stdout.write("");
};

async function input(prompt, isPassword = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  if (isPassword) {
    rl.input.on("keypress", function () {
      const len = rl.line.length;
      readline.moveCursor(rl.output, -len, 0);
      readline.clearLine(rl.output, 1);
      for (let i = 0; i < len; i++) {
        rl.output.write("*");
      }
    });
  }

  return new Promise((resolve) =>
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

qr.readQrCode = async function (filePath) {
  const image = await Canvas.loadImage(filePath);
  const canvas = Canvas.createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, image.width, image.height);
  let value;
  qr.callback = function (err, v) {
    if (err) throw err;
    value = v;
  };
  qr.decode(data);
  return value.result;
};

const { dirAccount } = global.client;
const { facebookAccount } = global.GoatBot.config;

function responseUptimeSuccess(req, res) {
  res.type("json").send({
    status: "success",
    uptime: process.uptime(),
    unit: "seconds"
  });
}

function responseUptimeError(req, res) {
  res.status(500).type("json").send({
    status: "error",
    uptime: process.uptime(),
    statusAccountBot: global.statusAccountBot
  });
}

function checkAndTrimString(string) {
  if (typeof string == "string") return string.trim();
  return string;
}

function filterKeysAppState(appState) {
  return appState.filter((item) =>
    ["c_user", "xs", "datr", "fr", "sb", "i_user"].includes(item.key)
  );
}

global.responseUptimeSuccess = responseUptimeSuccess;
global.responseUptimeCurrent = responseUptimeSuccess;
global.responseUptimeError = responseUptimeError;
global.statusAccountBot = "good";

let changeFbStateByCode = false;
let latestChangeContentAccount = existsSync(dirAccount)
  ? fs.statSync(dirAccount).mtimeMs
  : 0;
let dashBoardIsRunning = false;

function pushI_user(appState, value) {
  appState.push({
    key: "i_user",
    value: value || facebookAccount.i_user,
    domain: "facebook.com",
    path: "/",
    hostOnly: false,
    creation: new Date().toISOString(),
    lastAccessed: new Date().toISOString()
  });
  return appState;
}

function stopListening(keyListen) {
  keyListen = keyListen || Object.keys(callbackListenTime).pop();
  if (callbackListenTime[keyListen]) {
    callbackListenTime[keyListen] = () => {};
  }
  return new Promise((resolve) => {
    try {
      const stopFn =
        global.GoatBot.listening?.stopListening ||
        global.GoatBot.fcaApi?.stopListening;

      if (typeof stopFn === "function") {
        const res = stopFn(() => resolve());
        if (res && typeof res.then === "function") {
          res.then(resolve).catch(resolve);
        } else if (stopFn.length === 0) {
          resolve();
        }
      } else {
        resolve();
      }
    } catch {
      resolve();
    }
  });
}

async function startBot() {
  console.log(colors.hex("#f5ab00")(createLine("START LOGGING IN", true)));
  const currentVersion = require("../../package.json").version;

  // Safe version check: won't crash if GitHub repo returns 404
  try {
    const res = await axios.get(
      "https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/master/tooOldVersions.txt",
      { timeout: 5000 }
    );
    const tooOldVersion = res.data || "0.0.0";
    if ([-1, 0].includes(compareVersion(currentVersion, tooOldVersion))) {
      log.err(
        "VERSION",
        getText("version", "tooOldVersion", colors.yellowBright("node update"))
      );
    }
  } catch {
    // Ignore 404 from dead upstream repository
  }

  if (global.GoatBot.fcaApi) {
    await stopListening();
  }

  log.info("LOGIN FACEBOOK", getText("login", "currentlyLogged"));
  log.info("FCA", "Running with FCA-NX");

  let appState;
  try {
    const appStateFile = existsSync(dirAccount)
      ? dirAccount
      : path.resolve(process.cwd(), "account.txt");
    const accountData = fs.readFileSync(appStateFile, "utf8");
    appState = JSON.parse(accountData);
    log.info("APPSTATE", "Appstate Cookie Is Available");
  } catch (err) {
    return log.error("APPSTATE", "Appstate Cookie Is Missing or Invalid JSON.");
  }

  changeFbStateByCode = true;

  (function loginBot(appState) {
    global.GoatBot.commands = new Map();
    global.GoatBot.eventCommands = new Map();
    global.GoatBot.aliases = new Map();
    global.GoatBot.onChat = [];
    global.GoatBot.onEvent = [];
    global.GoatBot.onReply = new Map();
    global.GoatBot.onReaction = new Map();
    clearInterval(global.intervalRestartListenMqtt);
    delete global.intervalRestartListenMqtt;

    if (facebookAccount.i_user) {
      pushI_user(appState, facebookAccount.i_user);
    }

    let isSendNotiErrorMessage = false;

    login({ appState }, global.GoatBot.config.optionsFca, async function (err, api) {
      if (err || !api) {
        log.err(
          "LOGIN FACEBOOK",
          getText("login", "loginError"),
          err?.error || err?.message || err
        );
        return;
      }

      global.GoatBot.fcaApi = api;
      global.GoatBot.botID = api.getCurrentUserID();
      log.info("LOGIN FACEBOOK", getText("login", "loginSuccess"));

      let hasBanned = false;
      global.botID = api.getCurrentUserID();

      logColor("#f5ab00", createLine("BOT INFO"));
      log.info("NODE VERSION", process.version);
      log.info("PROJECT VERSION", currentVersion);
      log.info("BOT ID", `${global.botID} - ${await getName(global.botID)}`);
      log.info("PREFIX", global.GoatBot.config.prefix);
      log.info("LANGUAGE", global.GoatBot.config.language);
      log.info("BOT NICK NAME", global.GoatBot.config.nickNameBot || "GOAT BOT");

      // Safe GBAN fallback (does not exit if GitHub returns 404)
      let dataGban = {};
      try {
        const item = await axios.get(
          "https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2-Gban/master/gban.json",
          { timeout: 5000 }
        );
        dataGban = item.data || {};
      } catch {
        dataGban = {};
      }

      // Safe notification fetch (does not exit if GitHub returns 404)
      let notification = "";
      try {
        const getNoti = await axios.get(
          "https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/master/notification.txt",
          { timeout: 5000 }
        );
        notification = getNoti.data || "";
      } catch {
        notification = "";
      }

      const {
        threadModel,
        userModel,
        dashBoardModel,
        globalModel,
        threadsData,
        usersData,
        dashBoardData,
        globalData,
        sequelize
      } = await require(
        process.env.NODE_ENV === "development"
          ? "./loadData.dev.js"
          : "./loadData.js"
      )(api, createLine);

      await require("../custom.js")({
        api,
        threadModel,
        userModel,
        dashBoardModel,
        globalModel,
        threadsData,
        usersData,
        dashBoardData,
        globalData,
        getText
      });

      await require(
        process.env.NODE_ENV === "development"
          ? "./loadScripts.dev.js"
          : "./loadScripts.js"
      )(
        api,
        threadModel,
        userModel,
        dashBoardModel,
        globalModel,
        threadsData,
        usersData,
        dashBoardData,
        globalData,
        createLine
      );

      if (global.GoatBot.config.autoLoadScripts?.enable == true) {
        const ignoreCmds =
          global.GoatBot.config.autoLoadScripts.ignoreCmds
            ?.replace(/[ ,]+/g, " ")
            .trim()
            .split(" ") || [];
        const ignoreEvents =
          global.GoatBot.config.autoLoadScripts.ignoreEvents
            ?.replace(/[ ,]+/g, " ")
            .trim()
            .split(" ") || [];

        watch(`${process.cwd()}/scripts/cmds`, async (event, filename) => {
          if (filename && filename.endsWith(".js")) {
            if (ignoreCmds.includes(filename) || filename.endsWith(".eg.js"))
              return;
            if (
              (event == "change" || event == "rename") &&
              existsSync(`${process.cwd()}/scripts/cmds/${filename}`)
            ) {
              try {
                const contentCommand =
                  global.temp.contentScripts.cmds[filename] || "";
                const currentContent = readFileSync(
                  `${process.cwd()}/scripts/cmds/${filename}`,
                  "utf-8"
                );
                if (contentCommand == currentContent) return;
                global.temp.contentScripts.cmds[filename] = currentContent;
                filename = filename.replace(".js", "");

                const infoLoad = global.utils.loadScripts(
                  "cmds",
                  filename,
                  log,
                  global.GoatBot.configCommands,
                  api,
                  threadModel,
                  userModel,
                  dashBoardModel,
                  globalModel,
                  threadsData,
                  usersData,
                  dashBoardData,
                  globalData
                );
                if (infoLoad.status == "success") {
                  log.master(
                    "AUTO LOAD SCRIPTS",
                    `Command ${filename}.js (${infoLoad.command.config.name}) has been reloaded`
                  );
                } else {
                  log.err(
                    "AUTO LOAD SCRIPTS",
                    `Error when reload command ${filename}.js`,
                    infoLoad.error
                  );
                }
              } catch (err) {
                log.err(
                  "AUTO LOAD SCRIPTS",
                  `Error when reload command ${filename}.js`,
                  err
                );
              }
            }
          }
        });

        watch(`${process.cwd()}/scripts/events`, async (event, filename) => {
          if (filename && filename.endsWith(".js")) {
            if (
              ignoreEvents.includes(filename) ||
              filename.endsWith(".eg.js")
            )
              return;
            if (
              (event == "change" || event == "rename") &&
              existsSync(`${process.cwd()}/scripts/events/${filename}`)
            ) {
              try {
                const contentEvent =
                  global.temp.contentScripts.events[filename] || "";
                const currentContent = readFileSync(
                  `${process.cwd()}/scripts/events/${filename}`,
                  "utf-8"
                );
                if (contentEvent == currentContent) return;
                global.temp.contentScripts.events[filename] = currentContent;
                filename = filename.replace(".js", "");

                const infoLoad = global.utils.loadScripts(
                  "events",
                  filename,
                  log,
                  global.GoatBot.configCommands,
                  api,
                  threadModel,
                  userModel,
                  dashBoardModel,
                  globalModel,
                  threadsData,
                  usersData,
                  dashBoardData,
                  globalData
                );
                if (infoLoad.status == "success") {
                  log.master(
                    "AUTO LOAD SCRIPTS",
                    `Event ${filename}.js (${infoLoad.command.config.name}) has been reloaded`
                  );
                } else {
                  log.err(
                    "AUTO LOAD SCRIPTS",
                    `Error when reload event ${filename}.js`,
                    infoLoad.error
                  );
                }
              } catch (err) {
                log.err(
                  "AUTO LOAD SCRIPTS",
                  `Error when reload event ${filename}.js`,
                  err
                );
              }
            }
          }
        });
      }

      if (
        global.GoatBot.config.dashBoard?.enable == true &&
        dashBoardIsRunning == false
      ) {
        logColor("#f5ab00", createLine("DASHBOARD"));
        try {
          await require("../../dashboard/app.js")(api);
          log.info("DASHBOARD", getText("startBot", "openDashboardSuccess"));
          dashBoardIsRunning = true;
        } catch (err) {
          log.err("DASHBOARD", getText("startBot", "openDashboardError"), err);
        }
      }

      logColor("#f5ab00", character);
      let i = 0;
      const adminBot = global.GoatBot.config.adminBot
        .filter((item) => !isNaN(item))
        .map((item) => (item = item.toString()));

      for (const uid of adminBot) {
        try {
          const userName = await usersData.getName(uid);
          log.master("ADMINBOT", `[${++i}] ${uid} | ${userName}`);
        } catch (e) {
          log.master("ADMINBOT", `[${++i}] ${uid}`);
        }
      }

      if (notification) log.master("NOTIFICATION", notification.trim());
      log.master("SUCCESS", getText("startBot", "startBotSuccess"));
      log.master(
        "LOAD TIME",
        `${convertTime(Date.now() - global.GoatBot.startTime)}`
      );
      logColor("#f5ab00", createLine("COPYRIGHT"));
      console.log(
        `\x1b[1m\x1b[33mCOPYRIGHT:\x1b[0m\x1b[1m\x1b[37m \x1b[0m\x1b[1m\x1b[36mProject GoatBot v2 created by ntkhang03 (https://github.com/ntkhang03), please do not sell this source code or claim it as your own. Thank you!\x1b[0m`
      );
      logColor("#f5ab00", character);

      global.GoatBot.config.adminBot = adminBot;
      writeFileSync(
        global.client.dirConfig,
        JSON.stringify(global.GoatBot.config, null, 2)
      );
      writeFileSync(
        global.client.dirConfigCommands,
        JSON.stringify(global.GoatBot.configCommands, null, 2)
      );

      const { restartListenMqtt } = global.GoatBot.config;

      async function callBackListen(error, event) {
        if (error) {
          global.responseUptimeCurrent = responseUptimeError;
          if (
            error === "Connection closed." ||
            error === "Connection closed by user." ||
            error === "Connection refused: Server unavailable"
          ) {
            log.err(
              "LISTEN_MQTT",
              getText("startBot", "listenMqttError"),
              error
            );
            global.responseUptimeCurrent = responseUptimeError;
            global.statusAccountBot = "can't login";

            if (!isSendNotiErrorMessage) {
              await handlerWhenListenHasError({
                api,
                threadModel,
                userModel,
                dashBoardModel,
                globalModel,
                threadsData,
                usersData,
                dashBoardData,
                globalData,
                error
              });
              isSendNotiErrorMessage = true;
            }

            if (global.GoatBot.config.autoRestartWhenListenMqttError) {
              process.exit(2);
            }
            return;
          } else if (
            error == "Connection closed by user." ||
            error == "StopListening"
          ) {
            return;
          } else {
            await handlerWhenListenHasError({
              api,
              threadModel,
              userModel,
              dashBoardModel,
              globalModel,
              threadsData,
              usersData,
              dashBoardData,
              globalData,
              error
            });
            return log.err(
              "LISTEN_MQTT",
              getText("startBot", "callBackError"),
              error
            );
          }
        }

        if (!event) return;

        global.responseUptimeCurrent = responseUptimeSuccess;
        global.statusAccountBot = "good";
        const configLog = global.GoatBot.config.logEvents;

        if (isSendNotiErrorMessage == true) isSendNotiErrorMessage = false;

        if (
          global.GoatBot.config.whiteListMode?.enable == true &&
          global.GoatBot.config.whiteListModeThread?.enable == true &&
          !global.GoatBot.config.adminBot.includes(event.senderID)
        ) {
          if (
            !global.GoatBot.config.whiteListModeThread.whiteListThreadIds.includes(
              event.threadID
            ) &&
            !global.GoatBot.config.whiteListMode.whiteListIds.includes(
              event.senderID
            ) &&
            !global.GoatBot.config.adminBot.includes(event.senderID)
          ) {
            return;
          }
        } else if (
          global.GoatBot.config.whiteListMode?.enable == true &&
          !global.GoatBot.config.whiteListMode.whiteListIds.includes(
            event.senderID
          ) &&
          !global.GoatBot.config.adminBot.includes(event.senderID)
        ) {
          return;
        } else if (
          global.GoatBot.config.whiteListModeThread?.enable == true &&
          !global.GoatBot.config.whiteListModeThread.whiteListThreadIds.includes(
            event.threadID
          ) &&
          !global.GoatBot.config.adminBot.includes(event.senderID)
        ) {
          return;
        }

        if (event.messageID && event.type == "message") {
          if (storage5Message.includes(event.messageID)) {
            Object.keys(callbackListenTime)
              .slice(0, -1)
              .forEach((key) => {
                callbackListenTime[key] = () => {};
              });
          } else {
            storage5Message.push(event.messageID);
          }
          if (storage5Message.length > 5) storage5Message.shift();
        }

        if (configLog.disableAll === false && configLog[event.type] !== false) {
          const participantIDs = [...(event.participantIDs || [])];
          if (event.participantIDs) {
            event.participantIDs = `Array(${event.participantIDs.length})`;
          }
          console.log(
            colors.green(`${(event.type || "").toUpperCase()}:`),
            jsonStringifyColor(event, null, 2)
          );
          if (event.participantIDs) {
            event.participantIDs = participantIDs;
          }
        }

        if (
          (event.senderID && dataGban[event.senderID]) ||
          (event.userID && dataGban[event.userID])
        ) {
          if (event.body && event.threadID) {
            const prefix = getPrefix(event.threadID);
            if (event.body.startsWith(prefix)) {
              return api.sendMessage(
                getText("startBot", "userBanned"),
                event.threadID
              );
            }
            return;
          } else {
            return;
          }
        }

        const handlerAction = require("../handler/handlerAction.js")(
          api,
          threadModel,
          userModel,
          dashBoardModel,
          globalModel,
          usersData,
          threadsData,
          dashBoardData,
          globalData
        );

        if (hasBanned === false) {
          handlerAction(event);
        } else {
          return log.err("GBAN", getText("startBot", "youAreBanned"));
        }
      }

      function createCallBackListen(key) {
        key = randomString(10) + (key || Date.now());
        callbackListenTime[key] = callBackListen;
        return function (error, event) {
          callbackListenTime[key](error, event);
        };
      }

      await stopListening();
      global.GoatBot.listening = api.listenMqtt(createCallBackListen());
      global.GoatBot.callBackListen = callBackListen;

      if (
        global.GoatBot.config.serverUptime.enable == true &&
        !global.GoatBot.config.dashBoard?.enable &&
        !global.serverUptimeRunning
      ) {
        const http = require("http");
        const express = require("express");
        const app = express();
        const server = http.createServer(app);

        let html = "<h1>GoatBot V2 is running!</h1>";
        try {
          const res = await axios.get(
            "https://raw.githubusercontent.com/ntkhang03/resources-goat-bot/master/homepage/home.html",
            { timeout: 5000 }
          );
          html = res.data;
        } catch {
          // Fallback HTML if GitHub raw URL 404s
        }

        const port =
          process.env.PORT ||
          global.GoatBot.config.dashBoard?.port ||
          (!isNaN(global.GoatBot.config.serverUptime.port) &&
            global.GoatBot.config.serverUptime.port) ||
          3001;

        app.get("/", (req, res) => res.send(html));
        app.get("/uptime", global.responseUptimeCurrent);

        try {
          await server.listen(port);
          log.info(
            "UPTIME",
            getText(
              "startBot",
              "openServerUptimeSuccess",
              `http://localhost:${port}`
            )
          );
          if (global.GoatBot.config.serverUptime.socket?.enable == true) {
            require("./socketIO.js")(server);
          }
          global.serverUptimeRunning = true;
        } catch (err) {
          log.err("UPTIME", getText("startBot", "openServerUptimeError"), err);
        }
      }

      if (restartListenMqtt.enable == true) {
        if (restartListenMqtt.logNoti == true) {
          log.info(
            "LISTEN_MQTT",
            getText(
              "startBot",
              "restartListenMessage",
              convertTime(restartListenMqtt.timeRestart, true)
            )
          );
          log.info("BOT_STARTED", getText("startBot", "startBotSuccess"));
          logColor("#f5ab00", character);
        }
        const restart = setInterval(async function () {
          if (restartListenMqtt.enable == false) {
            clearInterval(restart);
            return log.warn(
              "LISTEN_MQTT",
              getText("startBot", "stopRestartListenMessage")
            );
          }
          try {
            await stopListening();
            await sleep(1000);
            global.GoatBot.listening = api.listenMqtt(createCallBackListen());
            log.info("LISTEN_MQTT", "Restarted MQTT listener successfully");
          } catch (e) {
            log.err(
              "LISTEN_MQTT",
              getText("startBot", "restartListenMessageError"),
              e
            );
          }
        }, restartListenMqtt.timeRestart);
        global.intervalRestartListenMqtt = restart;
      }

      require("../autoUptime.js");
    });
  })(appState);

  if (global.GoatBot.config.autoReloginWhenChangeAccount) {
    setTimeout(function () {
      if (!existsSync(dirAccount)) return;
      watch(dirAccount, async (type) => {
        if (
          type == "change" &&
          changeFbStateByCode == false &&
          latestChangeContentAccount != fs.statSync(dirAccount).mtimeMs
        ) {
          clearInterval(global.intervalRestartListenMqtt);
          global.compulsoryStopLisening = true;
          latestChangeContentAccount = fs.statSync(dirAccount).mtimeMs;
          startBot();
        }
      });
    }, 10000);
  }
}

global.GoatBot.reLoginBot = startBot;
startBot();