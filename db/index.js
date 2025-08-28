// Exposes the selected store (memory or mongo). Each store must implement:
// init(), listAccounts(), getAccount(id), saveAccount(account), deleteAccount(id), restoreAll()

const { DB_TYPE } = require("../config/env");
const memoryStore = require("./memoryStore");
const mongoStore = require("./mongoStore");
const logger = require("../utils/logger");

let store = memoryStore;

if (DB_TYPE === "mongo") {
    store = mongoStore;
    logger.info("Using mongo store");
} else {
    store = memoryStore;
    logger.info("Using memory store");
}

module.exports = store;
