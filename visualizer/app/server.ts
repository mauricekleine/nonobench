import { env } from "cloudflare:workers";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { handleRequest } from "@/server/site";

export default createServerEntry({
  fetch(request) {
    return handleRequest(request, env, (pageRequest) => handler.fetch(pageRequest));
  },
});
