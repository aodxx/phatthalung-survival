import { createClient } from "@supabase/supabase-js";
import { randomUUID, createHash } from "node:crypto";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const tag =
  process.env.TEST_FIXTURE_TAG ||
  `TEST_RUN_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}`;
const fixtureZoneCodes = ["TEST_ZONE_A", "TEST_ZONE_B"];

if (!url || !serviceKey || !anonKey) {
  throw new Error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and VITE_SUPABASE_ANON_KEY are required"
  );
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const created = {
  users: [],
  zones: [],
  teams: [],
  requests: [],
  incidents: [],
  missions: [],
};

function assertOk(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function createTestUser(role, zoneId) {
  const email = `${tag.toLowerCase()}-${role.toLowerCase()}-${randomUUID().slice(0, 8)}@phatthalung.invalid`;
  const password = `TestOnly-${randomUUID()}-Aa1!`;
  const createdUser = assertOk(
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { test_fixture: tag, role_code: role },
    }),
    `create ${role} auth user`
  );
  const user = createdUser.user;
  created.users.push(user.id);
  assertOk(
    await admin.from("user_profiles").upsert(
      {
        id: user.id,
        display_name: `${tag} ${role}`,
        role_code: role,
        zone_id: zoneId,
        active: true,
      },
      { onConflict: "id" }
    ),
    `upsert ${role} profile`
  );
  return { id: user.id, email, password, role, zoneId };
}

