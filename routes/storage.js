const express = require("express");
const multer = require("multer");
const store = require("../db");
const { getProvider } = require("../storage");
const { authMiddleware } = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
router.use(authMiddleware); // ✅ ensures req.user is set

/**
 * Create file
 * POST /storage/:accountId/files
 */
router.post("/:accountId/files", upload.single("file"), async (req, res) => {
    try {
        const account = await store.getAccount(req.userId, req.params.accountId); // ✅ scoped to user
        if (!account) return res.status(404).json({ error: "Account not found" });

        const provider = getProvider(account.provider);
        if (!provider) return res.status(400).json({ error: "Provider not supported" });

        if (req.file) {
            const result = await provider.createFile(account, {
                name: req.file.originalname,
                mimeType: req.file.mimetype,
                contentStream: req.file.buffer,
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
 */
router.get("/:accountId/files", async (req, res) => {
    try {
        const account = await store.getAccount(req.userId, req.params.accountId);
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
 * Get file metadata or content
 * GET /storage/:accountId/files/:fileId
 */
router.get("/:accountId/files/:fileId", async (req, res) => {
    try {
        const account = await store.getAccount(req.userId, req.params.accountId);
        if (!account) return res.status(404).json({ error: "Account not found" });
        const provider = getProvider(account.provider);
        if (!provider) return res.status(400).json({ error: "Provider not supported" });

        if (req.query.alt === "media") {
            // Fetch file metadata to get MIME type and filename
            const meta = await provider.getFile(account, req.params.fileId, {});
            const fileBuffer = await provider.getFile(account, req.params.fileId, { alt: "media" });

            res.set({
                'Content-Type': meta.mimeType,
                'Content-Disposition': `attachment; filename="${meta.name}"`
            });
            res.send(fileBuffer); // Send Buffer directly
        } else {
            const meta = await provider.getFile(account, req.params.fileId, {});
            res.json(meta); // Return metadata as JSON
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "get file failed" });
    }
});

/**
 * Update file
 * PATCH /storage/:accountId/files/:fileId
 */
router.patch("/:accountId/files/:fileId", upload.single("file"), async (req, res) => {
    try {
        const account = await store.getAccount(req.userId, req.params.accountId);
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
        const account = await store.getAccount(req.userId, req.params.accountId);
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
        const account = await store.getAccount(req.userId, req.params.accountId);
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
