// MongoDB-backed account store using native driver
const { MongoClient } = require("mongodb");
const { DB_URI } = require("../config/env");
const logger = require("../utils/logger");

let client = null;
let db = null;
let usersColl = null;

async function init() {
    if (!DB_URI) throw new Error("DB_URI is not set for mongo store");

    client = new MongoClient(DB_URI, { useUnifiedTopology: true });
    await client.connect();
    db = client.db();

    usersColl = db.collection("users");

    await usersColl.createIndex({ id: 1 }, { unique: true });
    await usersColl.createIndex({ email: 1 }, { unique: true });

    logger.info("Mongo store initialized");
}

// ---------- USERS ----------
async function createUser(user) {
    await usersColl.insertOne({ ...user, accounts: [] });
    return user;
}

async function getUser(id) {
    return usersColl.findOne({ id });
}

async function getUserByEmail(email) {
    return usersColl.findOne({ email });
}

async function getUserByPhoneNumber(phoneNumber) {
    return usersColl.findOne({phoneNumber});
}

async function listUsers() {
    return usersColl.find({}).toArray();
}

// ---------- ACCOUNTS ----------
async function listAccounts(userId) {
    const user = await getUser(userId);
    return user ? user.accounts : [];
}

async function getAccount(userId, accountId) {
    const user = await getUser(userId);
    if (!user) return null;
    return user.accounts.find((a) => a.id === accountId) || null;
}

async function saveAccount(userId, account) {
    await usersColl.updateOne(
        { id: userId },
        { $pull: { storageAccounts: { id: account.id, userId } } } // remove old
    );
    await usersColl.updateOne({ id: userId }, { $push: { storageAccounts: { ...account, userId } } });
    return account;
}

async function updateAccountForUser(userId, account) {
    await usersColl.updateOne(
      { id: userId, "storageAccounts.id": account.id },
      { $set: { "storageAccounts.$": { ...account, userId } } },
      { upsert: true }
    );
}

async function deleteAccount(userId, accountId) {
    await usersColl.updateOne({ id: userId }, { $pull: { storageAccounts: { id: accountId } } });
    return true;
}

async function restoreAll() {
    return listUsers();
}

async function close() {
    if (client) await client.close();
}

module.exports = {
  init,
  createUser,
  getUser,
  getUserByEmail,
  getUserByPhoneNumber,
  listUsers,
  listAccounts,
  saveAccount,
  deleteAccount,
  restoreAll,
  close,
  updateAccountForUser,
  getAccount
};
