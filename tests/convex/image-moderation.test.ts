import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { bakeImageForModeration } from "../../src/features/wall/image-moderation";

describe("image moderation helper", () => {
  let createdImage: MockImage | null = null;
  let drawImage: ReturnType<typeof vi.fn>;
  let toBlob: ReturnType<typeof vi.fn>;

  class MockImage {
    naturalWidth = 4000;
    naturalHeight = 2000;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => this.onload?.());
    }
  }

  beforeEach(() => {
    createdImage = null;
    drawImage = vi.fn();
    toBlob = vi.fn((callback: (blob: Blob | null) => void, type: string, quality: number) => {
      callback(new Blob(["mock"], { type }));
      return undefined;
    });

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        Image: class extends MockImage {
          constructor() {
            super();
            createdImage = this;
          }
        },
      },
    });

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: (tag: string) => {
          expect(tag).toBe("canvas");
          return {
            width: 0,
            height: 0,
            getContext: () => ({ drawImage }),
            toBlob,
          };
        },
      },
    });

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:mock"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "document");
    vi.restoreAllMocks();
  });

  test("shrinks large images and outputs jpeg", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "example.png", { type: "image/png" });

    const result = await bakeImageForModeration(file);

    expect(result.name).toBe("example-moderation.jpg");
    expect(result.type).toBe("image/jpeg");
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(drawImage).toHaveBeenCalledWith(createdImage, 0, 0, 1600, 800);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.82);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });
});
