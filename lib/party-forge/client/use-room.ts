'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { RoomClient } from './room-client.ts';

export function useRoom(roomId?: string) {
  const [client] = useState(() => new RoomClient(roomId));
  const state = useSyncExternalStore(
    client.subscribe,
    client.snapshot,
    client.serverSnapshot,
  );
  useEffect(() => {
    client.start(() => sessionStorage);
    return () => client.stop();
  }, [client]);
  return { client, ...state };
}
