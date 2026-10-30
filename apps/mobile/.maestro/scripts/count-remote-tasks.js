// Reads the server directly (service role bypasses RLS) to prove the row landed.
// biome-ignore-all lint: Maestro's GraalJS runtime provides `http`, `json` and `output`.
const response = http.get(
  `${SUPABASE_URL}/rest/v1/tasks?select=id&title=eq.${encodeURIComponent(TITLE)}`,
  {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  },
);
output.remoteCount = json(response.body).length;
