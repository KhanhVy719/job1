export const extractToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) return null;
  const parts = authorizationHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    return parts[1];
  }
  return null;
};