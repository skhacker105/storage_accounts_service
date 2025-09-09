// Google Drive provider module
const { google } = require("googleapis");
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BASE_URL } = require("../config/env");
const store = require("../db"); // used to persist token updates
const stream = require("stream");

const REDIRECT_PATH = "/accounts/callback/google";
const REDIRECT_URI = `${BASE_URL}${REDIRECT_PATH}`;
const SCOPES = ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"];

function oauth2ClientFactory() {
    return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
}

async function getDriveForAccount(account) {
    if (!account || !account.tokens) {
        throw new Error("Account not connected or tokens missing");
    }
    const oauth2Client = oauth2ClientFactory();
    oauth2Client.setCredentials(account.tokens);

    // Listen for token refreshes and persist them
    if (typeof oauth2Client.on === "function") {
        oauth2Client.on("tokens", async (tokens) => {
            try {
                account.tokens = { ...account.tokens, ...tokens };
                if (account.userId) {
                    await store.updateAccountForUser(account.userId, account);
                }
            } catch (e) {
                console.error("Failed to persist refreshed tokens:", e);
            }
        });
    }

    // Attempt manual refresh if supported
    try {
        await oauth2Client.getAccessToken();
    } catch (e) {
        // ignore errors; token refresh may still happen lazily
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    return { drive, oauth2Client };
}

module.exports = {
    name: "google",

    getAuthUrl(state) {
        const client = oauth2ClientFactory();
        return client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: SCOPES,
            state,
        });
    },

    isSameAccount(account1, account2) {
        return account1.provider === account2.provider && account1.label === account2.label;
    },

    // query contains code and state
    async handleOAuthCallback(query) {
        const { code, state } = query;
        if (!code) throw new Error("Missing code in OAuth callback");
        const client = oauth2ClientFactory();
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);

        // fetch profile
        const oauth2 = google.oauth2({ auth: client, version: "v2" });
        const { data: profile } = await oauth2.userinfo.get();

        let id = state;
        try {
            const parsed = JSON.parse(state);
            id = parsed.csrf ?? id;
        } catch {}

        // Build account object
        const account = {
            id,
            provider: "google",
            label: profile.email || profile.name || `google-${profile.id}`,
            profile,
            tokens,
            createdAt: new Date().toISOString(),
        };

        // Persist using store here (store.saveAccount called by route too for redundancy)
        // await store.saveAccount(account);
        return account;
    },

    // Create file -- contentStream should be a readable stream or Buffer
    async createFile(account, { name, mimeType = "application/octet-stream", contentStream }) {
        const { drive } = await getDriveForAccount(account);

        // ensure contentStream is a stream
        let bodyStream;
        if (Buffer.isBuffer(contentStream)) {
            bodyStream = new stream.PassThrough();
            bodyStream.end(contentStream);
        } else {
            bodyStream = contentStream;
        }

        const resp = await drive.files.create({
            requestBody: { name, mimeType },
            media: { mimeType, body: bodyStream },
            fields: "id,name,mimeType,size,createdTime",
        });
        return resp.data;
    },

    async listFiles(account, { q = null, pageSize = 50 } = {}) {
        const { drive } = await getDriveForAccount(account);
        const resp = await drive.files.list({
            q,
            pageSize,
            fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
        });
        return resp.data.files || [];
    },

    // get metadata or download if { alt: 'media' }
    async getFile(account, fileId, options = {}) {
        const { drive } = await getDriveForAccount(account);
        const { alt } = options;
        if (alt === "media") {
            const resp = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
            return new Promise((resolve, reject) => {
                const chunks = [];
                resp.data
                    .on("data", (chunk) => chunks.push(chunk))
                    .on("end", () => {
                        const buffer = Buffer.concat(chunks);
                        resolve(buffer); // Return Buffer for Angular to handle
                    })
                    .on("error", (err) => {
                        console.error("Error streaming file data:", err);
                        reject(err);
                    });
            });
        } else {
            const resp = await drive.files.get({ fileId, fields: "id,name,mimeType,size,modifiedTime" });
            return resp.data;
        }
    },

    async updateFile(account, fileId, { name, mimeType, contentStream }) {
        const { drive } = await getDriveForAccount(account);

        let requestBody = {};
        if (name) requestBody.name = name;
        // If contentStream provided, pass media
        if (contentStream) {
            let bodyStream;
            if (Buffer.isBuffer(contentStream)) {
                bodyStream = new stream.PassThrough();
                bodyStream.end(contentStream);
            } else {
                bodyStream = contentStream;
            }
            const resp = await drive.files.update({
                fileId,
                requestBody,
                media: { mimeType: mimeType || "application/octet-stream", body: bodyStream },
                fields: "id,name,mimeType,size,modifiedTime",
            });
            return resp.data;
        } else {
            // metadata-only update
            const resp = await drive.files.update({
                fileId,
                requestBody,
                fields: "id,name,mimeType,size,modifiedTime",
            });
            return resp.data;
        }
    },

    async deleteFile(account, fileId) {
        const { drive } = await getDriveForAccount(account);
        await drive.files.delete({ fileId });
        return;
    },

    async getQuota(account) {
        const { drive } = await getDriveForAccount(account);
        const resp = await drive.about.get({ fields: "storageQuota" });
        const q = resp.data.storageQuota || {};
        // Normalize
        const total = q.limit ? Number(q.limit) : null;
        const used = q.usageInDrive ? Number(q.usageInDrive) : q.usage ? Number(q.usage) : 0;
        const available = total != null ? Math.max(total - used, 0) : null;
        return { storageQuota: q, totalBytes: total, usedBytes: used, availableBytes: available };
    },
};
