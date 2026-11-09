import readXlsxFile from "read-excel-file";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const text = (value) => String(value ?? "").replace(/\u00a0/g, " ").trim();
const header = (value) =>
  text(value)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]/g, "");

const NAME_HEADERS = new Set(["фио", "фамилияимяотчество", "fullname", "name", "сотрудник", "участник"]);
const EMAIL_HEADERS = new Set(["email", "почта", "электроннаяпочта", "emailaddress"]);

export function parseParticipantRows(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("В Excel нет строк");

  let headerRow = -1;
  let nameColumn = -1;
  let emailColumn = -1;
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 10); rowIndex++) {
    const keys = (rows[rowIndex] || []).map(header);
    const possibleName = keys.findIndex((key) => NAME_HEADERS.has(key));
    const possibleEmail = keys.findIndex((key) => EMAIL_HEADERS.has(key));
    if (possibleName >= 0 && possibleEmail >= 0) {
      headerRow = rowIndex;
      nameColumn = possibleName;
      emailColumn = possibleEmail;
      break;
    }
  }
  if (headerRow < 0) {
    throw new Error("Не найдены столбцы «ФИО» и «email»");
  }

  const participants = [];
  const invalidEmails = [];
  const seen = new Map();
  let duplicateCount = 0;
  let skippedEmpty = 0;
  let sourceRows = 0;

  for (const row of rows.slice(headerRow + 1)) {
    const name = text(row?.[nameColumn]);
    const rawEmail = text(row?.[emailColumn]).toLowerCase().replace(/^mailto:/, "");
    if (!name) {
      if ((row || []).some((cell) => text(cell))) skippedEmpty++;
      continue;
    }
    sourceRows++;

    const email = rawEmail && EMAIL_RE.test(rawEmail) ? rawEmail : "";
    if (rawEmail && !email) invalidEmails.push({ name, email: rawEmail });

    const key = email ? `email:${email}` : `name:${name.toLocaleLowerCase("ru-RU")}`;
    const existingIndex = seen.get(key);
    if (existingIndex !== undefined) {
      participants[existingIndex] = { name, email };
      duplicateCount++;
    } else {
      seen.set(key, participants.length);
      participants.push({ name, email });
    }
  }

  if (!participants.length) throw new Error("В Excel не найдено участников");
  const withoutEmail = participants.filter((participant) => !participant.email).length;
  return {
    participants,
    report: {
      sourceRows,
      withEmail: participants.length - withoutEmail,
      withoutEmail,
      invalidEmails,
      duplicateCount,
      skippedEmpty,
    },
  };
}

export async function parseParticipantsXlsx(file) {
  if (!file) throw new Error("Выберите Excel-файл");
  if (!file.name?.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Поддерживаются файлы Excel в формате .xlsx");
  }
  if (file.size > MAX_FILE_SIZE) throw new Error("Excel-файл должен быть не больше 5 МБ");
  return parseParticipantRows(await readXlsxFile(file));
}
