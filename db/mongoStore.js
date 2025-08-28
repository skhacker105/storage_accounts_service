// MongoDB-backed account store using native driver
const { MongoClient } = require('mongodb');
const { DB_URI } = require('../config/env');
const logger = require('../utils/logger');

let client = null;
let db = null;
let accountsColl = null;

async function init() {
  if (!DB_URI) {
    throw new Error('DB_URI is not set for mongo store');
  }
  client = new MongoClient(DB_URI, { useUnifiedTopology: true });
  await client.connect();
  db = client.db(); // use DB from URI (or default)
  accountsColl = db.collection('accounts');
  // Ensure index on id
  await accountsColl.createIndex({ id: 1 }, { unique: true });
  logger.info('Mongo store initialized');
}

async function listAccounts() {
  return accountsColl.find({}).toArray();
}

async function getAccount(id) {
  return accountsColl.findOne({ id });
}

async function saveAccount(account) {
  // Upsert by id
  await accountsColl.updateOne(
    { id: account.id },
    { $set: account },
    { upsert: true }
  );
}

async function deleteAccount(id) {
  await accountsColl.deleteOne({ id });
}

async function restoreAll() {
  return listAccounts();
}

async function close() {
  if (client) await client.close();
}

module.exports = {
  init,
  listAccounts,
  getAccount,
  saveAccount,
  deleteAccount,
  restoreAll,
  close
};
