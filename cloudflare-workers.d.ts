// Cloudflare provides this virtual module at Workers runtime.
// Keep the shared database helper type-checkable in Next.js as well.
declare module "cloudflare:workers" {
  export const env: Record<string, any>;
}
