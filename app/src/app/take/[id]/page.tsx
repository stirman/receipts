import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { TakeDetail } from "@/components/TakeDetail";

interface TakePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: TakePageProps): Promise<Metadata> {
  const { id } = await params;
  const take = await prisma.take.findUnique({ where: { id } });

  if (!take) {
    return { title: "Take Not Found | Receipts" };
  }

  const ogImageUrl = `/api/og/${id}`;

  return {
    title: `${take.author}'s Take | Receipts`,
    description: take.text,
    openGraph: {
      title: `${take.author}'s Take | Receipts`,
      description: take.text,
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Receipt for ${take.author}'s take: "${take.text.slice(0, 60)}..."`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${take.author}'s Take | Receipts`,
      description: take.text,
      images: [ogImageUrl],
    },
  };
}

export default async function TakePage({ params }: TakePageProps) {
  const { id } = await params;
  const take = await prisma.take.findUnique({ where: { id } });

  if (!take) {
    notFound();
  }

  // Serialize dates for client component
  const serializedTake = {
    id: take.id,
    text: take.text,
    author: take.author,
    hash: take.hash,
    status: take.status,
    lockedAt: take.lockedAt.toISOString(),
    resolvesAt: take.resolvesAt?.toISOString() || null,
    resolvedAt: take.resolvedAt?.toISOString() || null,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Header />

      {/* Take Detail */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-white/50 hover:text-white/80 mb-8 text-sm"
        >
          ← Back to all takes
        </Link>

        <TakeDetail take={serializedTake} />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-white/30 text-sm">
          <p>Receipts — Lock in your predictions. Prove you were right.</p>
        </div>
      </footer>
    </div>
  );
}
