// Database tests for the ComeCollectZA schema.
//
// Runs the real migration and seed against PostgreSQL 17 (PGlite, with PostGIS), then checks
// row level security for each role and the table constraints. It stubs the parts of Supabase
// that are not Postgres itself: the anon, authenticated and service_role roles, the auth schema,
// and auth.uid(). Run with: npm run test:db
//
// Limits: this is not a Supabase project. Check the migration once against a real project too.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";

const here = dirname(fileURLToPath(import.meta.url));
// Every migration in order. MIGRATION_FILE replaces the first one, so the negative check can
// run the suite against a deliberately broken copy.
const migrationsDir = join(here, "..", "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f, i) => (i === 0 && process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : readFileSync(join(migrationsDir, f), "utf8")));
const seed = readFileSync(join(here, "..", "seed.sql"), "utf8");

// Fixed test identities.
const R1 = "10000000-0000-4000-8000-000000000001"; // reclaimer, Orlando East
const R2 = "10000000-0000-4000-8000-000000000002"; // reclaimer, Alexandra
const O1 = "20000000-0000-4000-8000-000000000001"; // operator, Orlando East
const O2 = "20000000-0000-4000-8000-000000000002"; // operator, Klipspruit
const P1 = "30000000-0000-4000-8000-000000000001"; // PRO analyst

const ORLANDO = "11111111-1111-4111-8111-111111111111";
const KLIPSPRUIT = "22222222-2222-4222-8222-222222222222";
const ALEXANDRA = "33333333-3333-4333-8333-333333333333";

const db = new PGlite({ extensions: { postgis } });
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, error: err.message });
  }
}

// Switch the connection to a Supabase-style role, with the signed-in user set as auth.uid().
async function as(role, uid = null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  await db.exec(`set role ${role}`);
}

async function rows(sql, params = []) {
  return (await db.query(sql, params)).rows;
}

async function count(sql, params = []) {
  return Number((await rows(`select count(*)::int as n from (${sql}) q`, params))[0].n);
}

