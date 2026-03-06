const express = require("express");
const { ImapFlow } = require("imapflow");
const nodemailer = require("nodemailer");
const { simpleParser } = require("mailparser");

const router = express.Router();

function getMailConfig(req) {
  const cfg = req.headers["x-mail-config"];
  if (!cfg) return null;
  try {
    return JSON.parse(Buffer.from(cfg, "base64").toString());
  } catch {
    return null;
  }
}

function createImapClient(config) {
  return new ImapFlow({
    host: config.host,
    port: Number(config.port) || 993,
    secure: config.tls !== false,
    auth: { user: config.user, pass: config.password },
    logger: false,
    tls: { rejectUnauthorized: config.rejectUnauthorized !== false },
  });
}

function extractTags(flags) {
  if (!flags) return [];
  const tags = [];
  for (const flag of flags) {
    if (typeof flag === "string" && flag.startsWith("$dopamind_")) {
      tags.push(flag.replace("$dopamind_", ""));
    }
  }
  return tags;
}

async function withImap(config, folder, fn) {
  const client = createImapClient(config);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      return await fn(client);
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

// --- Static routes BEFORE parameterized routes ---

// POST /api/mail/send
router.post("/send", async (req, res) => {
  const config = getMailConfig(req);
  if (!config?.smtp?.host) return res.status(400).json({ error: "SMTP not configured – set SMTP host in settings" });

  const { to, cc, subject, body } = req.body;
  if (!to || !subject) return res.status(400).json({ error: "Missing to/subject" });

  try {
    const smtp = config.smtp;
    const port = Number(smtp.port) || 587;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port,
      secure: port === 465,
      auth: { user: smtp.user || config.user, pass: smtp.password || config.password },
      tls: { rejectUnauthorized: smtp.rejectUnauthorized !== false },
    });

    await transporter.sendMail({
      from: smtp.user || config.user,
      to,
      cc: cc || undefined,
      subject,
      text: body,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("SMTP error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mail/test
router.post("/test", async (req, res) => {
  const config = getMailConfig(req);
  if (!config) return res.status(400).json({ error: "Mail not configured" });

  const client = createImapClient(config);
  try {
    await client.connect();
    await client.logout();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mail?folder=INBOX&tag=...&limit=50&offset=0
const MAIL_LIMIT_DEFAULT = 50;
const MAIL_LIMIT_MIN = 1;
const MAIL_LIMIT_MAX = 200;

router.get("/", async (req, res) => {
  const config = getMailConfig(req);
  if (!config) return res.status(400).json({ error: "Mail not configured" });

  const folder = req.query.folder || "INBOX";
  const filterTag = req.query.tag;
  const limit = Math.min(Math.max(parseInt(req.query.limit || String(MAIL_LIMIT_DEFAULT), 10), MAIL_LIMIT_MIN), MAIL_LIMIT_MAX);
  const offset = Math.max(0, parseInt(req.query.offset || "0", 10));

  try {
    const { mails: messages, total } = await withImap(config, folder, async (client) => {
      const result = [];
      const total = client.mailbox.exists;
      if (total === 0) return { mails: [], total: 0 };

      // Fetch messages from newest to oldest, applying the offset
      const endSeq = Math.max(1, total - offset);
      const startSeq = Math.max(1, endSeq - (limit - 1));
      for await (const msg of client.fetch(`${startSeq}:${endSeq}`, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        source: { maxLength: 4096 },
      })) {
        const tags = extractTags(msg.flags);
        if (filterTag && !tags.includes(filterTag)) continue;

        let preview = "";
        try {
          if (msg.source) {
            const parsed = await simpleParser(msg.source);
            preview = (parsed.text || "").slice(0, 200).replace(/\n+/g, " ");
          }
        } catch {}

        result.push({
          uid: msg.uid,
          subject: msg.envelope?.subject || "(no subject)",
          from: msg.envelope?.from?.[0]?.address || "unknown",
          fromName: msg.envelope?.from?.[0]?.name || "",
          date: msg.envelope?.date?.toISOString() || null,
          seen: msg.flags?.has?.("\\Seen") || false,
          flagged: msg.flags?.has?.("\\Flagged") || false,
          preview,
          tags,
        });
      }
      return { mails: result.reverse(), total };
    });
    res.json({ mails: messages, total });
  } catch (err) {
    console.error("IMAP fetch error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mail/:uid
router.get("/:uid", async (req, res) => {
  const config = getMailConfig(req);
  if (!config) return res.status(400).json({ error: "Mail not configured" });

  try {
    const mail = await withImap(config, req.query.folder || "INBOX", async (client) => {
      const msg = await client.fetchOne(req.params.uid, { source: true }, { uid: true });
      if (!msg?.source) throw new Error("Message not found");
      const parsed = await simpleParser(msg.source);
      return {
        uid: Number(req.params.uid),
        subject: parsed.subject || "",
        from: parsed.from?.text || "",
        to: parsed.to?.text || "",
        cc: parsed.cc?.text || "",
        date: parsed.date?.toISOString() || null,
        body: parsed.text || "",
        html: parsed.html || "",
      };
    });
    res.json(mail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mail/:uid/seen
router.put("/:uid/seen", async (req, res) => {
  const config = getMailConfig(req);
  if (!config) return res.status(400).json({ error: "Mail not configured" });

  try {
    await withImap(config, "INBOX", async (client) => {
      await client.messageFlagsAdd(req.params.uid, ["\\Seen"], { uid: true });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mail/:uid
router.delete("/:uid", async (req, res) => {
  const config = getMailConfig(req);
  if (!config) return res.status(400).json({ error: "Mail not configured" });

  try {
    await withImap(config, "INBOX", async (client) => {
      await client.messageDelete(req.params.uid, { uid: true });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mail/:uid/archive
router.put("/:uid/archive", async (req, res) => {
  const config = getMailConfig(req);
  if (!config) return res.status(400).json({ error: "Mail not configured" });

  try {
    await withImap(config, "INBOX", async (client) => {
      try {
        await client.messageMove(req.params.uid, "Archive", { uid: true });
      } catch {
        await client.messageMove(req.params.uid, "INBOX.Archive", { uid: true });
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mail/:uid/tag
router.put("/:uid/tag", async (req, res) => {
  const config = getMailConfig(req);
  if (!config) return res.status(400).json({ error: "Mail not configured" });

  const { tag } = req.body;
  if (!tag) return res.status(400).json({ error: "Tag required" });

  try {
    await withImap(config, "INBOX", async (client) => {
      await client.messageFlagsAdd(req.params.uid, [`$dopamind_${tag}`], { uid: true });
    });
    res.json({ success: true, tag });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/mail/:uid/untag
router.put("/:uid/untag", async (req, res) => {
  const config = getMailConfig(req);
  if (!config) return res.status(400).json({ error: "Mail not configured" });

  const { tag } = req.body;
  if (!tag) return res.status(400).json({ error: "Tag required" });

  try {
    await withImap(config, "INBOX", async (client) => {
      await client.messageFlagsRemove(req.params.uid, [`$dopamind_${tag}`], { uid: true });
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
