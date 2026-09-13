import { archiveHttpBoundary, readArchiveResponse } from '../../../../../lib/party-forge/server/archive-service.ts';
type Context = { params: Promise<{ archiveId: string }> };
export async function GET(request: Request, context: Context) {
  return archiveHttpBoundary(async () => readArchiveResponse(request, (await context.params).archiveId));
}
