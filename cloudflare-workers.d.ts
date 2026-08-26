// Cloudflare provides this virtual module at Workers runtime.
// Declare it here so Next.js can type-check the shared database helper.
declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
  };
}
