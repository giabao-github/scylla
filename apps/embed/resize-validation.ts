import {
  MAX_WIDGET_HEIGHT_PX,
  MIN_WIDGET_HEIGHT_PX,
} from "@workspace/shared/constants/widget";

export function getResizeHeight(payload: unknown): number | null {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("height" in payload)
  ) {
    console.warn("Scylla Widget: invalid resize message payload");
    return null;
  }

  const { height } = payload as { height: unknown };
  if (typeof height !== "number" && typeof height !== "string") {
    console.warn("Scylla Widget: invalid resize height type");
    return null;
  }

  // Reject empty or whitespace-only strings explicitly
  if (typeof height === "string" && height.trim() === "") {
    console.warn("Scylla Widget: invalid resize height type");
    return null;
  }

  const parsedHeight = Number(height);

  // Check if the parsed value is a finite number
  if (!Number.isFinite(parsedHeight)) {
    console.warn(
      `Scylla Widget: resize height "${height}" is not a finite number`,
    );
    return null;
  }

  // Check if the value is within acceptable bounds
  if (
    parsedHeight < MIN_WIDGET_HEIGHT_PX ||
    parsedHeight > MAX_WIDGET_HEIGHT_PX
  ) {
    console.warn(
      `Scylla Widget: resize height ${parsedHeight} out of bounds [${MIN_WIDGET_HEIGHT_PX}, ${MAX_WIDGET_HEIGHT_PX}]`,
    );
    return null;
  }

  return parsedHeight;
}
