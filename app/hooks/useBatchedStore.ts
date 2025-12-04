import { useEffect, useState, useRef } from 'react';
import type { ReadableAtom } from 'nanostores';

/**
 * Custom hook that batches rapid store updates to prevent React from overwhelming the DOM
 * When many actions are generated quickly (10+ files), this prevents NotFoundError
 * by grouping updates into 100ms batches instead of rendering every single change
 */
export function useBatchedStore<T>(store: ReadableAtom<T>, batchDelay = 100): T {
  const [value, setValue] = useState<T>(store.get());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<T | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe((newValue) => {
      // Store the pending value
      pendingValueRef.current = newValue;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to batch updates
      timeoutRef.current = setTimeout(() => {
        if (pendingValueRef.current !== null) {
          setValue(pendingValueRef.current);
          pendingValueRef.current = null;
        }
      }, batchDelay);
    });

    return () => {
      unsubscribe();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [store, batchDelay]);

  return value;
}

/**
 * Hook specifically for action lists that only updates when actions are added/removed/completed
 * Ignores intermediate status changes to reduce re-renders
 */
export function useStableActions<T extends { id: string; status: string }[]>(store: ReadableAtom<T>): T {
  const [value, setValue] = useState<T>(store.get());
  const previousKeysRef = useRef<string>('');

  useEffect(() => {
    const unsubscribe = store.subscribe((newValue) => {
      // Create a stable key based on IDs and completion status only
      const currentKeys = newValue
        .map((item) => `${item.id}:${item.status === 'complete' ? 'done' : 'pending'}`)
        .join('|');

      // Only update if the structure actually changed
      if (currentKeys !== previousKeysRef.current) {
        previousKeysRef.current = currentKeys;
        setValue(newValue);
      }
    });

    return unsubscribe;
  }, [store]);

  return value;
}
