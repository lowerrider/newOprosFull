import crypto from "node:crypto";
import bcrypt from "bcryptjs";

// Без похожих символов (0/O, 1/l/I), чтобы пароль было легко перепечатать из письма
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 8) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return result;
}

export const hashPassword = (password) => bcrypt.hashSync(password, 10);
export const checkPassword = (password, hash) =>
  Boolean(hash) && bcrypt.compareSync(password, hash);
