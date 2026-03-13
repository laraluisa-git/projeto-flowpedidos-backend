import bcrypt from 'bcryptjs';

const pwd = process.argv[2] ?? 'admin123';
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(pwd, salt);
console.log(hash);
