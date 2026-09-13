import { Lobby } from '../components/party-forge/lobby';

export const metadata = {
  title: 'Chaotic Forge — Your rules. Our game.',
  description: 'Write one instruction each, generate a pixel game, and compete with a friend. Two players to start; a third is optional.',
};

export default function Home() {
  return <Lobby />;
}
