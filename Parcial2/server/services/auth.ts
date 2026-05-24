import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function verifyToken(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  
  const token = authHeader.replace("Bearer ", "");
  try {
    const session = await clerkClient.verifyToken(token);
    return session;
  } catch (e) {
    return null;
  }
}

export async function getUser(req) {
  const session = await verifyToken(req);
  if (!session) return null;
  
  try {
    const user = await clerkClient.users.getUser(session.sub);
    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      name: user.firstName || user.username || "Player",
    };
  } catch (e) {
    return null;
  }
}
