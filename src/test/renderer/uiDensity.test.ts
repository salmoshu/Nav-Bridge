import fs from "node:fs";
import path from "node:path";
import { bottomActionBarSx, bottomActionButtonSx } from "../../renderer/components/BottomActionBar";
import { endpointActionButtonSx, endpointActionIconSx } from "../../renderer/components/EndpointTable";
import { themeModeMenuProps } from "../../renderer/components/ThemeModeSelector";
import {
  compactDialogActionsSx,
  compactDialogButtonSx,
  compactDialogContentSx,
  compactDialogTitleSx
} from "../../renderer/lib/compactUi";

const repoRoot = path.resolve(__dirname, "../../..");

describe("theme mode menu behavior", () => {
  it("uses a controlled menu and document click-away listener", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, "src/renderer/components/ThemeModeSelector.tsx"),
      "utf-8"
    );

    expect(source).toContain("open={open}");
    expect(source).toContain("onClose={handleClose}");
    expect(source).toContain('window.addEventListener("pointerdown"');
    expect(themeModeMenuProps.disablePortal).toBe(true);
    expect(themeModeMenuProps.PaperProps.sx.WebkitAppRegion).toBe("no-drag");
  });
});

describe("compact UI density", () => {
  it("keeps endpoint row action icons smaller than the default MUI small icon", () => {
    expect(endpointActionButtonSx.width).toBeLessThanOrEqual(20);
    expect(endpointActionButtonSx.height).toBeLessThanOrEqual(20);
    expect(endpointActionIconSx.fontSize).toBeLessThanOrEqual(16);
  });

  it("keeps bottom buttons compact while preserving vertical padding", () => {
    expect(bottomActionBarSx.py).toBeGreaterThanOrEqual(1.1);
    expect(bottomActionButtonSx.height).toBeLessThanOrEqual(25);
  });

  it("uses shared compact dialog styles for configuration dialogs", () => {
    expect(compactDialogTitleSx.fontSize).toBe("0.8125rem");
    expect(compactDialogContentSx["& .MuiInputBase-root"].fontSize).toBe("0.75rem");
    expect(compactDialogActionsSx.py).toBeLessThanOrEqual(1);
    expect(compactDialogButtonSx.fontSize).toBe("0.75rem");
  });

  it("allows dialog content to scroll when it overflows", () => {
    expect(compactDialogContentSx.overflow).toBe("auto");
    expect(compactDialogContentSx.maxHeight).toContain("100vh");
    expect(compactDialogContentSx.pt).toBe("12px !important");
  });

  it("shrinks the first input label in Options and EndpointConfig dialogs to avoid truncation", () => {
    const optionsSource = fs.readFileSync(
      path.join(repoRoot, "src/renderer/components/OptionsDialog.tsx"),
      "utf-8"
    );
    const configSource = fs.readFileSync(
      path.join(repoRoot, "src/renderer/components/EndpointConfigDialog.tsx"),
      "utf-8"
    );

    expect(optionsSource).toContain("InputLabelProps={index === 0 ? { shrink: true } : undefined}");
    expect(configSource).toContain("InputLabelProps={{ shrink: true }}");
  });
});
