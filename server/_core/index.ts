import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import {
  attachmentHttpError,
  getPublicAttachmentDownload,
  uploadPublicAttachment,
} from "../attachments";
import type {
  AttachmentReadDependencies,
  AttachmentUploadDependencies,
} from "../attachments";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export function createApp(
  attachmentDependencies: AttachmentReadDependencies &
    AttachmentUploadDependencies = {}
) {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get("/api/public/attachments/:attachmentId", async (req, res) => {
    try {
      const caseCode = req.header("x-case-code");
      const trackingToken = req.header("x-tracking-token");
      if (!caseCode || !trackingToken) {
        res
          .status(400)
          .json({ error: "Missing attachment access credentials" });
        return;
      }
      const result = await getPublicAttachmentDownload(
        {
          caseCode,
          trackingToken,
          attachmentId: req.params.attachmentId,
        },
        attachmentDependencies
      );
      res.status(200).json(result);
    } catch (error) {
      const result = attachmentHttpError(error);
      res.status(result.status).json({ error: result.message });
    }
  });
  app.post(
    "/api/public/attachments",
    express.raw({ type: () => true, limit: "10mb" }),
    async (req, res) => {
      try {
        const result = await uploadPublicAttachment(
          req,
          attachmentDependencies
        );
        res.status(200).json(result);
      } catch (error) {
        const result = attachmentHttpError(error);
        res.status(result.status).json({ error: result.message });
      }
    }
  );
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  startServer().catch(console.error);
}
