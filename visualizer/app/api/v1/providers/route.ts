import { listProviders } from "@/lib/data";

export function GET() { return Response.json({ providers: listProviders() }); }
