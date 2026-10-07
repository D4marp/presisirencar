import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Mobil",
  description: "Isi detail perjalanan dan kirim permintaan booking. Tim PRESISI Rencar akan mengonfirmasi ketersediaan.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
