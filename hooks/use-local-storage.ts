"use client"

import { useState, useCallback } from "react"

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Initialize state with a function to avoid running on every render
    if (typeof window === "undefined") {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error("Error reading from localStorage:", error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      const apply = () => {
        try {
          // Allow value to be a function so we have same API as useState. Apply it to
          // what's stored now, which may include changes made in another tab since
          // this render.
          let current = storedValue
          if (value instanceof Function && typeof window !== "undefined") {
            try {
              const item = window.localStorage.getItem(key)
              if (item) current = JSON.parse(item)
            } catch {
              // Fall back to this render's value
            }
          }
          const valueToStore = value instanceof Function ? value(current) : value

          // Save state
          setStoredValue(valueToStore)

          // Save to localStorage
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, JSON.stringify(valueToStore))
          }
        } catch (error) {
          console.error("Error writing to localStorage:", error)
        }
      }

      // A functional update reads, changes and writes the stored value. Tabs share
      // localStorage, so take a lock (shared by all of this site's tabs) for that
      // step: otherwise two tabs updating at once could each start from the same
      // value and the later write would drop the other tab's change.
      if (value instanceof Function && typeof navigator !== "undefined" && navigator.locks) {
        navigator.locks.request(`localStorage:${key}`, apply).catch((error) => {
          console.error("Error updating localStorage:", error)
        })
      } else {
        apply()
      }
    },
    [key, storedValue],
  )

  return [storedValue, setValue] as const
}
