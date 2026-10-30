import { Router } from "express";
import { signToken, requireRole, loginLimiter } from "../auth.js";
import { checkPassword } from "../passwords.js";
import { getOpenRound, ballotForRound, submitBallot } from "../voting.js";

export function publicRoutes(db, config) {
  const router = Router();
  const voter = requireRole("voter", config.jwtSecret);

  router.post("/auth/login", loginLimiter(), (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (email === config.adminEmail && password === config.adminPassword) {
      return res.json({ token: signToken({ role: "admin" }, config.jwtSecret), role: "admin" });
    }

    const participant = db
      .prepare("SELECT id, name, password_hash FROM participants WHERE email = ?")
      .get(email);
    if (!participant || !checkPassword(password, participant.password_hash)) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }
    res.json({
      token: signToken({ role: "voter", id: participant.id }, config.jwtSecret),
      role: "voter",
      name: participant.name,
    });
  });

  // Бюллетень открытого тура для вошедшего участника
  router.get("/ballot", voter, (req, res) => {
    const round = getOpenRound(db);
    if (!round) return res.json({ round: null });
    const hasVoted = Boolean(
      db
        .prepare("SELECT 1 FROM ballots WHERE round = ? AND participant_id = ?")
        .get(round.number, req.user.id)
    );
    res.json({
      round: round.number,
      hasVoted,
      nominations: hasVoted ? [] : ballotForRound(db, round.number),
    });
  });

  // choices: { [nominationId]: participantId | null }
  router.post("/ballot", voter, (req, res) => {
    const choices = req.body?.choices;
    if (!choices || typeof choices !== "object") {
      return res.status(400).json({ error: "Нет выбора" });
    }
    const round = submitBallot(db, req.user.id, choices);
    res.status(201).json({ ok: true, round });
  });

  return router;
}
