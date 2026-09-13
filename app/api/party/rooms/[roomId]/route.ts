import {
  joinRoomResponse,
  readRoomResponse,
  roomHttpBoundary,
} from '../../../../../lib/party-forge/server/room-service.ts';

type Context = { params: Promise<{ roomId: string }> };

export async function GET(request: Request, context: Context) {
  return roomHttpBoundary(async () =>
    readRoomResponse(request, (await context.params).roomId),
  );
}

export async function POST(request: Request, context: Context) {
  return roomHttpBoundary(async () =>
    joinRoomResponse(request, (await context.params).roomId),
  );
}
