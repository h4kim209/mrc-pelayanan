import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { signal } = req;
  const encoder = new TextEncoder();

  async function fetchRecentNotifs() {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        'SELECT * FROM notifications ORDER BY id DESC LIMIT 20'
      );
      return rows.map((r) => ({
        id: Number(r.id),
        message: r.message,
        type: r.type,
        read: Boolean(r.read),
        slot: r.slot || undefined,
        timestamp: r.timestamp,
      }));
    } catch {
      return [];
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      function sendEvent(data: any) {
        if (isClosed) return;
        try {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          isClosed = true;
        }
      }

      // Initial send
      const initial = await fetchRecentNotifs();
      sendEvent({ type: 'initial', notifications: initial });

      // Poll interval for updates every 4 seconds
      let lastTopId = initial.length > 0 ? initial[0].id : 0;

      const interval = setInterval(async () => {
        if (isClosed || signal.aborted) {
          clearInterval(interval);
          return;
        }

        const current = await fetchRecentNotifs();
        const currentTopId = current.length > 0 ? current[0].id : 0;
        if (currentTopId !== lastTopId) {
          lastTopId = currentTopId;
          sendEvent({ type: 'update', notifications: current });
        } else {
          // Heartbeat ping to keep SSE connection alive
          sendEvent({ type: 'ping' });
        }
      }, 4000);

      signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
