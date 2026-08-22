"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (lazy useState, not module-level --
  // module-level would leak cached data across different users/sessions on
  // the server if this ever ran there, and would break React Strict
  // Mode's double-render in dev).
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
