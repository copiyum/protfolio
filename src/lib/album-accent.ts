const SAMPLE_SIZE = 40;

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type Bucket = Rgb & {
  count: number;
  weight: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function colorStats({ r, g, b }: Rgb) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 510;
  const saturation = max === 0 ? 0 : chroma / max;

  return { chroma, lightness, saturation };
}

function normalizeForDisplay(color: Rgb): Rgb {
  const max = Math.max(color.r, color.g, color.b);
  const scale = max > 0 ? clamp(168 / max, 0.92, 1.28) : 1;

  return {
    r: color.r * scale,
    g: color.g * scale,
    b: color.b * scale,
  };
}

function bucketKey({ r, g, b }: Rgb) {
  return `${Math.round(r / 24)}:${Math.round(g / 24)}:${Math.round(b / 24)}`;
}

export function accentFromImageData(data: Uint8ClampedArray): string | null {
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha < 0.8) continue;

    const color = { r: data[i], g: data[i + 1], b: data[i + 2] };
    const { chroma, lightness, saturation } = colorStats(color);

    if (lightness < 0.1 || lightness > 0.9) continue;

    const lightnessWeight = 1 - Math.abs(lightness - 0.5) * 1.35;
    const colorWeight = chroma < 10 ? 0.35 : 0.55 + saturation * 0.45;
    const weight = alpha * clamp(lightnessWeight, 0.2, 1) * colorWeight;
    const key = bucketKey(color);
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.r += color.r * weight;
      bucket.g += color.g * weight;
      bucket.b += color.b * weight;
      bucket.count += 1;
      bucket.weight += weight;
    } else {
      buckets.set(key, {
        r: color.r * weight,
        g: color.g * weight,
        b: color.b * weight,
        count: 1,
        weight,
      });
    }
  }

  let best: { color: Rgb; score: number } | null = null;

  for (const bucket of buckets.values()) {
    if (bucket.weight <= 0) continue;

    const color = {
      r: bucket.r / bucket.weight,
      g: bucket.g / bucket.weight,
      b: bucket.b / bucket.weight,
    };
    const { lightness, saturation } = colorStats(color);
    const areaScore = Math.log1p(bucket.count);
    const colorScore = 0.65 + saturation * 0.35;
    const lightnessScore = clamp(1 - Math.abs(lightness - 0.52), 0.4, 1);
    const score = areaScore * bucket.weight * colorScore * lightnessScore;

    if (!best || score > best.score) best = { color, score };
  }

  return best ? rgbToHex(normalizeForDisplay(best.color)) : null;
}

export function extractAlbumAccent(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        resolve(accentFromImageData(data));
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = src;
  });
}
