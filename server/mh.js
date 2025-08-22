// make-hash.js
const bcrypt = require("bcrypt");
const pwd = process.argv[2];
if (!pwd) {
  console.log("usage: node make-hash.js <password>");
  process.exit(1);
}
bcrypt.hash(pwd, 12).then((h)=>{ console.log(h); });
