const mongoose = require("mongoose");
const { Schema } = mongoose;

const userModel = new Schema({
	userID: {
		type: String,
		unique: true
	},
	name: String,
	gender: {
		type: Schema.Types.Mixed,
		default: 0
	},
	vanity: String,
	exp: {
		type: Number,
		default: 0
	},
	money: {
		type: Number,
		default: 0
	},
	banned: {
		type: Object,
		default: {}
	},
	settings: {
		type: Object,
		default: {}
	},
	data: {
		type: Object,
		default: {}
	}
}, {
	timestamps: true
});

module.exports = mongoose.model("users", userModel);
