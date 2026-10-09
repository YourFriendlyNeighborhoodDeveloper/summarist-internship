import Player from "@/components/player/Player";

export const metadata = {
  title: "Player",
};

export default async function PlayerPage({ params }) {
  const { id } = await params;
  return <Player id={id} />;
}
