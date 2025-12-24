import { db } from "./index";

async function seed() {
  await db.execute("select 1");
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));
