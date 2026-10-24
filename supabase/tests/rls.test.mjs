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
  await check("seed: eighteen demo prices", async () => {
    assert.equal(await count("select id from prices"), 18);
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
    assert.equal(await count("select id from prices"), 18);
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

  // Board prices: public without sign-in, latest price per centre and material, no personal data.
  await check("anon can read board prices through the function", async () => {
    await as("anon");
    const board = await rows("select * from board_prices()");
    assert.equal(board.length, 18);
    assert.equal(await count("select id from prices"), 0);
  });
  await check("board prices never include the operator id", async () => {
    await as("anon");
    const [first] = await rows("select * from board_prices() limit 1");
    assert.ok(!("operator_id" in first));
    assert.ok(!("recorded_by" in first));
  });
  await check("board prices show the latest price (operator added PET at Orlando East)", async () => {
    await as("anon");
    const [pet] = await rows(
      "select cents_per_kg from board_prices() where centre_id = $1 and material = 'PET'",
      [ORLANDO],
    );
    assert.equal(pet.cents_per_kg, 395);
  });

  // Recording sales through record_sale(). Only the service role may call it.
  await check("anon and signed-in users cannot call record_sale", async () => {
    await as("anon");
    await assert.rejects(db.query("select public.record_sale('x', $1, $2, 'ccza_r_7Q2KX9', 'CAN_AL', 1000, 1020)", [O1, ORLANDO]));
    await as("authenticated", O1);
    await assert.rejects(db.query("select public.record_sale('x', $1, $2, 'ccza_r_7Q2KX9', 'CAN_AL', 1000, 1020)", [O1, ORLANDO]));
  });

  const recordSale = async (key, operator, centre, qr, material, weight, cents, load = null) => {
    await as("service_role");
    const [row] = await rows(
      "select public.record_sale($1, $2, $3, $4, $5, $6, $7, $8, 25) as r",
      [key, operator, centre, qr, material, weight, cents, load],
    );
    return row.r;
  };

  let happySale;
  await check("a sale is stored with the fee and no flags for a usual reclaimer", async () => {
    happySale = await recordSale("sale-happy-1", O1, ORLANDO, "ccza_r_7Q2KX9", "CAN_AL", 2000, 1020);
    assert.equal(happySale.amount_cents, 2040);
    assert.equal(happySale.service_fee_cents, 50);
    assert.deepEqual(happySale.flags, []);
    assert.equal(happySale.replayed, false);
  });
  await check("replaying the same key returns the same sale", async () => {
    const again = await recordSale("sale-happy-1", O1, ORLANDO, "ccza_r_7Q2KX9", "CAN_AL", 2000, 1020);
    assert.equal(again.transaction_id, happySale.transaction_id);
    assert.equal(again.replayed, true);
  });
  await check("the same key with a different body is refused", async () => {
    await assert.rejects(recordSale("sale-happy-1", O1, ORLANDO, "ccza_r_7Q2KX9", "CAN_AL", 3000, 1020), /IDEMPOTENCY_CONFLICT/);
  });
  await check("every sale queues one demo payout for the full amount, and a replay does not add another", async () => {
    assert.equal(happySale.payout.channel, "ewallet_mock");
    assert.equal(happySale.payout.status, "sent");
    assert.match(happySale.payout.reference, /^PO-[A-Z0-9]{10}$/);
    await db.exec("reset role");
    const rowsFor = await rows("select channel, status, amount_cents, reference from payouts where transaction_id = $1", [happySale.transaction_id]);
    assert.equal(rowsFor.length, 1);
    assert.equal(rowsFor[0].amount_cents, 2040, "the reclaimer gets the full sale amount, not minus the fee");
    assert.equal(rowsFor[0].reference, happySale.payout.reference);
    const again = await recordSale("sale-happy-1", O1, ORLANDO, "ccza_r_7Q2KX9", "CAN_AL", 2000, 1020);
    assert.equal(again.payout.reference, happySale.payout.reference);
    await db.exec("reset role");
    assert.equal(await count(`select 1 from payouts where transaction_id = '${happySale.transaction_id}'`), 1);
  });
  await check("a reclaimer sees the payout for their own sale and nobody else's", async () => {
    await as("authenticated", R1);
    assert.equal(await count(`select 1 from payouts where transaction_id = '${happySale.transaction_id}'`), 1);
    await as("authenticated", R2);
    assert.equal(await count(`select 1 from payouts where transaction_id = '${happySale.transaction_id}'`), 0);
    await as("authenticated", R1);
    await db.query("update payouts set status = 'failed'");
    await db.exec("reset role");
    assert.equal((await rows(`select status from payouts where transaction_id = '${happySale.transaction_id}'`))[0].status, "sent");
  });
  await check("only an operator can set a SAWPRS status, and a registered status needs a reference", async () => {
    await as("authenticated", O1);
    await db.query("select public.set_sawprs_status('ccza_r_7Q2KX9', 'pending', null)");
    assert.equal((await rows("select sawprs_status from lookup_reclaimer('ccza_r_7Q2KX9')"))[0].sawprs_status, "pending");
    await assert.rejects(db.query("select public.set_sawprs_status('ccza_r_7Q2KX9', 'registered', null)"), /REF_REQUIRED/);
    await assert.rejects(db.query("select public.set_sawprs_status('ccza_r_7Q2KX9', 'approved', 'X1')"), /BAD_STATUS/);
    await assert.rejects(db.query("select public.set_sawprs_status('ccza_r_NOBODY', 'pending', null)"), /UNKNOWN_CODE/);
    await db.query("select public.set_sawprs_status('ccza_r_7Q2KX9', 'registered', 'SAWPRS-12345')");
    const [found] = await rows("select * from lookup_reclaimer('ccza_r_7Q2KX9')");
    assert.deepEqual({ s: found.sawprs_status, r: found.sawprs_ref }, { s: "registered", r: "SAWPRS-12345" });
    await db.query("select public.set_sawprs_status('ccza_r_7Q2KX9', 'unknown', 'ignored')");
    const [reset] = await rows("select * from lookup_reclaimer('ccza_r_7Q2KX9')");
    assert.deepEqual({ s: reset.sawprs_status, r: reset.sawprs_ref }, { s: "unknown", r: null });
    await as("authenticated", R1);
    await assert.rejects(db.query("select public.set_sawprs_status('ccza_r_7Q2KX9', 'registered', 'X')"), /ROLE_NOT_ALLOWED/);
    await assert.rejects(db.query("update reclaimers set sawprs_status = 'registered', sawprs_ref = 'X' where profile_id = '" + R1 + "'"), /SAWPRS_LOCKED/);
    await db.query("update reclaimers set age_band = '35+' where profile_id = '" + R1 + "'");
    await as("anon");
    await assert.rejects(db.query("select public.set_sawprs_status('ccza_r_7Q2KX9', 'registered', 'X')"));
  });
  await check("an unknown reclaimer code is refused", async () => {
    await assert.rejects(recordSale("sale-unknown-1", O1, ORLANDO, "ccza_r_NOBODY", "CAN_AL", 1000, 1020), /UNKNOWN_CODE/);
  });
  await check("an operator cannot record a sale at another centre", async () => {
    await assert.rejects(recordSale("sale-wrong-centre", O1, KLIPSPRUIT, "ccza_r_7Q2KX9", "CAN_AL", 1000, 1020), /NOT_OPERATOR/);
  });
  await check("a first sale outside the reclaimer's home area is flagged and stored as an anomaly", async () => {
    const sale = await recordSale("sale-first-outside", O1, ORLANDO, "ccza_r_OTHER01", "CAN_AL", 1000, 1020);
    assert.deepEqual(sale.flags, ["first sale at a centre outside home area"]);
    await db.exec("reset role");
    assert.equal(await count("select id from anomalies where transaction_id = '" + sale.transaction_id + "'"), 1);
  });
  await check("a load far above the reclaimer's usual weight is flagged", async () => {
    await db.exec("reset role");
    // Four earlier sales of 1 kg for the Alexandra reclaimer, plus their existing 10 kg sale.
    for (let i = 1; i <= 4; i++) {
      await db.query(
        "insert into transactions (reclaimer_id, centre_id, material, weight_g, cents_per_kg, recorded_by, idempotency_key) values ($1, $2, 'PET', 1000, 365, $3, $4)",
        [R2, ALEXANDRA, O1, "hist-r2-" + i],
      );
    }
    const sale = await recordSale("sale-heavy-r2", O1, ORLANDO, "ccza_r_OTHER01", "CAN_AL", 300000, 1020);
    assert.ok(sale.flags.includes("weight over 3x 30-day 95th percentile"), JSON.stringify(sale.flags));
  });
  await check("a photo that matches an earlier load is flagged", async () => {
    await db.exec("reset role");
    // Same hash as the Orlando reclaimer's existing load, which is in the 30-day window.
    await db.query(
      "insert into loads (id, reclaimer_id, photo_path, dhash) values ('50000000-0000-4000-8000-000000000001', $1, 'loads/r2/dup.jpg', repeat('0', 64)::bit(64))",
      [R2],
    );
    const sale = await recordSale("sale-dup-photo", O1, ORLANDO, "ccza_r_OTHER01", "CAN_AL", 1000, 1020, "50000000-0000-4000-8000-000000000001");
    assert.ok(sale.flags.includes("photo matches an earlier load"), JSON.stringify(sale.flags));
  });
  await check("a load belonging to another reclaimer is refused", async () => {
    await assert.rejects(
      recordSale("sale-bad-load", O1, ORLANDO, "ccza_r_7Q2KX9", "CAN_AL", 1000, 1020, "50000000-0000-4000-8000-000000000001"),
      /UNKNOWN_LOAD/,
    );
  });
  await check("record_sale writes an audit row", async () => {
    await db.exec("reset role");
    assert.ok((await count("select id from audit_log where action = 'record_sale'")) >= 1);
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
  // ---- MVP: registration, lookup, marketplace, PRO overview (migration 0005) ----
  const N1 = "70000000-0000-4000-8000-000000000001"; // new reclaimer registering through the function
  const B1 = "60000000-0000-4000-8000-000000000001"; // tavern owner
  await db.exec("reset role");
  await db.exec(`insert into auth.users (id) values ('${N1}'), ('${B1}')`);

  await check("register_reclaimer creates the profile and a code, and is idempotent", async () => {
    await as("authenticated", N1);
    const [first] = await rows("select public.register_reclaimer('Sipho', 'Diepkloof', '18-24') as token");
    assert.match(first.token, /^ccza_r_[A-Z0-9]{8}$/);
    const [second] = await rows("select public.register_reclaimer('Sipho M', 'Diepkloof', null) as token");
    assert.equal(second.token, first.token);
    const [me] = await rows("select p.display_name, p.role, r.area_id, r.age_band from profiles p join reclaimers r on r.profile_id = p.id");
    assert.deepEqual({ ...me }, { display_name: "Sipho M", role: "reclaimer", area_id: "diepkloof", age_band: "18-24" });
  });
  await check("register_reclaimer refuses bad input, other roles and anonymous callers", async () => {
    await as("authenticated", N1);
    await assert.rejects(db.query("select public.register_reclaimer('X', 'Diepkloof', '99-100')"), /BAD_AGE_BAND/);
    await assert.rejects(db.query("select public.register_reclaimer('', 'Diepkloof', null)"), /BAD_NAME/);
    await as("authenticated", O1);
    await assert.rejects(db.query("select public.register_reclaimer('Op', 'Orlando', null)"), /ROLE_LOCKED/);
    await as("anon");
    await assert.rejects(db.query("select public.register_reclaimer('A', 'Orlando', null)"));
  });
  await check("nobody can create an operator or PRO profile through the API", async () => {
    await db.exec("reset role");
    await db.exec("insert into auth.users (id) values ('70000000-0000-4000-8000-000000000009') on conflict do nothing");
    await as("authenticated", "70000000-0000-4000-8000-000000000009");
    await assert.rejects(db.query("insert into profiles (id, role, display_name) values ('70000000-0000-4000-8000-000000000009', 'operator', 'Fake')"));
    await assert.rejects(db.query("insert into profiles (id, role, display_name) values ('70000000-0000-4000-8000-000000000009', 'pro', 'Fake')"));
  });
  await check("lookup_reclaimer works for operators only", async () => {
    await as("authenticated", O1);
    const found = await rows("select * from lookup_reclaimer('ccza_r_7Q2KX9')");
    assert.equal(found.length, 1);
    assert.equal(found[0].display_name, "Thandi");
    assert.equal((await rows("select * from lookup_reclaimer('ccza_r_NOBODY')")).length, 0);
    await as("authenticated", R2);
    assert.equal((await rows("select * from lookup_reclaimer('ccza_r_7Q2KX9')")).length, 0);
    await as("anon");
    await assert.rejects(db.query("select * from lookup_reclaimer('ccza_r_7Q2KX9')"));
  });

  await check("a business can register and post material for sale, and the map shows it snapped", async () => {
    await as("authenticated", B1);
    await db.query("select public.register_business('Mama Joy''s Tavern', 'Orlando West')");
    const [post] = await rows(
      "select public.create_market_post('sell', 'Mama Joy''s Tavern', 'CAN_AL', 40, null, 'Orlando West', -26.24671, 27.91234, 'Cans, ready after 16:00') as id",
    );
    assert.ok(post.id);
    await as("anon");
    const points = await rows("select * from market_points()");
    const mine = points.find((p) => p.source === "post");
    assert.ok(mine, "post appears on the map");
    assert.equal(mine.name, "Mama Joy's Tavern");
    assert.notEqual(Number(mine.lat), -26.24671, "latitude is snapped");
    assert.ok(Math.abs(Number(mine.lat) - -26.24671) <= 0.0025);
    assert.equal(points.filter((p) => p.source === "centre").length, 18);
  });
  await check("market posts are private rows: others cannot read or change them", async () => {
    await as("authenticated", B1);
    assert.equal(await count("select id from market_posts"), 1);
    await as("authenticated", R1);
    assert.equal(await count("select id from market_posts"), 0);
    await db.query("update market_posts set status = 'closed'");
    await as("authenticated", B1);
    assert.equal((await rows("select status from market_posts"))[0].status, "open");
  });
  await check("closing a post removes it from the map", async () => {
    await as("authenticated", B1);
    await db.query("update market_posts set status = 'closed'");
    await as("anon");
    assert.equal((await rows("select * from market_points()")).filter((p) => p.source === "post").length, 0);
  });
  await check("posting needs a valid place and is limited to 20 open posts", async () => {
    await as("authenticated", B1);
    await assert.rejects(
      db.query("select public.create_market_post('sell', 'T', 'PET', 10, null, 'Orlando', 10.0, 10.0)"),
      /BAD_LOCATION/,
    );
    for (let i = 0; i < 20; i++) {
      await db.query("select public.create_market_post('sell', 'T', 'PET', 10, null, 'Orlando', -26.2, 27.9)");
    }
    await assert.rejects(db.query("select public.create_market_post('sell', 'T', 'PET', 10, null, 'Orlando', -26.2, 27.9)"), /TOO_MANY_POSTS/);
    await as("anon");
    await assert.rejects(db.query("select public.create_market_post('sell', 'T', 'PET', 10, null, 'Orlando', -26.2, 27.9)"));
  });
  await check("pro_overview returns totals to a PRO analyst and nothing to anyone else", async () => {
    await as("authenticated", P1);
    const [o] = await rows("select * from pro_overview()");
    assert.ok(Number(o.registered) >= 3);
    assert.ok(Number(o.tonnes_30d) >= 0);
    await as("authenticated", R1);
    assert.equal((await rows("select * from pro_overview()")).length, 0);
    await as("anon");
    await assert.rejects(db.query("select * from pro_overview()"));
  });

  // ---- Registration race (migration 0006) and electronics (migration 0007) ----
  const E1 = "80000000-0000-4000-8000-000000000001"; // has a profile but no reclaimers row yet (the half-finished registration)
  const E2 = "80000000-0000-4000-8000-000000000002"; // second seller
  await db.exec("reset role");
  await db.exec(`insert into auth.users (id) values ('${E1}'), ('${E2}')`);
  await db.exec(`insert into profiles (id, role, display_name) values ('${E1}', 'reclaimer', 'Half done'), ('${E2}', 'reclaimer', 'Seller Two')`);

  await check("register_reclaimer finishes a half-made registration instead of looping", async () => {
    await as("authenticated", E1);
    const [first] = await rows("select public.register_reclaimer('Half done', 'Meadowlands', '25-34') as token");
    assert.match(first.token, /^ccza_r_[A-Z0-9]{8}$/);
    const [again] = await rows("select public.register_reclaimer('Half done', 'Meadowlands', null) as token");
    assert.equal(again.token, first.token);
    assert.equal(await count("select 1 from reclaimers where profile_id = '" + E1 + "'"), 1);
  });

  await check("e-waste places are public to read and closed to every writer", async () => {
    await as("anon");
    const places = await rows("select id, confidence, source_url, checked_on from ewaste_points");
    assert.equal(places.length, 8);
    assert.ok(places.every((p) => p.source_url.startsWith("https://") && p.checked_on));
    await assert.rejects(db.query("insert into ewaste_points (id, name, kind, area_label, lat, lng, source_url, checked_on) values ('fake-place', 'Fake', 'buyer', 'Soweto', -26.2, 27.9, 'https://example.com', now())"));
    await as("authenticated", B1);
    await assert.rejects(db.query("insert into ewaste_points (id, name, kind, area_label, lat, lng, source_url, checked_on) values ('fake-place', 'Fake', 'buyer', 'Soweto', -26.2, 27.9, 'https://example.com', now())"));
    await db.query("update ewaste_points set name = 'Hacked'");
    await db.query("delete from ewaste_points");
    await db.exec("reset role");
    assert.equal(await count("select 1 from ewaste_points where name = 'Hacked'"), 0);
    assert.equal(await count("select 1 from ewaste_points"), 8);
  });
  await check("e-waste places keep inactive rows hidden and reject bad categories", async () => {
    await db.exec("reset role");
    await db.exec("update ewaste_points set active = false where id = 'pnp-fourways'");
    await as("anon");
    assert.equal(await count("select 1 from ewaste_points"), 7);
    await db.exec("reset role");
    await db.exec("update ewaste_points set active = true where id = 'pnp-fourways'");
    await assert.rejects(db.query("update ewaste_points set accepts = array['nuclear'] where id = 'pnp-fourways'"));
  });

  let phoneId;
  await check("a signed-in person can list a phone for sale, and the public list hides the number and snaps the place", async () => {
    await as("authenticated", E2);
    const [post] = await rows(
      "select public.create_ewaste_post('sell', 'phone', 'Samsung A12, cracked screen', 'repair', 15000, 'Seller Two', '082 555 0101', 'Diepkloof', -26.24671, 27.93234, 'Charger included') as id",
    );
    phoneId = post.id;
    await as("anon");
    const list = await rows("select * from ewaste_listings()");
    assert.equal(list.length, 1);
    assert.equal(list[0].title, "Samsung A12, cracked screen");
    assert.equal(list[0].price_cents, 15000);
    assert.ok(!("contact" in list[0]), "contact is not in the public list");
    assert.notEqual(Number(list[0].lat), -26.24671, "latitude is snapped");
    assert.ok(Math.abs(Number(list[0].lat) - -26.24671) <= 0.0025);
  });
  await check("the poster's number is shown to signed-in people only", async () => {
    await as("authenticated", R1);
    const [c] = await rows("select public.ewaste_contact($1) as contact", [phoneId]);
    assert.equal(c.contact, "082 555 0101");
    await as("anon");
    await assert.rejects(db.query("select public.ewaste_contact($1)", [phoneId]));
    await as("authenticated", R1);
    assert.equal(await count("select 1 from ewaste_posts"), 0, "other people cannot read the table");
  });
  await check("e-waste listings refuse bad numbers, free items with a price, and non-owners' edits", async () => {
    await as("authenticated", E2);
    await assert.rejects(db.query("select public.create_ewaste_post('sell', 'tv', 'TV', 'works', 100000, 'S', 'not a number', 'Diepkloof', -26.2, 27.9)"), /BAD_CONTACT/);
    await assert.rejects(db.query("select public.create_ewaste_post('give', 'tv', 'TV', 'works', 5000, 'S', '082 555 0101', 'Diepkloof', -26.2, 27.9)"), /GIVE_IS_FREE/);
    await assert.rejects(db.query("select public.create_ewaste_post('sell', 'tv', 'TV', 'works', 100000, 'S', '082 555 0101', 'Diepkloof', 10.0, 10.0)"), /BAD_LOCATION/);
    await assert.rejects(db.query("select public.create_ewaste_post('sell', 'toaster-oven', 'TV', 'works', 100000, 'S', '082 555 0101', 'Diepkloof', -26.2, 27.9)"));
    await as("authenticated", R1);
    await db.query("update ewaste_posts set status = 'closed'");
    await as("authenticated", E2);
    assert.equal((await rows("select status from ewaste_posts"))[0].status, "open");
  });
  await check("giving away stores a zero price, and closing a listing removes it from the list", async () => {
    await as("authenticated", E2);
    await db.query("select public.create_ewaste_post('give', 'cables', 'Box of phone chargers', 'works', null, 'Seller Two', '082 555 0101', 'Diepkloof', -26.2, 27.9)");
    await as("anon");
    assert.equal((await rows("select price_cents from ewaste_listings() where kind = 'give'"))[0].price_cents, 0);
    await as("authenticated", E2);
    await db.query("update ewaste_posts set status = 'closed'");
    await as("anon");
    assert.equal(await count("select 1 from ewaste_listings()"), 0);
    await as("authenticated", E2);
    assert.equal((await rows("select public.ewaste_contact($1) as contact", [phoneId]))[0].contact, null);
  });
  await check("electronics listings are limited to 10 open per person, and need a role that may post", async () => {
    await as("authenticated", E2);
    for (let i = 0; i < 10; i++) {
      await db.query("select public.create_ewaste_post('sell', 'other', 'Item', 'parts', 1000, 'S', '082 555 0101', 'Diepkloof', -26.2, 27.9)");
    }
    await assert.rejects(db.query("select public.create_ewaste_post('sell', 'other', 'Item', 'parts', 1000, 'S', '082 555 0101', 'Diepkloof', -26.2, 27.9)"), /TOO_MANY_POSTS/);
    await as("authenticated", P1);
    await assert.rejects(db.query("select public.create_ewaste_post('sell', 'other', 'Item', 'parts', 1000, 'S', '082 555 0101', 'Diepkloof', -26.2, 27.9)"), /ROLE_NOT_ALLOWED/);
    await as("anon");
    await assert.rejects(db.query("select public.create_ewaste_post('sell', 'other', 'Item', 'parts', 1000, 'S', '082 555 0101', 'Diepkloof', -26.2, 27.9)"));
  });

  await db.exec("reset role");

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
