import Client from "./view";

export default function MarketPage({ params }: { params: { slug: string } }) {
  return <Client slug={decodeURIComponent(params.slug)} />;
}
