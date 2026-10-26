import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default {
  ...defineCloudflareConfig(),
  // Keep the framework build separate so `npm run build` can package the Worker
  // without OpenNext recursively invoking itself.
  buildCommand: "npm run build:next",
};
