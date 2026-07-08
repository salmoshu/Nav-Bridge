import { bottomActionIds, getBottomActionLabel, getBottomActions } from "../../renderer/lib/bottomActions";

describe("bottomActions", () => {
  describe("getBottomActionLabel", () => {
    it('returns "Start" for the start/stop action when not running', () => {
      expect(getBottomActionLabel("startStop", false)).toBe("Start");
    });

    it('returns "Stop" for the start/stop action when running', () => {
      expect(getBottomActionLabel("startStop", true)).toBe("Stop");
    });

    it('returns "Options" for the options action regardless of running state', () => {
      expect(getBottomActionLabel("options", false)).toBe("Options");
      expect(getBottomActionLabel("options", true)).toBe("Options");
    });

    it('returns "Exit" for the exit action regardless of running state', () => {
      expect(getBottomActionLabel("exit", false)).toBe("Exit");
      expect(getBottomActionLabel("exit", true)).toBe("Exit");
    });
  });

  describe("getBottomActions", () => {
    it("orders actions as start/stop, options, exit", () => {
      const actions = getBottomActions(false);
      expect(actions.map((a) => a.id)).toEqual(bottomActionIds);
    });

    it("marks the start/stop action disabled when not running only for stop state", () => {
      const idle = getBottomActions(false).find((a) => a.id === "startStop");
      expect(idle?.disabled).toBe(false);
    });

    it("marks the start/stop action enabled when running", () => {
      const active = getBottomActions(true).find((a) => a.id === "startStop");
      expect(active?.disabled).toBe(false);
    });

    it("keeps options and exit always enabled", () => {
      for (const running of [false, true]) {
        const actions = getBottomActions(running);
        expect(actions.find((a) => a.id === "options")?.disabled).toBe(false);
        expect(actions.find((a) => a.id === "exit")?.disabled).toBe(false);
      }
    });
  });
});
