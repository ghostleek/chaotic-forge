import { Lobby } from '../../../components/party-forge/lobby';
export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(roomId))
    return <main>Invalid room invitation.</main>;
  return <Lobby key={roomId} roomId={roomId} />;
}
