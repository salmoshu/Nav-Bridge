import {
  appWindowDefaultHeight,
  appWindowMaxHeight,
  appWindowMinHeight,
  appWindowWidth,
  createMainWindowOptions
} from "../../main/windowOptions";

describe("createMainWindowOptions", () => {
  it("locks the window width and disables native frameless resizing", () => {
    const options = createMainWindowOptions();

    expect(options.width).toBe(appWindowWidth);
    expect(options.minWidth).toBe(appWindowWidth);
    expect(options.maxWidth).toBe(appWindowWidth);
    expect(options.height).toBe(appWindowDefaultHeight);
    expect(options.minHeight).toBe(appWindowMinHeight);
    expect(options.maxHeight).toBe(appWindowMaxHeight);
    expect(options.minHeight).toBeLessThan(options.height as number);
    expect(options.maxHeight).toBeGreaterThan(options.height as number);
    expect(options.resizable).toBe(false);
  });

  it("keeps the custom title bar frameless", () => {
    expect(createMainWindowOptions().frame).toBe(false);
  });
});
