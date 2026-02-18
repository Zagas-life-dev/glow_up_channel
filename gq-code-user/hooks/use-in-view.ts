'use client';

import { useEffect, useState, useRef } from 'react';

export function useInView(options?: { rootMargin?: string; threshold?: number }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { rootMargin: options?.rootMargin ?? '0px 0px -40px 0px', threshold: options?.threshold ?? 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.rootMargin, options?.threshold]);

  return { ref, visible };
}
