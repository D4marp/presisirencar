import { CarDetail } from "@/components/car-detail";
import { cars } from "@/data/cars";

// Mobil yang sudah ada dirender statis (cepat dan SEO); mobil baru dari dashboard
// dirender saat diakses dan datanya diambil dari API.
export function generateStaticParams() {
  return cars.map((car) => ({ slug: car.slug }));
}

export default async function CarDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CarDetail slug={slug} />;
}
