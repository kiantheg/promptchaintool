import { FlavorEditorPage } from "@/components/prompt-chain/flavor-editor-page";

type PageProps = {
  params: Promise<{ flavorId: string }>;
};

export default async function FlavorPage({ params }: PageProps) {
  const { flavorId } = await params;
  return <FlavorEditorPage flavorId={Number(flavorId)} />;
}
