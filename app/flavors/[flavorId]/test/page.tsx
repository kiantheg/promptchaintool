import { FlavorTestPage } from "@/components/prompt-chain/flavor-test-page";

type PageProps = {
  params: Promise<{ flavorId: string }>;
};

export default async function FlavorTestRoute({ params }: PageProps) {
  const { flavorId } = await params;
  return <FlavorTestPage flavorId={Number(flavorId)} />;
}
