// Simple in-memory account store
let accounts = [];

module.exports = {
  async init() {
    // no-op for memory
    return;
  },

  async listAccounts() {
    return accounts.slice();
  },

  async getAccount(id) {
    return accounts.find(a => a.id === id) || null;
  },

  async saveAccount(account) {
    const idx = accounts.findIndex(a => a.id === account.id);
    if (idx >= 0) accounts[idx] = account;
    else accounts.push(account);
    return;
  },

  async deleteAccount(id) {
    accounts = accounts.filter(a => a.id !== id);
    return;
  },

  async restoreAll() {
    // returns all accounts currently in memory (useful when server restarts
    // with DB backing you would call DB to restore)
    return accounts.slice();
  }
};
