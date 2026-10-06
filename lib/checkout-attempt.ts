// The browser's id for the current checkout attempt, kept in localStorage so it
// survives reloads and is shared by every tab. See the payment initialize API.

const KEY = "checkout-attempt-id"
// Used when storage is blocked, so retries on this page still share an id
let memoryId: string | null = null

export function getCheckoutAttemptId() {
  try {
    const existing = window.localStorage.getItem(KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    window.localStorage.setItem(KEY, id)
    return id
  } catch {
    memoryId ??= crypto.randomUUID()
    return memoryId
  }
}

export function clearCheckoutAttemptId() {
  memoryId = null
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // Nothing stored
  }
}
