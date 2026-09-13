import {
  createRoomResponse,
  roomHttpBoundary,
} from '../../../../lib/party-forge/server/room-service.ts';

export async function POST(request: Request) {
  return roomHttpBoundary(() => createRoomResponse(request));
}
