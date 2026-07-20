import { authenticate, errorResponse, handleCors, json } from "../../lib/visitAnalytics.js";
export async function onRequest(context) {
  const cors = await handleCors(context.request, context.env);
  if (cors instanceof Response) return cors;
  try { return json(await authenticate(context.request, context.env), 200, cors); }
  catch (error) { return errorResponse(error, cors); }
}
