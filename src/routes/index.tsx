import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import App from "@/features/ticketgen/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TicketGen DZ — Éditeur de maquettes de tickets de caisse" },
      {
        name: "description",
        content:
          "Éditeur simple de maquettes visuelles de tickets de caisse à des fins de démonstration et UI.",
      },
      { property: "og:title", content: "TicketGen DZ" },
      {
        property: "og:description",
        content:
          "Éditeur simple de maquettes visuelles de tickets de caisse à des fins de démonstration et UI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  // App reads localStorage in its state initializer — render client-side only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <App />;
}
