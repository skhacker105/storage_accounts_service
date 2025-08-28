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

    async saveAccount(userId, account) {
        console.log("current users = ", users);
        console.log("current account = ", account);
        console.log("current userId = ", userId);
        const user = users.find((u) => u.id === userId);
        if (!user) throw new Error("User not found");

        const idx = user.accounts.findIndex((a) => a.id === account.id);
        if (idx >= 0) user.accounts[idx] = account;
        else user.accounts.push(account);
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