async function setup() {
  // Supabase roles and the auth schema that Supabase provides.
  await db.exec(`
    do $$ begin
      if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
      if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);

  for (const sql of migrations) {
    await db.exec(sql);
  }

  // Supabase grants table access to these roles by default. RLS decides what each one sees.
  await db.exec(`
    grant usage on schema public to anon, authenticated, service_role;
    grant all on all tables in schema public to anon, authenticated, service_role;
    grant all on all sequences in schema public to anon, authenticated, service_role;
  `);

  await db.exec(seed);

  // Test users, profiles and related rows. Setup runs as the superuser, which bypasses RLS.
  await db.exec(`
    insert into auth.users (id) values ('${R1}'), ('${R2}'), ('${O1}'), ('${O2}'), ('${P1}');
    insert into profiles (id, role, display_name) values
      ('${R1}', 'reclaimer', 'Thandi'),
      ('${R2}', 'reclaimer', 'Other reclaimer'),
      ('${O1}', 'operator', 'Operator Orlando'),
      ('${O2}', 'operator', 'Operator Klipspruit'),
      ('${P1}', 'pro', 'PRO analyst');
    insert into reclaimers (profile_id, area_id, qr_token) values
      ('${R1}', 'orlando-east', 'ccza_r_7Q2KX9'),
      ('${R2}', 'alexandra', 'ccza_r_OTHER01');
    update centres set operator_id = '${O1}' where id = '${ORLANDO}';
    update centres set operator_id = '${O2}' where id = '${KLIPSPRUIT}';
    insert into loads (reclaimer_id, photo_path, dhash) values
      ('${R1}', 'loads/r1/a.jpg', repeat('0', 64)::bit(64)),
      ('${R2}', 'loads/r2/a.jpg', repeat('1', 64)::bit(64));
    insert into transactions (id, reclaimer_id, centre_id, material, weight_g, cents_per_kg, recorded_by, idempotency_key) values
      ('40000000-0000-4000-8000-000000000001', '${R1}', '${ORLANDO}', 'CAN_AL', 6400, 1020, '${O1}', 'key-t1'),
      ('40000000-0000-4000-8000-000000000002', '${R2}', '${ALEXANDRA}', 'PET', 10000, 365, '${O1}', 'key-t2'),
      ('40000000-0000-4000-8000-000000000003', '${R1}', '${KLIPSPRUIT}', 'CARDBOARD', 25000, 85, '${O2}', 'key-t3');
    insert into service_fees (transaction_id, cents, rate_cents_per_kg, status) values
      ('40000000-0000-4000-8000-000000000001', 160, 25, 'owed'),
      ('40000000-0000-4000-8000-000000000002', 250, 25, 'owed'),
      ('40000000-0000-4000-8000-000000000003', 625, 25, 'paid');
    insert into payouts (reclaimer_id, transaction_id, channel, reference, amount_cents, status) values
      ('${R1}', '40000000-0000-4000-8000-000000000001', 'ewallet_mock', 'PO-T1', 6400, 'sent'),
      ('${R2}', '40000000-0000-4000-8000-000000000002', 'ewallet_mock', 'PO-T2', 3650, 'sent');
    insert into anomalies (transaction_id, source, score, reasons) values
      ('40000000-0000-4000-8000-000000000001', 'rule', 0.9, array['weight over 3x 30-day high']);
    insert into audit_log (actor, action, target) values ('${O1}', 'setup', 'test');
  `);
}

async function runTests() {
  // Seed sanity.
  await check("seed: three demo centres", async () => {
    assert.equal(await count("select id from centres"), 3);
  });
  await check("seed: twelve demo prices", async () => {
    assert.equal(await count("select id from prices"), 12);
  });
  await check("seed: seven materials", async () => {
    assert.equal(await count("select code from materials"), 7);
  });

  // Anonymous visitors see nothing.
  await check("anon sees no profiles", async () => {
    await as("anon");
    assert.equal(await count("select id from profiles"), 0);
  });
  await check("anon sees no centres", async () => {
    await as("anon");
    assert.equal(await count("select id from centres"), 0);
  });
  await check("anon sees no transactions", async () => {
    await as("anon");
    assert.equal(await count("select id from transactions"), 0);
  });

  // Reclaimer R1.
  await check("reclaimer sees only their own profile", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select id from profiles"), 1);
    assert.equal(await count("select id from profiles where id = '" + R2 + "'"), 0);
  });
  await check("reclaimer can read centres, materials and prices", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select id from centres"), 3);
    assert.equal(await count("select code from materials"), 7);
    assert.equal(await count("select id from prices"), 12);
  });
  await check("reclaimer sees only their own transactions", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select id from transactions"), 2);
    assert.equal(await count("select id from transactions where reclaimer_id = '" + R2 + "'"), 0);
  });
  await check("reclaimer sees only their own service fees", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select id from service_fees"), 2);
  });
  await check("reclaimer sees only their own payouts", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select id from payouts"), 1);
  });
  await check("reclaimer sees only their own loads", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select id from loads"), 1);
  });
  await check("reclaimer sees only their own reclaimer record", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select profile_id from reclaimers"), 1);
  });
  await check("reclaimer cannot read anomalies", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select id from anomalies"), 0);
  });
  await check("reclaimer cannot read audit_log", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select id from audit_log"), 0);
  });
  await check("reclaimer cannot insert a sale directly", async () => {
    await as("authenticated", R1);
    await assert.rejects(
      db.query(
        "insert into transactions (reclaimer_id, centre_id, material, weight_g, cents_per_kg, recorded_by, idempotency_key) values ($1, $2, 'PET', 1000, 380, $1, 'forged-1')",
        [R1, ORLANDO],
      ),
    );
  });
  await check("reclaimer cannot add a price at a centre", async () => {
    await as("authenticated", R1);
    await assert.rejects(
      db.query("insert into prices (centre_id, material, cents_per_kg) values ($1, 'PET', 999)", [ORLANDO]),
    );
  });
  await check("reclaimer cannot take over a centre", async () => {
    await as("authenticated", R1);
    const res = await db.query("update centres set operator_id = $1 where id = $2", [R1, ORLANDO]);
    assert.equal(res.affectedRows, 0);
  });
  await check("reclaimer cannot promote their own role", async () => {
    await as("authenticated", R1);
    await assert.rejects(db.query("update profiles set role = 'operator' where id = $1", [R1]));
  });
  await check("reclaimer cannot read the PRO summary", async () => {
    await as("authenticated", R1);
    assert.equal(await count("select * from pro_material_summary('2000-01-01', '2100-01-01')"), 0);
  });

  // Operator O1 at Orlando East.
  await check("operator sees sales at their own centre only", async () => {
    await as("authenticated", O1);
    const ids = (await rows("select id from transactions")).map((r) => r.id);
    assert.deepEqual(ids, ["40000000-0000-4000-8000-000000000001"]);
  });
  await check("operator sees fees for their own centre only", async () => {
    await as("authenticated", O1);
    assert.equal(await count("select id from service_fees"), 1);
  });
  await check("operator cannot read reclaimer records directly", async () => {
    await as("authenticated", O1);
    assert.equal(await count("select profile_id from reclaimers"), 0);
  });
  await check("operator can add a price at their own centre", async () => {
    await as("authenticated", O1);
    const res = await db.query("insert into prices (centre_id, material, cents_per_kg) values ($1, 'PET', 395)", [ORLANDO]);
    assert.equal(res.affectedRows, 1);
  });
  await check("operator cannot add a price at another centre", async () => {
    await as("authenticated", O1);
    await assert.rejects(
      db.query("insert into prices (centre_id, material, cents_per_kg) values ($1, 'PET', 999)", [KLIPSPRUIT]),
    );
  });
  await check("operator cannot read anomalies", async () => {
    await as("authenticated", O1);
    assert.equal(await count("select id from anomalies"), 0);
  });

  // PRO analyst P1.
  await check("PRO sees no individual sales", async () => {
    await as("authenticated", P1);
    assert.equal(await count("select id from transactions"), 0);
  });
  await check("PRO sees no individual reclaimer records", async () => {
    await as("authenticated", P1);
    assert.equal(await count("select profile_id from reclaimers"), 0);
  });
  await check("PRO sees anomalies and can clear one", async () => {
    await as("authenticated", P1);
    assert.equal(await count("select id from anomalies"), 1);
    const res = await db.query("update anomalies set status = 'cleared' where status = 'open'");
    assert.equal(res.affectedRows, 1);
  });
  await check("PRO summary returns aggregates by material and area", async () => {
    await as("authenticated", P1);
    const summary = await rows("select material, area_id, kg, sales, value_cents from pro_material_summary('2000-01-01', '2100-01-01') order by material, area_id");
    assert.equal(summary.length, 3);
    const canRow = summary.find((r) => r.material === "CAN_AL");
    assert.equal(canRow.area_id, "orlando-east");
    assert.equal(Number(canRow.kg), 6.4);
    assert.equal(Number(canRow.sales), 1);
    assert.equal(Number(canRow.value_cents), 6528);
    assert.ok(!("reclaimer_id" in canRow), "summary must not expose reclaimer ids");
  });
  await check("PRO cannot read the audit log", async () => {
    await as("authenticated", P1);
    assert.equal(await count("select id from audit_log"), 0);
  });

  // Function execution rights.
  await check("anon cannot run the PRO summary", async () => {
    await as("anon");
    await assert.rejects(db.query("select * from pro_material_summary('2000-01-01', '2100-01-01')"));
  });

  // Constraints and generated values, as the superuser.
  await db.exec("reset role");
  await check("sale amount is generated as weight x price / 1000", async () => {
    const [row] = await rows("select amount_cents from transactions where id = '40000000-0000-4000-8000-000000000001'");
    assert.equal(row.amount_cents, 6528);
  });
  await check("sale weight must be positive", async () => {
    await assert.rejects(
      db.query("insert into transactions (reclaimer_id, centre_id, material, weight_g, cents_per_kg, recorded_by, idempotency_key) values ($1, $2, 'PET', 0, 380, $1, 'bad-weight')", [R1, ORLANDO]),
    );
  });
  await check("price must be positive", async () => {
    await assert.rejects(db.query("insert into prices (centre_id, material, cents_per_kg) values ($1, 'PET', 0)", [ORLANDO]));
  });
  await check("idempotency key is unique", async () => {
    await assert.rejects(
      db.query("insert into transactions (reclaimer_id, centre_id, material, weight_g, cents_per_kg, recorded_by, idempotency_key) values ($1, $2, 'PET', 1000, 380, $1, 'key-t1')", [R1, ORLANDO]),
    );
  });
  await check("profile role must be a known role", async () => {
    await assert.rejects(db.query("insert into profiles (id, role, display_name) values ('50000000-0000-4000-8000-000000000001', 'admin', 'Nobody')"));
  });
  await check("fee status must be owed, paid or missing", async () => {
    await assert.rejects(
      db.query("insert into service_fees (transaction_id, cents, rate_cents_per_kg, status) values ('40000000-0000-4000-8000-000000000001', 1, 1, 'maybe')"),
    );
  });
  await check("dHash duplicate check: identical hashes are at distance 0, opposite hashes at 64", async () => {
    const [row] = await rows("select bit_count(repeat('0', 64)::bit(64) # repeat('0', 64)::bit(64)) as same, bit_count(repeat('0', 64)::bit(64) # repeat('1', 64)::bit(64)) as opposite");
    assert.equal(Number(row.same), 0);
    assert.equal(Number(row.opposite), 64);
  });
  await check("nearest centre query works with PostGIS", async () => {
    const near = await rows(
      "select name from centres where extensions.st_dwithin(location, extensions.st_setsrid(extensions.st_makepoint(27.9100, -26.2485), 4326)::extensions.geography, 5000)",
    );
    assert.ok(near.some((r) => r.name === "Demo Centre Orlando East"));
  });
}

try {
  await setup();
  await runTests();
} catch (err) {
  results.push({ name: "setup", ok: false, error: err.message });
} finally {
  await db.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log((r.ok ? "PASS " : "FAIL ") + r.name + (r.ok ? "" : "\n     " + r.error));
}
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed.`);
process.exit(failed.length ? 1 : 0);
