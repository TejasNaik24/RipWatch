import { ViewTransition, type ReactNode } from "react";

// Wraps each page (not the layout, which persists) so route changes crossfade.
// Only navigations animate; ordinary state updates inside the page do not.
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="rw-page" exit="rw-page" default="none">
      {children}
    </ViewTransition>
  );
}
