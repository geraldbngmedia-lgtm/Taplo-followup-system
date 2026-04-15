// Dynamic API URL — uses current domain so it works on custom domains too
const API_BASE = window.location.origin;
export const API = `${API_BASE}/api`;
export default API;
