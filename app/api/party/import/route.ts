import { archiveHttpBoundary, importArchiveResponse } from '../../../../lib/party-forge/server/archive-service.ts';
export async function POST(request: Request) { return archiveHttpBoundary(() => importArchiveResponse(request)); }
