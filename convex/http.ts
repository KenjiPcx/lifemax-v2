import { httpRouter } from "convex/server";
import { sendMessageHttpStream } from "./chat";

const http = httpRouter();

// Chat endpoint for streaming responses
http.route({
    path: "/chat",
    method: "POST",
    handler: sendMessageHttpStream,
});

export default http; 