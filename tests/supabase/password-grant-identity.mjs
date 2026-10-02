export function assertPasswordGrantIdentity(tokenBody, identity) {
  if (tokenBody.user?.id !== identity.id) {
    throw new Error("Local synthetic Auth password-token identity mismatch.");
  }
}
