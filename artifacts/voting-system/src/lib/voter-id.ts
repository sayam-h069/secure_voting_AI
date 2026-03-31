export function getVoterId(): string {
  const key = "civic_voter_id";
  let id = localStorage.getItem(key);
  if (!id) {
    // Generate a secure looking 8 character alphanumeric ID
    id = Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem(key, id);
  }
  return id;
}
