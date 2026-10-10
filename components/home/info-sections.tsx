import { ChevronDown, MessageCircle, Phone } from "lucide-react";
import { PHONE_DISPLAY, PHONE_HREF } from "@/data/business";
import { waLink } from "@/lib/rental";

const steps = [
  ["1", "Pilih mobil & tanggal", "Cek unit yang sesuai kebutuhan Anda, lalu chat CS lewat WhatsApp."],
  ["2", "Konfirmasi & dokumen", "CS memastikan unit, total biaya, dan dokumen (KTP, SIM A untuk lepas kunci)."],
  ["3", "Serah terima", "Ambil di kantor, atau minta diantar ke bandara, stasiun, hotel, atau alamat Anda."],
];

export function Steps() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-14 md:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Tiga langkah, mobil siap</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {steps.map(([n, title, text]) => (
            <li key={n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="grid size-10 place-items-center rounded-full bg-slate-900 text-base font-extrabold text-white">{n}</span>
              <h3 className="mt-4 text-lg font-extrabold text-slate-900">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const faqs = [
  ["Apa saja syarat untuk menyewa mobil?", "Siapkan KTP dan SIM A aktif untuk sewa lepas kunci, serta dokumen pendukung sesuai arahan CS. Untuk sewa dengan driver, cukup data pemesan."],
  ["Apakah tersedia layanan dengan pengemudi?", "Ya. Pilih Lepas Kunci atau Dengan Driver. Beberapa unit seperti Hiace dan Alphard sudah termasuk driver."],
  ["Bisakah mobil diantar ke bandara, stasiun, atau hotel?", "Bisa, untuk area Kota Semarang. Biaya antar dikonfirmasi CS sesuai lokasi sebelum Anda membayar."],
  ["Bagaimana cara membayar?", "Total biaya dan metode pembayaran dikonfirmasi lewat WhatsApp setelah ketersediaan unit pasti."],
  ["Apakah harga sudah termasuk BBM dan tol?", "Belum. Harga sewa belum termasuk BBM, tol, parkir, dan akomodasi driver untuk perjalanan luar kota."],
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 bg-white py-14 md:py-20">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 md:px-6 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Pertanyaan yang sering diajukan</h2>
          <p className="mt-3 max-w-sm text-slate-600">Belum ketemu jawabannya? Tim kami siap membantu memilihkan unit yang pas.</p>
          <a href={PHONE_HREF} className="mt-5 inline-flex items-center gap-2 font-bold text-slate-900 hover:underline"><Phone className="size-4" aria-hidden /> {PHONE_DISPLAY}</a>
        </div>
        <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {faqs.map(([q, a], i) => (
            <details key={q} className="group px-5 py-4" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 pr-8 text-[15px] leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-white pb-14 md:pb-20" id="kontak">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-slate-900 p-7 md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">Ceritakan rencana perjalanan Anda.</h2>
            <p className="mt-2 max-w-lg text-slate-300">Kami bantu pilihkan mobil dan paket yang paling sesuai, tanpa biaya tersembunyi.</p>
          </div>
          <a href={waLink("Halo NaKay Trans, saya ingin konsultasi sewa mobil.")} target="_blank" rel="noreferrer" className="inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 text-base font-extrabold text-slate-900 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <MessageCircle className="size-5" aria-hidden /> Chat CS via WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
