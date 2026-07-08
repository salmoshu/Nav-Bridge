import { createAppTheme } from "../../renderer/theme";

describe("createAppTheme", () => {
  it("uses softer dark-mode surfaces and text", () => {
    const theme = createAppTheme("dark");

    expect(theme.palette.background.default).toBe("#14161b");
    expect(theme.palette.background.paper).toBe("#1d2027");
    expect(theme.palette.text.primary).toBe("#d2d6dc");
    expect(theme.palette.text.secondary).toBe("#9aa1ab");
  });
});
