import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { sendMessageHttpStream } from "./chat";

const http = httpRouter();

auth.addHttpRoutes(http);
// Chat endpoint for streaming responses
http.route({
    path: "/chat",
    method: "POST",
    handler: sendMessageHttpStream,
});

export default http;
