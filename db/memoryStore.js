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
        users.push({ ...user, storageAccounts: [] });
        return user;
    },

    async getUser(id) {
        return users.find((u) => u.id === id) || null;
    },

    async getUserByEmail(email) {
        return users.find((u) => u.email === email) || null;
    },

    async getUserByPhoneNumber(phoneNumber) {
        return users.find((u) => u.phoneNumber === phoneNumber) || null;
    },

    async listUsers() {
        return users;
    },

    async updateUser(id, updates) {
        const userIndex = users.findIndex((u) => u.id === id);
        if (userIndex === -1) throw new Error("User not found");

        // Preserve storageAccounts if not explicitly updated
        users[userIndex] = { 
            ...users[userIndex], 
            ...updates, 
            storageAccounts: users[userIndex].storageAccounts 
        };
        return users[userIndex];
    },

    // ---------- ACCOUNTS ----------
    async listAccounts(userId) {
        const user = users.find((u) => u.id === userId);
        return user ? user.storageAccounts : [];
    },

    async updateAccountForUser(userId, account) {
        const user = users.find((u) => u.id === userId);
        if (!user) throw new Error("User not found");
        const idx = user.storageAccounts.findIndex((a) => a.id === account.id);
        if (idx >= 0) {
            user.storageAccounts[idx] = { ...account, userId };
        } else {
            user.storageAccounts.push({ ...account, userId });
        }
    },

    async getAccount(userId, accountId) {
        const user = users.find((u) => u.id === userId);
        if (!user) return null;
        return user.storageAccounts.find((a) => a.id === accountId) || null;
    },

    async saveAccount(userId, account) {
        const user = users.find((u) => u.id === userId);
        if (!user) throw new Error("User not found");

        const provider = getProvider(account.provider);
        const idx = user.storageAccounts.findIndex((a) => provider.isSameAccount(a, account));
        if (idx >= 0) user.storageAccounts[idx] = account;
        else user.storageAccounts.push({ ...account, userId });
        return account;
    },

    async deleteAccount(userId, accountId) {
        const user = users.find((u) => u.id === userId);
        if (!user) throw new Error("User not found");
        user.storageAccounts = user.storageAccounts.filter((a) => a.id !== accountId);
        return true;
    },

    async restoreAll() {
        return users;
    },
};
