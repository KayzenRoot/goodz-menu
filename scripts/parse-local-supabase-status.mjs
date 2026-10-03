const STATUS_PARSE_ERROR = "Could not read local Supabase status; E2E refuses non-local Auth configuration.";

/** @param {string} output @returns {Record<string, unknown>} */
export function parseLocalSupabaseStatus(output) {
  try {
    const jsonStart = output.indexOf("{");
    if (jsonStart < 0) throw new Error("missing JSON object");

    const value = JSON.parse(output.slice(jsonStart));
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("status JSON must be an object");
    }
    return value;
  } catch {
    throw new Error(STATUS_PARSE_ERROR);
  }
}
