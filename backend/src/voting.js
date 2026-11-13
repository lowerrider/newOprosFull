// Логика туров и подсчёта голосов

export const FINALISTS = 3;

export function getRound(db, number) {
  return db.prepare("SELECT number, status FROM rounds WHERE number = ?").get(number);
}

export function getOpenRound(db) {
  return db.prepare("SELECT number, status FROM rounds WHERE status = 'open'").get();
}

export function listNominations(db) {
  return db
    .prepare("SELECT id, title, subtitle, sort_order AS sortOrder FROM nominations ORDER BY sort_order, id")
    .all();
}

export function listCandidates(db, round, nominationId, { includeWithdrawn = true } = {}) {
  return db
    .prepare(
      `SELECT p.id, p.name, c.withdrawn_at AS withdrawnAt FROM candidates c
       JOIN participants p ON p.id = c.participant_id
       WHERE c.round = ? AND c.nomination_id = ?
         ${includeWithdrawn ? "" : "AND c.withdrawn_at IS NULL"}
       ORDER BY p.name`
    )
    .all(round, nominationId);
}

// Номинации тура вместе с номинантами (только те, где есть номинанты)
export function ballotForRound(db, round) {
  return listNominations(db)
    .map((n) => ({
      ...n,
      candidates: listCandidates(db, round, n.id, { includeWithdrawn: false }),
    }))
    .filter((n) => n.candidates.length > 0);
}

export function results(db, round) {
  const counts = db.prepare(
    `SELECT v.candidate_id AS id, COUNT(*) AS votes
     FROM votes v JOIN ballots b ON b.id = v.ballot_id
     WHERE b.round = ? AND v.nomination_id = ?
     GROUP BY v.candidate_id`
  );
  const nominations = listNominations(db)
    .map((n) => ({ ...n, candidates: listCandidates(db, round, n.id) }))
    .filter((n) => n.candidates.length > 0)
    .map((n) => {
    const byId = new Map(counts.all(round, n.id).map((r) => [r.id, r.votes]));
    const rows = n.candidates
      .map((c) => ({ ...c, votes: byId.get(c.id) || 0 }))
      .sort(
        (a, b) =>
          Number(Boolean(a.withdrawnAt)) - Number(Boolean(b.withdrawnAt)) ||
          b.votes - a.votes ||
          a.name.localeCompare(b.name, "ru")
      );
    return { ...n, candidates: undefined, results: rows, skipped: byId.get(null) || 0 };
  });
  const voted = db.prepare("SELECT COUNT(*) AS n FROM ballots WHERE round = ?").get(round).n;
  const voters = db
    .prepare("SELECT COUNT(*) AS n FROM participants WHERE password_hash IS NOT NULL")
    .get().n;
  return { round, nominations, voted, voters };
}

// Топ-3 каждой номинации. При ничьей на последнем месте проходят все с тем же числом голосов.
export function pickFinalists(rows, count = FINALISTS) {
  const withVotes = rows.filter((r) => r.votes > 0 && !r.withdrawnAt);
  if (withVotes.length <= count) return withVotes;
  const threshold = withVotes[count - 1].votes;
  return withVotes.filter((r) => r.votes >= threshold);
}

export function submitBallot(db, participantId, choices) {
  const round = getOpenRound(db);
  if (!round) throw new HttpError(409, "Сейчас голосование закрыто");

  const nominations = ballotForRound(db, round.number);
  const insert = db.transaction(() => {
    const existing = db
      .prepare("SELECT id FROM ballots WHERE round = ? AND participant_id = ?")
      .get(round.number, participantId);
    if (existing) throw new HttpError(409, "Вы уже проголосовали в этом туре");

    const { lastInsertRowid: ballotId } = db
      .prepare("INSERT INTO ballots (round, participant_id) VALUES (?, ?)")
      .run(round.number, participantId);
    const addVote = db.prepare(
      "INSERT INTO votes (ballot_id, nomination_id, candidate_id) VALUES (?, ?, ?)"
    );

    for (const n of nominations) {
      if (!(String(n.id) in choices)) {
        throw new HttpError(400, `Не выбран номинант в номинации «${n.title}»`);
      }
      const choice = choices[n.id];
      if (choice !== null && !n.candidates.some((c) => c.id === Number(choice))) {
        const withdrawn = db
          .prepare(
            `SELECT 1 FROM candidates
             WHERE round = ? AND nomination_id = ? AND participant_id = ?
               AND withdrawn_at IS NOT NULL`
          )
          .get(round.number, n.id, Number(choice));
        if (withdrawn) {
          throw new HttpError(
            409,
            `Выбранный номинант в номинации «${n.title}» снят. Обновите страницу и выберите другого.`
          );
        }
        throw new HttpError(400, `Неверный номинант в номинации «${n.title}»`);
      }
      addVote.run(ballotId, n.id, choice === null ? null : Number(choice));
    }
  });
  insert();
  return round.number;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
