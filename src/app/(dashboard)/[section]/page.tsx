import { notFound } from 'next/navigation';
import { sectionFromPath, sectionPaths } from '@/lib/routes';

export function generateStaticParams() {
  return Object.values(sectionPaths)
    .filter((path) => path !== '/')
    .map((path) => ({ section: path.slice(1) }));
}

export const dynamicParams = false;

export default async function SectionRoute({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sectionFromPath(`/${section}`)) notFound();
  return null;
}
