import { NextRequest } from "next/server";
import { getProgress } from "@/lib/scan-progress";

export async function GET(req: NextRequest) {
  const radarId = req.nextUrl.searchParams.get("radarId");

  if (!radarId) {
    return new Response(JSON.stringify({ error: "radarId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const encoder = new TextEncoder();

      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const interval = setInterval(() => {
        const progress = getProgress(radarId);

        if (!progress) {
          send({ stage: "waiting", message: "Ожидание запуска..." });
          return;
        }

        send({
          stage: progress.stage,
          sources: progress.sources,
          current: progress.current,
          total: progress.total,
          message: progress.message,
          error: progress.error,
          sites: progress.sites,
        });

        if (progress.stage === "done" || progress.stage === "error") {
          clearInterval(interval);
          setTimeout(() => {
            if (!closed) {
              controller.close();
              closed = true;
            }
          }, 500);
        }
      }, 300);

      // Cleanup on abort
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        closed = true;
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
