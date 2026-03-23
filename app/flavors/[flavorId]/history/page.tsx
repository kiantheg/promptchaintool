import { FlavorHistoryPage } from "@/components/prompt-chain/flavor-history-page";

type PageProps = {
  params: Promise<{ flavorId: string }>;
};

export default async function FlavorHistoryRoute({ params }: PageProps) {
  const { flavorId } = await params;
  return <FlavorHistoryPage flavorId={Number(flavorId)} />;
}
