import { SellFlow } from "@/components/sell-flow";
import { bestCentsByMaterial, getBoard } from "@/lib/board";

export const revalidate = 300;

export default async function SellPage() {
  const board = await getBoard();
  return <SellFlow prices={bestCentsByMaterial(board.rows)} source={board.source} />;
}
