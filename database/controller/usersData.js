const { existsSync, writeJsonSync, readJsonSync } = require("fs-extra");
const moment = require("moment-timezone");
const path = require("path");
const _ = require("lodash");
const { CustomError } = global.utils;
const { creatingUserData } = global.client.database;

function normalizeGender(gender) {
	if (typeof gender === "number" && !Number.isNaN(gender))
		return gender;
	if (typeof gender === "string") {
		const g = gender.toUpperCase().trim();
		if (g === "FEMALE" || g === "1")
			return 1;
		if (g === "MALE" || g === "2")
			return 2;
	}
	return 0;
}

module.exports = async function (databaseType, userModel, api, fakeGraphql) {
	let Users = [];
	const pathUsersData = path.join(__dirname, "..", "data/usersData.json");

	switch (databaseType) {
		case "mongodb": {
			// delete keys '_id' and '__v' in all users
			Users = (await userModel.find({}).lean()).map(user => _.omit(user, ["_id", "__v"]));
			break;
		}
		case "sqlite": {
			Users = (await userModel.findAll()).map(user => user.get({ plain: true }));
			break;
		}
		case "json": {
			if (!existsSync(pathUsersData))
				writeJsonSync(pathUsersData, []);
			Users = readJsonSync(pathUsersData);
			break;
		}
	}
	global.db.allUserData = Users;

	async function save(userID, userData, mode, path) {
		try {
			let index = _.findIndex(global.db.allUserData, { userID });
			if (index === -1 && mode === "update") {
				try {
					await create_(userID);
					index = _.findIndex(global.db.allUserData, { userID });
				}
				catch (err) {
					throw new CustomError({
						name: "USER_NOT_EXIST",
						message: `Can't find user with userID: ${userID} in database`
					});
				}
			}

			switch (mode) {
				case "create": {
					switch (databaseType) {
						case "mongodb":
						case "sqlite": {
							let dataCreated = await userModel.create(userData);
							dataCreated = databaseType === "mongodb" ?
								_.omit(dataCreated._doc, ["_id", "__v"]) :
								dataCreated.get({ plain: true });
							global.db.allUserData.push(dataCreated);
							return _.cloneDeep(dataCreated);
						}
						case "json": {
							const timeCreate = moment.tz().format();
							userData.createdAt = timeCreate;
							userData.updatedAt = timeCreate;
							global.db.allUserData.push(userData);
							writeJsonSync(pathUsersData, global.db.allUserData, { spaces: 2 });
							return _.cloneDeep(userData);
						}
					}
					break;
				}
				case "update": {
					const oldUserData = global.db.allUserData[index];
					const dataWillChange = {};

					if (Array.isArray(path) && Array.isArray(userData)) {
						path.forEach((p, idx) => {
							const key = p.split(".")[0];
							dataWillChange[key] = oldUserData[key];
							_.set(dataWillChange, p, userData[idx]);
						});
					}
					else
						if (path && typeof path === "string") {
							const key = path.split(".")[0];
							dataWillChange[key] = oldUserData[key];
							_.set(dataWillChange, path, userData);
						}
						else
							for (const key in userData)
								dataWillChange[key] = userData[key];

					switch (databaseType) {
						case "mongodb": {
							let dataUpdated = await userModel.findOneAndUpdate({ userID }, dataWillChange, { returnDocument: 'after' });
							dataUpdated = _.omit(dataUpdated._doc, ["_id", "__v"]);
							global.db.allUserData[index] = dataUpdated;
							return _.cloneDeep(dataUpdated);
						}
						case "sqlite": {
							const user = await userModel.findOne({ where: { userID } });
							if (!user) {
								const created = await userModel.create({ ...oldUserData, ...dataWillChange, userID });
								const plainCreated = created.get({ plain: true });
								global.db.allUserData[index] = plainCreated;
								return _.cloneDeep(plainCreated);
							}
							const dataUpdated = (await user.update(dataWillChange)).get({ plain: true });
							global.db.allUserData[index] = dataUpdated;
							return _.cloneDeep(dataUpdated);
						}
						case "json": {
							dataWillChange.updatedAt = moment.tz().format();
							global.db.allUserData[index] = {
								...oldUserData,
								...dataWillChange
							};
							writeJsonSync(pathUsersData, global.db.allUserData, { spaces: 2 });
							return _.cloneDeep(global.db.allUserData[index]);
						}
					}
					break;
				}
				case "remove": {
					if (index != -1) {
						global.db.allUserData.splice(index, 1);
						switch (databaseType) {
							case "mongodb":
								await userModel.deleteOne({ userID });
								break;
							case "sqlite":
								await userModel.destroy({ where: { userID } });
								break;
							case "json":
								writeJsonSync(pathUsersData, global.db.allUserData, { spaces: 2 });
								break;
						}
					}
					break;
				}
			}
		}
		catch (err) {
			throw err;
		}
	}

	async function getInfo(userID) {
		try {
			const userInfo = await api.getUserInfo(userID);
			return userInfo[userID];
		}
		catch (err) {
			throw err;
		}
	}

	async function create_(userID, userInfo) {
		const findInCreatingData = creatingUserData.find(u => u.userID == userID);
		if (findInCreatingData)
			return findInCreatingData.promise;

		const queue = new Promise(async function (resolve_, reject_) {
			try {
				if (global.db.allUserData.some(u => u.userID == userID)) {
					throw new CustomError({
						name: "DATA_ALREADY_EXISTS",
						message: `User with id "${userID}" already exists in the data`
					});
				}
				if (isNaN(userID)) {
					throw new CustomError({
						name: "INVALID_USER_ID",
						message: `The first argument (userID) must be a number, not a ${typeof userID}`
					});
				}
				userInfo = userInfo || (await getInfo(userID)) || {};
				let userData = {
					userID: String(userID),
					name: userInfo.name || "Facebook User",
					gender: normalizeGender(userInfo.gender),
					vanity: userInfo.vanity || "",
					exp: 0,
					money: 0,
					banned: {},
					settings: {},
					data: {}
				};
				userData = await save(userID, userData, "create");
				resolve_(_.cloneDeep(userData));
			}
			catch (err) {
				reject_(err);
			}
			finally {
				const idx = creatingUserData.findIndex(u => u.userID == userID);
				if (idx !== -1)
					creatingUserData.splice(idx, 1);
			}
		});
		creatingUserData.push({
			userID,
			promise: queue
		});
		return queue;
	}

	async function refreshInfo(userID, updateInfoUser) {
		try {
			if (isNaN(userID)) {
				throw new CustomError({
					name: "INVALID_USER_ID",
					message: `The first argument (userID) must be a number, not a ${typeof userID}`
				});
			}
			const infoUser = await get_(userID);
			updateInfoUser = updateInfoUser || (await getInfo(userID)) || {};

			const newData = {
				name: updateInfoUser.name || infoUser.name || "Facebook User",
				vanity: updateInfoUser.vanity || infoUser.vanity || "",
				gender: normalizeGender(updateInfoUser.gender ?? infoUser.gender)
			};

			return await save(userID, newData, "update");
		}
		catch (err) {
			throw err;
		}
	}

	function getAll(path, defaultValue, query) {
		try {
			let dataReturn = _.cloneDeep(global.db.allUserData);

			if (query)
				if (typeof query !== "string")
					throw new Error(`The third argument (query) must be a string, not a ${typeof query}`);
				else
					dataReturn = dataReturn.map(uData => fakeGraphql(query, uData));

			if (path)
				if (!["string", "object"].includes(typeof path))
					throw new Error(`The first argument (path) must be a string or an array, not a ${typeof path}`);
				else
					if (typeof path === "string")
						return dataReturn.map(uData => _.get(uData, path, defaultValue));
					else
						return dataReturn.map(uData => _.times(path.length, i => _.get(uData, path[i], defaultValue[i])));

			return dataReturn;
		}
		catch (err) {
			throw err;
		}
	}

	async function get_(userID, path, defaultValue, query) {
		try {
			if (isNaN(userID)) {
				throw new CustomError({
					name: "INVALID_USER_ID",
					message: `The first argument (userID) must be a number, not a ${typeof userID}`
				});
			}
			let userData;

			const index = global.db.allUserData.findIndex(u => u.userID == userID);
			if (index === -1)
				userData = await create_(userID);
			else
				userData = global.db.allUserData[index];

			if (query)
				if (typeof query !== "string")
					throw new Error(`The fourth argument (query) must be a string, not a ${typeof query}`);
				else
					userData = fakeGraphql(query, userData);

			if (path)
				if (!["string", "object"].includes(typeof path))
					throw new Error(`The second argument (path) must be a string or an array, not a ${typeof path}`);
				else
					if (typeof path === "string")
						return _.cloneDeep(_.get(userData, path, defaultValue));
					else
						return _.cloneDeep(_.times(path.length, i => _.get(userData, path[i], defaultValue[i])));

			return _.cloneDeep(userData);
		}
		catch (err) {
			throw err;
		}
	}

	async function set(userID, updateData, path, query) {
		try {
			if (isNaN(userID)) {
				throw new CustomError({
					name: "INVALID_USER_ID",
					message: `The first argument (userID) must be a number, not a ${typeof userID}`
				});
			}
			if (!path && (typeof updateData != "object" || typeof updateData == "object" && Array.isArray(updateData)))
				throw new Error(`The second argument (updateData) must be an object, not a ${typeof updateData}`);
			const userData = await save(userID, updateData, "update", path);
			if (query)
				return _.cloneDeep(fakeGraphql(query, userData));
			return _.cloneDeep(userData);
		}
		catch (err) {
			throw err;
		}
	}

	// Handle legacy BIGINT string values safely during arithmetic
	async function addMoney(userID, money, query) {
		try {
			if (isNaN(userID)) {
				throw new CustomError({
					name: "INVALID_USER_ID",
					message: `The first argument (userID) must be a number, not a ${typeof userID}`
				});
			}
			if (isNaN(money)) {
				throw new CustomError({
					name: "INVALID_MONEY",
					message: `The second argument (money) must be a number, not a ${typeof money}`
				});
			}
			const currentMoney = await get_(userID, "money", 0);
			return await set(userID, Number(currentMoney) + Number(money), "money", query);
		}
		catch (err) {
			throw err;
		}
	}

	async function subtractMoney(userID, money, query) {
		try {
			if (isNaN(userID)) {
				throw new CustomError({
					name: "INVALID_USER_ID",
					message: `The first argument (userID) must be a number, not a ${typeof userID}`
				});
			}
			if (isNaN(money)) {
				throw new CustomError({
					name: "INVALID_MONEY",
					message: `The second argument (money) must be a number, not a ${typeof money}`
				});
			}
			const currentMoney = await get_(userID, "money", 0);
			return await set(userID, Number(currentMoney) - Number(money), "money", query);
		}
		catch (err) {
			throw err;
		}
	}

	async function remove(userID) {
		try {
			if (isNaN(userID)) {
				throw new CustomError({
					name: "INVALID_USER_ID",
					message: `The first argument (userID) must be a number, not a ${typeof userID}`
				});
			}
			await save(userID, { userID }, "remove");
			return true;
		}
		catch (err) {
			throw err;
		}
	}

	async function getName(userID) {
		try {
			if (isNaN(userID)) {
				throw new CustomError({
					name: "INVALID_USER_ID",
					message: `The first argument (userID) must be a number, not a ${typeof userID}`
				});
			}
			const userData = global.db.allUserData.find(u => u.userID == userID);
			if (userData && userData.name)
				return userData.name;
			const userInfo = await getInfo(userID);
			return userInfo?.name || "Facebook User";
		}
		catch (err) {
			return "Facebook User";
		}
	}

	async function getAvatarUrl(userID) {
		if (isNaN(userID)) {
			throw new CustomError({
				name: "INVALID_USER_ID",
				message: `The first argument (userID) must be a number, not a ${typeof userID}`
			});
		}
		return `https://graph.facebook.com/${userID}/picture?type=large&width=500&height=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
	}

	return {
		existsSync: function existsSync(userID) {
			return global.db.allUserData.some(u => u.userID == userID);
		},
		create: create_,
		refreshInfo,
		getAll,
		get: get_,
		set,
		addMoney,
		subtractMoney,
		remove,
		getName,
		getAvatarUrl
	};
};