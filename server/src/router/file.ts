import multer from "@koa/multer";
import Router from "@koa/router";
import { uploadFile } from "../controller/file";
import { auth } from "../middleware/auth";

const upload = multer({ dest: "uploads/tmp/" });

export function fileRouter(): Router {
  const router = new Router();
  router.use(auth);
  router.post("/upload", upload.single("file"), uploadFile);
  return router;
}
