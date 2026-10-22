// Crée le premier compte propriétaire :
//   npm run create-owner -- --nom "Fatime" --email "x@y.com" --password "..." [--telephone "..."]
// ou sans arguments (invite interactive).
import readline from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  let nom = arg('nom'), email = arg('email'), password = arg('password'), telephone = arg('telephone');
  if (!nom || !email || !password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    nom ??= await rl.question('Nom : ');
    email ??= await rl.question('E-mail : ');
    password ??= await rl.question('Mot de passe (10 caractères minimum) : ');
    rl.close();
  }
  email = email.trim().toLowerCase();
  if (password.length < 10) throw new Error('Mot de passe trop court (10 caractères minimum).');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('E-mail invalide.');
  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users(nom, email, telephone, password_hash, role) VALUES ($1,$2,$3,$4,'owner')`,
    [nom.trim(), email, telephone ?? null, hash]);
  console.log(`Compte propriétaire créé : ${email}`);
}
main().then(() => pool.end()).catch((e) => { console.error(e.message); process.exit(1); });
