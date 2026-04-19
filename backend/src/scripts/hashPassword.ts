/**
 * Utility script to generate a bcrypt hash for SUPER_ADMIN_PASSWORD.
 *
 * Usage:
 *   npx ts-node src/scripts/hashPassword.ts <your-password>
 *
 * Copy the output into your .env as:
 *   SUPER_ADMIN_PASSWORD=$2b$12$...
 */
import bcrypt from "bcrypt";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npx ts-node src/scripts/hashPassword.ts <password>");
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log(
    "\nBcrypt hash (copy this into SUPER_ADMIN_PASSWORD in your .env):\n",
  );
  console.log(hash);
  console.log();
});
