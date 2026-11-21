import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useSettings } from "@/hooks/queries";
import { whatsappLink } from "@/utils/format";

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default function PublicLayout() {
  const { pathname } = useLocation();
  const { data: s } = useSettings();
  const overlay = pathname === "/" || /^\/projects\/[^/]+$/.test(pathname);
  const wa = whatsappLink(s?.contact?.whatsapp, "Hello Arkhaven, I would like to know more about your projects.");
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only z-50 bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Skip to content
      </a>
      <Header overlay={overlay} />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Chat with an advisor on WhatsApp"
          className="fixed right-4 bottom-4 z-30 flex size-13 items-center justify-center rounded-full bg-[#1f7a4d] text-paper shadow-lg transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
        >
          <MessageCircle className="size-6" />
        </a>
      )}
    </div>
  );
}
