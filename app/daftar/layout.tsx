import type { Metadata } from "next";

// Halaman khusus undangan: tidak diindeks mesin pencari dan tidak ditautkan dari halaman mana pun.
export const metadata: Metadata = {
  title: "Daftar Akun Staf",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
