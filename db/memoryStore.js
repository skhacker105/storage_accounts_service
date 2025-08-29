const { getProvider } = require("../storage");


// Simple in-memory account store
let users = []; // { id, email, password, accounts: [] }

module.exports = {
    async init() {
        // no-op for memory
        return;
    },

    // ---------- USERS ----------
    async createUser(user) {
        users.push({ ...user, accounts: [] });
        return user;
    },

    async getUser(id) {
        return users.find((u) => u.id === id) || null;
    },

    async getUserByEmail(email) {
        return users.find((u) => u.email === email) || null;
    },

    async listUsers() {
        return users;
    },

    // ---------- ACCOUNTS ----------
    async listAccounts(userId) {
        const user = users.find((u) => u.id === userId);
        return user ? user.accounts : [];
    },

    async updateAccountForUser(userId, account) {
        const user = users.find((u) => u.id === userId);
        if (!user) throw new Error("User not found");
        const idx = user.accounts.findIndex((a) => a.id === account.id);
        if (idx >= 0) {
            user.accounts[idx] = { ...account, userId };
        } else {
            user.accounts.push({ ...account, userId });
        }
    },

    async getAccount(userId, accountId) {
        const user = users.find((u) => u.id === userId);
        if (!user) return null;
        return user.accounts.find((a) => a.id === accountId) || null;
    },

    async saveAccount(userId, account) {
        const user = users.find((u) => u.id === userId);
        if (!user) throw new Error("User not found");

        const provider = getProvider(req.params.provider);
        const idx = user.accounts.findIndex((a) => provider.isSameAccount(a, account));
        if (idx >= 0) user.accounts[idx] = account;
        else user.accounts.push({ ...account, userId });
        return account;
    },

    async deleteAccount(userId, accountId) {
        const user = users.find((u) => u.id === userId);
        if (!user) throw new Error("User not found");
        user.accounts = user.accounts.filter((a) => a.id !== accountId);
        return true;
    },

    async restoreAll() {
        return users;
    },
};
