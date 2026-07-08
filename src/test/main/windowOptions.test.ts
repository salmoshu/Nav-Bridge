import { createMainWindowOptions } from "../../main/windowOptions";

describe("createMainWindowOptions", () => {
  it("locks the window width and disables native frameless resizing", () => {
    const options = createMainWindowOptions();

    expect(options.width).toBe(560);
    expect(options.minWidth).toBe(560);
    expect(options.maxWidth).toBe(560);
    expect(options.minHeight).toBeLessThan(options.height as number);
    expect(options.maxHeight).toBeUndefined();
    expect(options.resizable).toBe(false);
  });

  it("keeps the custom title bar frameless", () => {
    expect(createMainWindowOptions().frame).toBe(false);
  });
});
