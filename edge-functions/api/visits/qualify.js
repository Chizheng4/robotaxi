import { errorResponse, handleCors, json, qualifyVisit } from "../../lib/visitAnalytics.js";

export async function onRequest(context) {
  const cors = await handleCors(context.request);
  if (cors instanceof Response) return cors;
  try { return json(await qualifyVisit(context.request, context.env), 200, cors); }
  catch (error) { return errorResponse(error, cors); }
}
