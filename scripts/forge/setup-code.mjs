// Reads the code from stdin so it is not retained in shell history or process arguments.
import { createHash } from 'node:crypto';
let value = '';
for await (const chunk of process.stdin) value += chunk;
value = value.trim();
if (value.length < 20 || value.length > 256)
  throw new Error('Use a randomly generated access code of 20–256 characters.');
console.log(createHash('sha256').update(value).digest('hex'));
