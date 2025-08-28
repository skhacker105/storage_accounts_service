const express = require("express");
const multer = require("multer");
const store = require("../db");
const { getProvider } = require("../storage");
const stream = require("stream");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

/**
 * Create file
 * POST /storage/:accountId/files
 * - multipart/form-data with 'file' to upload binary
 * - OR application/json with { name, mimeType, content } where content is utf-8 text
 */
router.post("/:accountId/files", upload.single("file"), async (req, res) => {
    try {
        const account = await store.getAccount(req.params.accountId);
        if (!account) return res.status(404).json({ error: "Account not found" });

        const provider = getProvider(account.provider);
        if (!provider) return res.status(400).json({ error: "Provider not supported" });

        if (req.file) {
            const buffer = req.file.buffer;
            const result = await provider.createFile(account, {
                name: req.file.originalname,
                mimeType: req.file.mimetype,
                contentStream: buffer,
            });
            return res.json(result);
        } else {
            const { name, mimeType = "text/plain", content } = req.body;
            if (!name || content == null) return res.status(400).json({ error: "name and content required" });
            const buffer = Buffer.from(content, "utf8");
            const result = await provider.createFile(account, { name, mimeType, contentStream: buffer });
            return res.json(result);
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "create file failed" });
    }
});

/**
 * List files
 * GET /storage/:accountId/files
 * optional query: q (Drive q string), pageSize
 */
router.get("/:accountId/files", async (req, res) => {
    try {
        const account = await store.getAccount(req.params.accountId);
        if (!account) return res.status(404).json({ error: "Account not found" });
        const provider = getProvider(account.provider);
        if (!provider) return res.status(400).json({ error: "Provider not supported" });

        const q = req.query.q || null;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize, 10) : 50;
        const files = await provider.listFiles(account, { q, pageSize });
        return res.json(files);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "list files failed" });
    }
});

/**
 * Get file metadata or download content
 * GET /storage/:accountId/files/:fileId
 * query ?alt=media to download file content (streams)
 */
router.get("/:accountId/files/:fileId", async (req, res) => {
    try {
        const account = await store.getAccount(req.params.accountId);
        if (!account) return res.status(404).json({ error: "Account not found" });
        const provider = getProvider(account.provider);
        if (!provider) return res.status(400).json({ error: "Provider not supported" });

        const { alt } = req.query;
        if (alt === "media") {
            const fileStream = await provider.getFile(account, req.params.fileId, { alt: "media" });
            // fileStream is a readable stream
            fileStream.on("error", (err) => {
                console.error(err);
                res.status(500).end();
            });
            fileStream.pipe(res);
        } else {
            const meta = await provider.getFile(account, req.params.fileId, {});
            res.json(meta);
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "get file failed" });
    }
});

/**
 * Update file metadata or content
 * PATCH /storage/:accountId/files/:fileId
 * - multipart/form-data with 'file' to replace content
 * - OR application/json { name, mimeType, content }
 */
router.patch("/:accountId/files/:fileId", upload.single("file"), async (req, res) => {
    try {
        const account = await store.getAccount(req.params.accountId);
        if (!account) return res.status(404).json({ error: "Account not found" });
        const provider = getProvider(account.provider);
        if (!provider) return res.status(400).json({ error: "Provider not supported" });

        if (req.file) {
            const result = await provider.updateFile(account, req.params.fileId, {
                name: req.file.originalname,
                mimeType: req.file.mimetype,
                contentStream: req.file.buffer,
            });
            return res.json(result);
        } else {
            const { name, mimeType, content } = req.body;
            if (content != null) {
                const buffer = Buffer.from(content, "utf8");
                const result = await provider.updateFile(account, req.params.fileId, {
                    name,
                    mimeType,
                    contentStream: buffer,
                });
                return res.json(result);
            } else if (name) {
                const result = await provider.updateFile(account, req.params.fileId, { name });
                return res.json(result);
            } else {
                return res.status(400).json({ error: "Nothing to update" });
            }
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "update file failed" });
    }
});

/**
 * Delete file
 * DELETE /storage/:accountId/files/:fileId
 */
router.delete("/:accountId/files/:fileId", async (req, res) => {
    try {
        const account = await store.getAccount(req.params.accountId);
        if (!account) return res.status(404).json({ error: "Account not found" });
        const provider = getProvider(account.provider);
        if (!provider) return res.status(400).json({ error: "Provider not supported" });

        await provider.deleteFile(account, req.params.fileId);
        return res.json({ ok: true });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "delete file failed" });
    }
});

/**
 * Quota
 * GET /storage/:accountId/quota
 */
router.get("/:accountId/quota", async (req, res) => {
    try {
        const account = await store.getAccount(req.params.accountId);
        if (!account) return res.status(404).json({ error: "Account not found" });
        const provider = getProvider(account.provider);
        if (!provider) return res.status(400).json({ error: "Provider not supported" });

        const quota = await provider.getQuota(account);
        return res.json(quota);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "quota failed" });
    }
});

module.exports = router;
