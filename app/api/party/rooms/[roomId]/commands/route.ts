import {
  commandRoomResponse,
  roomHttpBoundary,
} from '../../../../../../lib/party-forge/server/room-service.ts';

type Context = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, context: Context) {
  return roomHttpBoundary(async () =>
    commandRoomResponse(request, (await context.params).roomId),
  );
}
