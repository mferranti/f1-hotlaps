/** How to fill a window with landscape content, including when the OS stays in portrait. */
export function landscapeFrame(width: number, height: number): {
  rotated: boolean;
  width: number;
  height: number;
  left: number;
  top: number;
} {
  if (width >= height) {
    return { rotated: false, width, height, left: 0, top: 0 };
  }
  return {
    rotated: true,
    width: height,
    height: width,
    left: (width - height) / 2,
    top: (height - width) / 2,
  };
}
