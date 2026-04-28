import type { NextApiRequest, NextApiResponse } from "next";

// In-memory set of active SSE connections per ticket
const ticketConnections = new Map<string, Set<NextApiResponse>>();

export function broadcastTicketUpdate(
  ticketId: string,
  event: string,
  data: unknown,
) {
  const connections = ticketConnections.get(ticketId);

  if (!connections) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const res of connections) {
    res.write(payload);
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const ticketId = req.query["ticket-id"] as string;

  if (!ticketId) {
    return res.status(400).json({ message: "Missing ticket-id" });
  }

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  // Send initial keepalive
  res.write(": connected\n\n");

  // Register connection
  if (!ticketConnections.has(ticketId)) {
    ticketConnections.set(ticketId, new Set());
  }

  ticketConnections.get(ticketId)!.add(res);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 30_000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);

    const connections = ticketConnections.get(ticketId);

    if (connections) {
      connections.delete(res);

      if (connections.size === 0) {
        ticketConnections.delete(ticketId);
      }
    }
  });
}
