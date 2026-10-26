import { isUuid, newUuid } from "./id";

describe("newUuid", () => {
  it("returns a uuid version 7", () => {
    const id = newUuid();
    expect(isUuid(id)).toBe(true);
    expect(id[14]).toBe("7");
    expect("89ab").toContain(id[19]);
  });

  it("sorts a later id after an earlier one", () => {
    const first = newUuid();
    const second = newUuid();
    expect(first < second).toBe(true);
  });
});
