import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { assert } from "convex-helpers";
import type { StorageActionWriter } from "convex/server";

import { Id } from "@workspace/backend/_generated/dataModel";

const AI_MODELS = {
  image: google.chat("gemini-flash-lite-latest"),
  pdf: google.chat("gemini-flash-lite-latest"),
  html: google.chat("gemini-flash-lite-latest"),
  video: google.chat("gemini-flash-latest"),
} as const;

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

// Implement in future updates
const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/mpeg",
] as const;

const SYSTEM_PROMPTS = {
  image: `
    You convert image input into structured text.

    Rules:
    - If the image contains a document (printed, handwritten, slide, screenshot of text):
      + perform accurate OCR transcription.
      + preserve original structure (headings, paragraphs, lists, tables).
      + do NOT summarize or paraphrase.
      + keep original language.
    - If the image is not a document:
      + provide a concise but information-dense description.
      + focus on salient objects, actions, and context.
    - If the image contains both text and visual content:
      + transcribe all visible text first.
      + then describe the visual elements.

    Output:
    - Plain text or markdown (use markdown if structure exists).
    - No explanations, no meta commentary.
  `,
  pdf: `
    You extract and reconstruct text content from PDF files.

    Rules:
    - Perform faithful extraction (no summarization).
    - Preserve logical structure:
      + headings
      + sections
      + bullet points
      + tables (format as markdown tables)
    - Maintain reading order across pages.
    - If the PDF contains scanned pages:
      + apply OCR and follow same rules.
    - If content is partially unreadable:
      + mark unclear sections as [unreadable].

    Output:
    - Clean, well-structured markdown.
    - No commentary or interpretation.
  `,
  html: `
    You convert HTML content into clean, semantic markdown.

    Rules:
    - Preserve document structure:
      + headings (h1-h6)
      + paragraphs
      + lists
      + links (format: [text](url))
      + images (format: ![alt](url))
      + tables (markdown format)
    - Remove:
      + scripts, styles, tracking, navigation noise
    - Flatten unnecessary nesting.
    - Keep meaningful attributes (e.g., href, alt).

    Output:
    - Clean markdown only.
    - No explanations or extra text.
  `,
  video: `
    You transcribe video content into text.

    Rules:
    - Transcribe all spoken content verbatim.
    - Preserve speaker turns if distinguishable:
      + use format: [Speaker X]:
    - Include timestamps at reasonable intervals if available.
    - Include meaningful non-speech audio cues when relevant:
      + e.g., [music], [laughter], [applause]
    - Do NOT summarize.

    If transcription is not possible:
    - Provide a brief description of visible and audible content.

    Output:
    - Plain text transcript.
    - No commentary.
  `,
};

export type ExtractTextContentArgs = {
  storageId: Id<"_storage">;
  filename: string;
  bytes?: ArrayBuffer;
  mimeType: string;
};

const extractImageText = async (url: string): Promise<string> => {
  const result = await generateText({
    model: AI_MODELS.image,
    system: SYSTEM_PROMPTS.image,
    messages: [
      {
        role: "user",
        content: [{ type: "image", image: new URL(url) }],
      },
    ],
  });

  return result.text;
};

const extractPdfText = async (
  url: string,
  mimeType: string,
  filename: string,
): Promise<string> => {
  const result = await generateText({
    model: AI_MODELS.pdf,
    system: SYSTEM_PROMPTS.pdf,
    messages: [
      {
        role: "user",
        content: [
          { type: "file", data: new URL(url), mediaType: mimeType, filename },
          {
            type: "text",
            text: "Extract all text from the PDF verbatim, preserving structure. Output only the extracted text.",
          },
        ],
      },
    ],
  });

  return result.text;
};

const extractTextFileContent = async (
  ctx: { storage: StorageActionWriter },
  storageId: Id<"_storage">,
  bytes: ArrayBuffer | undefined,
  mimeType: string,
): Promise<string> => {
  const arrayBuffer =
    bytes || (await (await ctx.storage.get(storageId))?.arrayBuffer());

  if (!arrayBuffer) {
    throw new Error(`Failed to get array buffer for storage [${storageId}]`);
  }

  const text = new TextDecoder().decode(arrayBuffer);

  if (mimeType.toLowerCase() !== "text/plain") {
    const result = await generateText({
      model: AI_MODELS.html,
      system: SYSTEM_PROMPTS.html,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text },
            {
              type: "text",
              text: "Extract all text and format it as clean, structured markdown. Output only the result.",
            },
          ],
        },
      ],
    });
    return result.text;
  }

  return text;
};

export const extractTextContent = async (
  ctx: { storage: StorageActionWriter },
  args: ExtractTextContentArgs,
): Promise<string> => {
  const { storageId, filename, bytes, mimeType } = args;

  const allowedTypes = [
    ...SUPPORTED_IMAGE_TYPES,
    "application/pdf",
    "text/plain",
    "text/html",
    "text/markdown",
  ];

  if (!allowedTypes.some((type) => mimeType.toLowerCase().startsWith(type))) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }

  const url = await ctx.storage.getUrl(storageId);
  assert(url, `Failed to get URL for storage [${storageId}]`);

  if (SUPPORTED_IMAGE_TYPES.some((type) => type === mimeType.toLowerCase())) {
    return extractImageText(url);
  }

  if (mimeType.toLowerCase().includes("pdf")) {
    return extractPdfText(url, mimeType, filename);
  }

  if (mimeType.toLowerCase().includes("text")) {
    return extractTextFileContent(ctx, storageId, bytes, mimeType);
  }

  throw new Error(`Unsupported MIME type: ${mimeType}`);
};
