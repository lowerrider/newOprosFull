import { Router } from "express";
import { requireAnyRole, requireRole } from "../auth.js";
import { generatePassword, hashPassword } from "../passwords.js";
import {
  HttpError,
  getRound,
  listNominations,
  listCandidates,
  results,
  pickFinalists,
} from "../voting.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function participantEmail(value, name) {
  const email = String(value || "").trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) {
    throw new HttpError(400, `Некорректный email у участника «${name}»`);
  }
  return email || null;
}

export function adminRoutes(db, config, mailer) {
  const router = Router();
  router.use(requireAnyRole(["admin", "superadmin"], config.jwtSecret));

  const roundParam = (req) => {
    const n = Number(req.params.round);
    if (n !== 1 && n !== 2) throw new HttpError(404, "Нет такого тура");
    return n;
  };
  const ensureNotStarted = (round) => {
    if (getRound(db, round).status !== "draft") {
      throw new HttpError(409, `Тур ${round} уже начат, состав менять нельзя`);
    }
  };

  // === Участники ===
  router.get("/participants", (req, res) => {
    res.json(
      db
        .prepare(
          `SELECT id, name, email, password_hash IS NOT NULL AS hasPassword,
                  credentials_sent_at AS credentialsSentAt
           FROM participants ORDER BY name`
        )
        .all()
        .map((p) => ({ ...p, hasPassword: Boolean(p.hasPassword) }))
    );
  });

  // Добавление списком: [{ name, email }]. Повторный импорт не создаёт дубли.
  router.post("/participants", (req, res) => {
    const list = Array.isArray(req.body) ? req.body : [req.body];
    const findByEmail = db.prepare("SELECT id FROM participants WHERE email = ? COLLATE NOCASE");
    const findNoEmailByName = db.prepare(
      "SELECT id FROM participants WHERE email IS NULL AND name = ? LIMIT 1"
    );
    const insert = db.prepare("INSERT INTO participants (name, email) VALUES (?, ?)");
    const updateName = db.prepare("UPDATE participants SET name = ? WHERE id = ?");
    const attachEmail = db.prepare("UPDATE participants SET name = ?, email = ? WHERE id = ?");
    let added = 0;
    let updated = 0;
    let skipped = 0;
    db.transaction(() => {
      for (const item of list) {
        const name = String(item?.name || item?.title || "").trim();
        if (!name) continue;
        const email = participantEmail(item?.email, name);
        if (email) {
          const byEmail = findByEmail.get(email);
          if (byEmail) {
            updateName.run(name, byEmail.id);
            updated++;
            continue;
          }
          const withoutEmail = findNoEmailByName.get(name);
          if (withoutEmail) {
            attachEmail.run(name, email, withoutEmail.id);
            updated++;
            continue;
          }
          insert.run(name, email);
          added++;
          continue;
        }
        if (findNoEmailByName.get(name)) {
          skipped++;
        } else {
          insert.run(name, null);
          added++;
        }
      }
    })();
    res.status(201).json({ added, updated, skipped });
  });

  router.put("/participants/:id", (req, res) => {
    const name = String(req.body?.name || "").trim();
    if (!name) throw new HttpError(400, "Укажите ФИО");
    const email = participantEmail(req.body?.email, name);
    const info = db
      .prepare("UPDATE participants SET name = ?, email = ? WHERE id = ?")
      .run(name, email, req.params.id);
    if (!info.changes) throw new HttpError(404, "Участник не найден");
    res.json({ ok: true });
  });

  router.delete("/participants", (req, res) => {
    if (req.body?.confirmation !== "DELETE_ALL") {
      throw new HttpError(400, "Подтвердите удаление всех участников");
    }
    const deleted = db.prepare("SELECT COUNT(*) AS count FROM participants").get().count;
    db.transaction(() => {
      // Связанные бюллетени, голоса и составы кандидатов удалятся по внешним ключам.
      db.prepare("DELETE FROM participants").run();
      db.prepare("UPDATE rounds SET status = 'draft'").run();
    })();
    res.json({ deleted });
  });

  router.delete("/participants/:id", (req, res) => {
    db.prepare("DELETE FROM participants WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  // Генерация паролей. Открытые пароли возвращаются только в этом ответе, в базе хранятся хеши.
  // body: { ids?: number[], onlyMissing?: boolean }
  router.post("/participants/passwords", (req, res) => {
    const { ids, onlyMissing = true } = req.body || {};
    let rows = db
      .prepare(
        `SELECT id, name, email, password_hash FROM participants WHERE email IS NOT NULL ORDER BY name`
      )
      .all();
    if (Array.isArray(ids)) rows = rows.filter((r) => ids.includes(r.id));
    if (onlyMissing) rows = rows.filter((r) => !r.password_hash);

    // Пароль из письма перестаёт действовать, поэтому сбрасываем отметку об отправке
    const update = db.prepare(
      "UPDATE participants SET password_hash = ?, credentials_sent_at = NULL WHERE id = ?"
    );
    const credentials = db.transaction(() =>
      rows.map((r) => {
        const password = generatePassword();
        update.run(hashPassword(password), r.id);
        return { name: r.name, email: r.email, password };
      })
    )();
    res.json(credentials);
  });

  router.get("/mail/status", (req, res) => {
    res.json({ configured: mailer.configured });
  });

  // Поимённая детализация голосов доступна только супер-администратору.
  router.get("/vote-audit", requireRole("superadmin", config.jwtSecret), (req, res) => {
    const rows = db
      .prepare(
        `SELECT b.id AS ballotId, b.round, b.created_at AS submittedAt,
                voter.id AS voterId, voter.name AS voterName, voter.email AS voterEmail,
                n.id AS nominationId, n.title AS nominationTitle, n.sort_order AS nominationOrder,
                choice.id AS choiceId, choice.name AS choiceName
         FROM ballots b
         JOIN participants voter ON voter.id = b.participant_id
         JOIN votes v ON v.ballot_id = b.id
         JOIN nominations n ON n.id = v.nomination_id
         LEFT JOIN participants choice ON choice.id = v.candidate_id
         ORDER BY b.round, voter.name, b.id, n.sort_order, n.title`
      )
      .all();

    const ballots = [];
    const byId = new Map();
    for (const row of rows) {
      let ballot = byId.get(row.ballotId);
      if (!ballot) {
        ballot = {
          id: row.ballotId,
          round: row.round,
          submittedAt: row.submittedAt,
          voter: { id: row.voterId, name: row.voterName, email: row.voterEmail },
          choices: [],
        };
        byId.set(row.ballotId, ballot);
        ballots.push(ballot);
      }
      ballot.choices.push({
        nominationId: row.nominationId,
        nomination: row.nominationTitle,
        candidateId: row.choiceId,
        candidate: row.choiceName,
      });
    }
    res.json({ ballots });
  });

  // Рассылка логина и пароля на почту. Пароль генерируется заново и сохраняется,
  // только если письмо ушло. body: { ids?: number[], onlyNotSent?: boolean }
  router.post("/participants/send-credentials", async (req, res) => {
    if (!mailer.configured) {
      throw new HttpError(503, "Почта не настроена: заполните SMTP_* в .env бекенда");
    }
    const { ids, onlyNotSent = true } = req.body || {};
    let rows = db
      .prepare(
        `SELECT id, name, email, credentials_sent_at FROM participants
         WHERE email IS NOT NULL ORDER BY name`
      )
      .all();
    if (Array.isArray(ids)) rows = rows.filter((r) => ids.includes(r.id));
    if (onlyNotSent) rows = rows.filter((r) => !r.credentials_sent_at);

    const save = db.prepare(
      "UPDATE participants SET password_hash = ?, credentials_sent_at = datetime('now') WHERE id = ?"
    );
    const sent = [];
    const failed = [];
    for (const r of rows) {
      const password = generatePassword();
      try {
        await mailer.sendCredentials({ name: r.name, email: r.email, password });
        save.run(hashPassword(password), r.id);
        sent.push(r.email);
      } catch (error) {
        console.error(`Не удалось отправить письмо ${r.email}:`, error.message);
        failed.push({ email: r.email, error: error.message });
      }
    }
    res.json({ sent, failed });
  });

  // === Номинации ===
  router.get("/nominations", (req, res) => {
    res.json(
      listNominations(db).map((n) => ({
        ...n,
        candidates: { 1: listCandidates(db, 1, n.id), 2: listCandidates(db, 2, n.id) },
      }))
    );
  });

  router.post("/nominations", (req, res) => {
    const title = String(req.body?.title || "").trim();
    if (!title) throw new HttpError(400, "Укажите название номинации");
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM nominations").get().m;
    const { lastInsertRowid } = db
      .prepare("INSERT INTO nominations (title, subtitle, sort_order) VALUES (?, ?, ?)")
      .run(title, String(req.body?.subtitle || ""), maxOrder + 1);
    res.status(201).json({ id: Number(lastInsertRowid) });
  });

  router.put("/nominations/:id", (req, res) => {
    const title = String(req.body?.title || "").trim();
    if (!title) throw new HttpError(400, "Укажите название номинации");
    db.prepare(
      "UPDATE nominations SET title = ?, subtitle = ?, sort_order = COALESCE(?, sort_order) WHERE id = ?"
    ).run(title, String(req.body?.subtitle || ""), req.body?.sortOrder ?? null, req.params.id);
    res.json({ ok: true });
  });

  router.delete("/nominations/:id", (req, res) => {
    if (getRound(db, 1).status !== "draft") {
      throw new HttpError(409, "Голосование уже начато, удалять номинации нельзя");
    }
    db.prepare("DELETE FROM nominations WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
  });

  // Состав номинантов номинации в туре. body: { participantIds: number[] }
  router.put("/rounds/:round/nominations/:id/candidates", (req, res) => {
    const round = roundParam(req);
    ensureNotStarted(round);
    const ids = (req.body?.participantIds || []).map(Number);
    db.transaction(() => {
      db.prepare("DELETE FROM candidates WHERE round = ? AND nomination_id = ?").run(round, req.params.id);
      const add = db.prepare(
        "INSERT INTO candidates (round, nomination_id, participant_id) VALUES (?, ?, ?)"
      );
      for (const pid of ids) add.run(round, req.params.id, pid);
    })();
    res.json({ ok: true });
  });

  // === Туры ===
  router.get("/rounds", (req, res) => {
    res.json(db.prepare("SELECT number, status FROM rounds ORDER BY number").all());
  });

  router.post("/rounds/:round/open", (req, res) => {
    const round = roundParam(req);
    const other = getRound(db, round === 1 ? 2 : 1);
    if (other.status === "open") throw new HttpError(409, "Сначала закройте другой тур");
    if (round === 2 && getRound(db, 1).status !== "closed") {
      throw new HttpError(409, "Сначала закройте 1 тур");
    }
    const hasCandidates = db.prepare("SELECT 1 FROM candidates WHERE round = ?").get(round);
    if (!hasCandidates) throw new HttpError(409, "В туре нет ни одного номинанта");
    db.prepare("UPDATE rounds SET status = 'open' WHERE number = ?").run(round);
    res.json({ ok: true });
  });

  router.post("/rounds/:round/close", (req, res) => {
    const round = roundParam(req);
    db.prepare("UPDATE rounds SET status = 'closed' WHERE number = ? AND status = 'open'").run(round);
    res.json({ ok: true });
  });

  // Сформировать 2 тур из топ-3 каждой номинации 1 тура (с учётом ничьих)
  router.post("/rounds/2/generate", (req, res) => {
    if (getRound(db, 1).status !== "closed") throw new HttpError(409, "Сначала закройте 1 тур");
    ensureNotStarted(2);
    const first = results(db, 1);
    db.transaction(() => {
      db.prepare("DELETE FROM candidates WHERE round = 2").run();
      const add = db.prepare(
        "INSERT INTO candidates (round, nomination_id, participant_id) VALUES (2, ?, ?)"
      );
      for (const n of first.nominations) {
        for (const c of pickFinalists(n.results)) add.run(n.id, c.id);
      }
    })();
    res.json({ ok: true });
  });

  router.get("/rounds/:round/results", (req, res) => {
    res.json(results(db, roundParam(req)));
  });

  // Кто ещё не проголосовал
  router.get("/rounds/:round/missing", (req, res) => {
    const round = roundParam(req);
    res.json(
      db
        .prepare(
          `SELECT id, name, email FROM participants
           WHERE password_hash IS NOT NULL
             AND id NOT IN (SELECT participant_id FROM ballots WHERE round = ?)
           ORDER BY name`
        )
        .all(round)
    );
  });

  // Сброс голосования: удаляет голоса и номинантов, туры возвращаются в черновик
  router.post("/reset", (req, res) => {
    if (req.body?.confirm !== "СБРОС") throw new HttpError(400, "Нужно подтверждение");
    db.transaction(() => {
      db.prepare("DELETE FROM votes").run();
      db.prepare("DELETE FROM ballots").run();
      db.prepare("DELETE FROM candidates").run();
      db.prepare("UPDATE rounds SET status = 'draft'").run();
    })();
    res.json({ ok: true });
  });

  return router;
}
