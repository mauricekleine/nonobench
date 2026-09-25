import { listFamilies } from "@/lib/data";

export function GET() { return Response.json({ families: listFamilies() }); }
