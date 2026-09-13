import { commandRoomResponse, roomHttpBoundary } from '../../../../../../lib/party-forge/server/room-service.ts';
import { roomCommandSchema } from '../../../../../../lib/party-forge/contracts.ts';
import { readRoomJson, RoomHttpError } from '../../../../../../lib/party-forge/server/participants.ts';
type Context = { params: Promise<{ roomId: string }> };
export async function POST(request: Request, context: Context) {
  return roomHttpBoundary(async () => {
    const body = roomCommandSchema.parse(await readRoomJson(request));
    if (body.type !== 'save-game') throw new RoomHttpError(400, 'This endpoint accepts save-game only.');
    const forwarded = new Request(request.url, {method: 'POST', headers: request.headers, body: JSON.stringify(body)});
    return commandRoomResponse(forwarded, (await context.params).roomId);
  });
}
