import { PAGE_SIZE, pageBy } from "./page";

const rows = ["a", "b", "c", "d", "e"];

describe("pageBy", () => {
  it("uses a page of 20 unless a caller asks for another size", () => {
    expect(PAGE_SIZE).toBe(20);
    const many = Array.from({ length: 45 }, (_, index) => index);
    const first = pageBy(many, null, PAGE_SIZE, String);
    expect(first.items).toEqual(many.slice(0, 20));
    expect(first.nextCursor).toBe("19");
    const second = pageBy(many, first.nextCursor, PAGE_SIZE, String);
    expect(second.items).toEqual(many.slice(20, 40));
    const third = pageBy(many, second.nextCursor, PAGE_SIZE, String);
    expect(third.items).toEqual(many.slice(40));
    expect(third.nextCursor).toBeNull();
  });

  it("stops when the cursor is the last row or no longer exists", () => {
    const last = pageBy(rows, "e", 2, (row) => row);
    expect(last).toEqual({ items: [], nextCursor: null });
    expect(pageBy(rows, "missing", 2, (row) => row)).toEqual({ items: [], nextCursor: null });
  });

  it("returns a short page with no further cursor when fewer rows remain", () => {
    expect(pageBy(rows, "c", 20, (row) => row)).toEqual({ items: ["d", "e"], nextCursor: null });
  });
});
