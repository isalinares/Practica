import { createClerkClient, verifyToken as clerkVerifyToken } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export async function verifyToken(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  try {
    // En @clerk/backend v3 la verificacion es la funcion independiente
    // verifyToken(token, { secretKey }); el cliente NO expone .verifyToken().
    const session = await clerkVerifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    return session;
  } catch (e) {
    console.error("verifyToken error:", e?.message);
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
