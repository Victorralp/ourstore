import { auth } from "./firebase-admin"

// The signed-in user behind an API request, from its "Authorization: Bearer <Firebase ID token>" header
export const getRequestUser = async (request: Request) => {
  const header = request.headers.get("authorization") || ""
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : ""
  if (!token) return null
  try {
    return await auth().verifyIdToken(token)
  } catch {
    return null
  }
}
