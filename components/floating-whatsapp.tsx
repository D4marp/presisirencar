"use client";

import { usePathname } from "next/navigation";

export function FloatingWhatsApp() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/login")) return null;
  return (
    <a className="floating-whatsapp" href="https://wa.me/6281362218168" target="_blank" aria-label="Chat PRESISI Rencar melalui WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.2 1.6 6L.2 24l6.3-1.7c1.7.9 3.6 1.4 5.6 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4ZM12.1 21.7c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.7 9.7 0 1 1 8.3 4.6Zm5.3-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1.8-.9-3-1.6-4.2-3.7-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.5c.2.2 2.4 3.7 5.9 5.2 2.2 1 3.1 1 4.2.8.7-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.2-.1-.4-.2-.7-.3Z"/></svg><span>Chat sekarang</span></a>
  );
}
