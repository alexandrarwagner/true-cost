"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Renders its children once the wrapper is near the viewport, so heavy chunks load late. */
export function InView({
  children,
  placeholderClassName = "",
}: {
  children: ReactNode;
  placeholderClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (!("IntersectionObserver" in window)) {
      const t = setTimeout(() => setShown(true), 0);
      return () => clearTimeout(t);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setShown(true);
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shown]);
  return (
    <div ref={ref} className={shown ? undefined : placeholderClassName}>
      {shown ? children : null}
    </div>
  );
}
