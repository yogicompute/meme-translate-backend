import { Hono } from "hono";
import { cors } from "hono/cors";
import { GoogleGenAI } from "@google/genai";
import { GiphyFetch } from "@giphy/js-fetch-api";

const app = new Hono();

app.use("*", cors());

const ai = new GoogleGenAI({
	apiKey: process.env.GEMINI_API_KEY,
});

const gf = new GiphyFetch(process.env.GIPHY_API_KEY!);

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.post("/api/translate", async (c) => {
	try {
		const { q, sl, dl } = await c.req.json();

		if (!q || !sl || !dl) {
			return c.json({ error: "q, sl, and dl are required" }, 400);
		}

		const prompt = `
You are a translation engine. 
Translate the following text from ${sl} to ${dl}. 
Respond ONLY in JSON with this exact format:
{
  "translation": "main translation here",
  "english_tranform": "use alphbets to create the same words for the translation, just like we write hi-english for example नमस्ते would be written as namaste",
  "alternatives": ["alt1(in the translated language) - hi-english like text(in hienglish)", "alt2(in the translated language) - hi-english like text(in hienglish)"]
}
If the translation is more than 3 words long, leave "alternatives" as an empty array.
Text: "${q}"
`;

		const res = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: [{ role: "user", parts: [{ text: prompt }] }],
		});

		let raw = res.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
		raw = raw.replace(/```json|```/g, "").trim();

		let parsedRes;
		try {
			parsedRes = JSON.parse(raw);
		} catch {
			parsedRes = {
				translation: "Error parsing response",
				alternatives: [],
			};
		}

		return c.json({ AiResponse: parsedRes });
	} catch (error) {
		console.log(error);
		return c.json({ error });
	}
});

app.post("/api/memes", async (c) => {
	try {
		const body = await c.req.json();
		const text = body?.q || "funny cat";
		const fetchGifs = (offset: number) =>
			gf.search(text, {
				offset,
				sort: "relevant",
				limit: 4,
				type: "gifs",
				rating: "g",
			});
		const { data } = await fetchGifs(0);

		return c.json(data);
	} catch (error) {
		console.log(error);
		return c.json({ error: error }, 500);
	}
});

export default app;
