process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const axios = require("axios");
const fs = require("fs-extra");
const { execSync } = require('child_process');
const log = require('./logger/log.js');
const path = require("path");

process.env.BLUEBIRD_W_FORGOTTEN_RETURN = 0;

function validJSON(pathDir) {
	try {
		if (!fs.existsSync(pathDir))
			throw new Error(`File "${pathDir}" not found`);
		// Fast native JSON syntax validation first; falls back to npx jsonlint only on syntax errors
		try {
			JSON.parse(fs.readFileSync(pathDir, "utf8"));
			return true;
		}
		catch {
			execSync(`npx jsonlint "${pathDir}"`, { stdio: 'pipe' });
			return true;
		}
	}
	catch (err) {
		let msgError = err.message;
		msgError = msgError.split("\n").slice(1).join("\n");
		const indexPos = msgError.indexOf("    at");
		msgError = msgError.slice(0, indexPos != -1 ? indexPos - 1 : msgError.length);
		throw new Error(msgError);
	}
}

const { NODE_ENV } = process.env;
const isDev = NODE_ENV === 'development';
const dirConfig = path.normalize(`${__dirname}/config${isDev ? '.dev.json' : '.json'}`);
const dirConfigCommands = path.normalize(`${__dirname}/configCommands${isDev ? '.dev.json' : '.json'}`);
const dirAccount = path.normalize(`${__dirname}/account${isDev ? '.dev.txt' : '.txt'}`);

for (const pathFile of [dirConfig, dirConfigCommands]) {
	try {
		validJSON(pathFile);
	}
	catch (err) {
		log.error("CONFIG", `Invalid JSON file "${pathFile.replace(__dirname, "")}":\n${err.message.split("\n").map(line => `  ${line}`).join("\n")}\nPlease fix it and restart bot`);
		process.exit(0);
	}
}
const config = require(dirConfig);
if (config.whiteListMode?.whiteListIds && Array.isArray(config.whiteListMode.whiteListIds))
	config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds.map(id => id.toString());
const configCommands = require(dirConfigCommands);

global.GoatBot = {
	startTime: Date.now() - process.uptime() * 1000,
	commands: new Map(),
	eventCommands: new Map(),
	commandFilesPath: [],
	eventCommandsFilesPath: [],
	aliases: new Map(),
	onFirstChat: [],
	onChat: [],
	onEvent: [],
	onReply: new Map(),
	onReaction: new Map(),
	onAnyEvent: [],
	config,
	configCommands,
	envCommands: {},
	envEvents: {},
	envGlobal: {},
	reLoginBot: function () { },
	Listening: null,
	oldListening: [],
	callbackListenTime: {},
	storage5Message: [],
	fcaApi: null,
	botID: null
};

global.db = {
	allThreadData: [],
	allUserData: [],
	allDashBoardData: [],
	allGlobalData: [],
	threadModel: null,
	userModel: null,
	dashboardModel: null,
	globalModel: null,
	threadsData: null,
	usersData: null,
	dashBoardData: null,
	globalData: null,
	receivedTheFirstMessage: {}
};

global.client = {
	dirConfig,
	dirConfigCommands,
	dirAccount,
	countDown: {},
	cache: {},
	database: {
		creatingThreadData: [],
		creatingUserData: [],
		creatingDashBoardData: [],
		creatingGlobalData: []
	},
	commandBanned: configCommands.commandBanned
};

const utils = require("./utils.js");
global.utils = utils;
const { colors } = utils;

global.temp = {
	createThreadData: [],
	createUserData: [],
	createThreadDataError: [],
	createUserDataError: [],
	filesOfGoogleDrive: {
		arraybuffer: {},
		stream: {},
		fileNames: {}
	},
	contentScripts: {
		cmds: {},
		events: {}
	}
};

// Watch dirConfig and dirConfigCommands for changes
const watchAndReloadConfig = (dir, type, prop, logName) => {
	let lastModified = fs.statSync(dir).mtimeMs;
	let isFirstModified = true;

	fs.watch(dir, (eventType) => {
		if (eventType === type) {
			const oldConfig = global.GoatBot[prop];

			setTimeout(() => {
				try {
					if (isFirstModified) {
						isFirstModified = false;
						return;
					}
					if (lastModified === fs.statSync(dir).mtimeMs) {
						return;
					}
					global.GoatBot[prop] = JSON.parse(fs.readFileSync(dir, 'utf-8'));
					log.success(logName, `Reloaded ${dir.replace(process.cwd(), "")}`);
				}
				catch (err) {
					log.warn(logName, `Can't reload ${dir.replace(process.cwd(), "")}`);
					global.GoatBot[prop] = oldConfig;
				}
				finally {
					lastModified = fs.statSync(dir).mtimeMs;
				}
			}, 200);
		}
	});
};

watchAndReloadConfig(dirConfigCommands, 'change', 'configCommands', 'CONFIG COMMANDS');
watchAndReloadConfig(dirConfig, 'change', 'config', 'CONFIG');

if (config.autoRestart) {
	const time = config.autoRestart.time;
	if (!isNaN(time) && time > 0) {
		utils.log.info("AUTO RESTART", `Bot will auto restart after ${utils.convertTime(time, true)}`);
		setTimeout(() => {
			utils.log.info("AUTO RESTART", "Restarting...");
			process.exit(2);
		}, time);
	}
	else if (typeof time == "string" && time.match(/^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/gmi)) {
		const cron = require("node-cron");
		utils.log.info("AUTO RESTART", `Bot will auto restart by cron: ${time}`);
		cron.schedule(time, () => {
			utils.log.info("AUTO RESTART", "Restarting...");
			process.exit(2);
		});
	}
}

(async () => {
	try {
		const { data: { version } } = await axios.get("https://raw.githubusercontent.com/ItzPriyanshi/QueenBotV2/main/package.json", { timeout: 5000 });
		const currentVersion = require("./package.json").version;
		const compareVersion = (v1, v2) => {
			const a = v1.split(".").map(Number);
			const b = v2.split(".").map(Number);
			for (let i = 0; i < Math.max(a.length, b.length); i++) {
				if ((a[i] || 0) > (b[i] || 0)) return 1;
				if ((a[i] || 0) < (b[i] || 0)) return -1;
			}
			return 0;
		};
		if (compareVersion(version, currentVersion) === 1)
			utils.log.master("NEW VERSION", `There is a new version of QueenBotV2 (${colors.yellow(currentVersion)} -> ${colors.yellow(version)}), type "${colors.cyan(`${config.prefix}update`)}" or "${colors.cyan("node update")}" to update`);
	}
	catch {
		// Ignore network errors during startup version check
	}
})();

// ———————————————— LOGIN BOT ———————————————— //
require(`./bot/login/login${NODE_ENV === 'development' ? '.dev.js' : '.js'}`);