async function signIn(user) {
  const result = await anon.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  const session = assertOk(result, `sign in ${user.role}`)?.session;
  if (!session?.access_token)
    throw new Error(`sign in ${user.role}: no access token`);
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function visibleIds(client, table, column = "id") {
  const result = await client.from(table).select(column).limit(50);
  if (result.error) throw new Error(`${table} read: ${result.error.message}`);
  return (result.data ?? []).map(row => row[column]);
}

function includes(ids, id) {
  return ids.includes(id);
}

async function checkedDelete(table, column, values) {
  if (!values.length) return;
  const result = await admin.from(table).delete().in(column, values);
  if (result.error)
    throw new Error(`cleanup ${table}: ${result.error.message}`);
}

async function verifyZeroRows(table, column, values) {
  const result = await admin
    .from(table)
    .select(column, { count: "exact", head: true })
    .in(column, values);
  if (result.error)
    throw new Error(`post-cleanup ${table}: ${result.error.message}`);
  if ((result.count ?? 0) !== 0)
    throw new Error(`post-cleanup ${table}: ${result.count} rows remain`);
}

async function cleanup() {
  await checkedDelete("missions", "id", created.missions);
  await checkedDelete("incidents", "id", created.incidents);
  await checkedDelete("requests", "id", created.requests);
  await checkedDelete("team_members", "team_id", created.teams);
  await checkedDelete("teams", "id", created.teams);
  await checkedDelete("user_profiles", "id", created.users);
  for (const userId of created.users) {
    const result = await admin.auth.admin.deleteUser(userId);
    if (result.error)
      throw new Error(`cleanup auth user ${userId}: ${result.error.message}`);
  }
  await checkedDelete("zones", "id", created.zones);
  await verifyZeroRows("missions", "id", created.missions);
  await verifyZeroRows("incidents", "id", created.incidents);
  await verifyZeroRows("requests", "id", created.requests);
  await verifyZeroRows("team_members", "team_id", created.teams);
  await verifyZeroRows("teams", "id", created.teams);
  await verifyZeroRows("user_profiles", "id", created.users);
  await verifyZeroRows("zones", "id", created.zones);
  for (const userId of created.users) {
    const result = await admin.auth.admin.getUserById(userId);
    if (result.data?.user)
      throw new Error(`post-cleanup auth user ${userId} still exists`);
    if (result.error && result.error.status !== 404)
      throw new Error(
        `post-cleanup auth user ${userId}: ${result.error.message}`
      );
  }
}

const results = {};
try {
  const existingZones = assertOk(
    await admin.from("zones").select("id,code").in("code", fixtureZoneCodes),
    "check exact test zone codes"
  );
  if (existingZones.length) {
    throw new Error(
      `refusing to overwrite existing zone codes: ${existingZones.map(zone => zone.code).join(", ")}`
    );
  }
  const zones = assertOk(
    await admin
      .from("zones")
      .insert([
        { name: "TEST Zone A", code: "TEST_ZONE_A" },
        { name: "TEST Zone B", code: "TEST_ZONE_B" },
      ])
      .select("id,code"),
    "create exact test zones"
  );
  created.zones.push(...zones.map(zone => zone.id));
  const zoneA = zones.find(zone => zone.code.endsWith("_ZONE_A"));
  const zoneB = zones.find(zone => zone.code.endsWith("_ZONE_B"));
  if (!zoneA || !zoneB) throw new Error("test zones were not created");

  const users = {
    admin: await createTestUser("ADMIN", null),
    triageA: await createTestUser("TRIAGE", zoneA.id),
    triageB: await createTestUser("TRIAGE", zoneB.id),
    fieldA: await createTestUser("FIELD", zoneA.id),
    fieldB: await createTestUser("FIELD", zoneB.id),
  };

  const teamA = assertOk(
    await admin
      .from("teams")
      .insert({ name: `${tag} Team A`, team_type: "FIELD", zone_id: zoneA.id })
      .select("id")
      .single(),
    "create team A"
  );
  const teamB = assertOk(
    await admin
      .from("teams")
      .insert({ name: `${tag} Team B`, team_type: "FIELD", zone_id: zoneB.id })
      .select("id")
      .single(),
    "create team B"
  );
  created.teams.push(teamA.id, teamB.id);
  assertOk(
    await admin
      .from("team_members")
      .insert({ team_id: teamA.id, user_id: users.fieldA.id }),
    "assign field A"
  );

  const requestRows = assertOk(
    await admin
      .from("requests")
      .insert([
        {
          case_code: `${tag}-CASE-A`,
          client_request_id: randomUUID(),
          tracking_token_hash: createHash("sha256")
            .update(`${tag}-TOKEN-A`)
            .digest("hex"),
          source: "WEB",
          zone_id: zoneA.id,
          need_types: ["OTHER"],
          description: `${tag} request A`,
        },
        {
          case_code: `${tag}-CASE-B`,
          client_request_id: randomUUID(),
          tracking_token_hash: createHash("sha256")
            .update(`${tag}-TOKEN-B`)
            .digest("hex"),
          source: "WEB",
          zone_id: zoneB.id,
          need_types: ["OTHER"],
          description: `${tag} request B`,
        },
      ])
      .select("id,zone_id"),
    "create requests"
  );
  created.requests.push(...requestRows.map(row => row.id));

  const incidentRows = assertOk(
    await admin
      .from("incidents")
      .insert([
        {
          incident_code: `${tag}-INC-A`,
          title: `${tag} incident A`,
          zone_id: zoneA.id,
          primary_team_id: teamA.id,
        },
        {
          incident_code: `${tag}-INC-B`,
          title: `${tag} incident B`,
          zone_id: zoneB.id,
          primary_team_id: teamB.id,
        },
      ])
      .select("id,zone_id"),
    "create incidents"
  );
  created.incidents.push(...incidentRows.map(row => row.id));
  const missionRows = assertOk(
    await admin
      .from("missions")
      .insert([
        {
          incident_id: incidentRows[0].id,
          team_id: teamA.id,
          objective: `${tag} mission A`,
        },
        {
          incident_id: incidentRows[1].id,
          team_id: teamB.id,
          objective: `${tag} mission B`,
        },
      ])
      .select("id,team_id"),
    "create missions"
  );
  created.missions.push(...missionRows.map(row => row.id));

  const clients = {
    admin: await signIn(users.admin),
    triageA: await signIn(users.triageA),
    triageB: await signIn(users.triageB),
    fieldA: await signIn(users.fieldA),
    fieldB: await signIn(users.fieldB),
  };
  const requestA = requestRows.find(row => row.zone_id === zoneA.id)?.id;
  const requestB = requestRows.find(row => row.zone_id === zoneB.id)?.id;
  const missionA = missionRows.find(row => row.team_id === teamA.id)?.id;
  const missionB = missionRows.find(row => row.team_id === teamB.id)?.id;

  const triageARequests = await visibleIds(clients.triageA, "requests");
  const triageBRequests = await visibleIds(clients.triageB, "requests");
  const adminRequests = await visibleIds(clients.admin, "requests");
  const fieldARequests = await visibleIds(clients.fieldA, "requests");
  const fieldAMissions = await visibleIds(clients.fieldA, "missions");
  const fieldBMissions = await visibleIds(clients.fieldB, "missions");

  results.same_zone =
    includes(triageARequests, requestA) && !includes(triageARequests, requestB);
  results.other_zone =
    includes(triageBRequests, requestB) && !includes(triageBRequests, requestA);
  results.admin =
    includes(adminRequests, requestA) && includes(adminRequests, requestB);
  results.wrong_role = fieldARequests.length === 0;
  results.field_assignment =
    includes(fieldAMissions, missionA) &&
    !includes(fieldAMissions, missionB) &&
    fieldBMissions.length === 0;

  for (const [name, passed] of Object.entries(results)) {
    if (!passed) throw new Error(`RLS assertion failed: ${name}`);
  }
  console.log(
    JSON.stringify({ tag, results, cleanup: "pending-finally" }, null, 2)
  );
} finally {
  await cleanup();
  console.log(
    JSON.stringify({
      tag,
      cleanup: "completed",
      created: Object.fromEntries(
        Object.entries(created).map(([key, values]) => [key, values.length])
      ),
    })
  );
}
