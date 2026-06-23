/**
 * Test stub for `jwks-rsa`. The real package transitively imports the ESM-only
 * `jose` library, which the CommonJS test transform cannot load. e2e tests
 * override the auth guard, so the JWKS key provider is never invoked — this
 * stub just satisfies the import at module-load time.
 */
export const passportJwtSecret = () => () => undefined;
