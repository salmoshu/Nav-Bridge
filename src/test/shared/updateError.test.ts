import { getUpdateErrorMessage } from "../../shared/updateError";

describe("update error messages", () => {
  it.each([
    new Error(
      '404 "method: GET url: https://github.com/owner/repo/releases.atom" Headers: { "set-cookie": "secret" }'
    ),
    { statusCode: 404, message: "Response body with secret credentials" },
    { code: "HTTP_ERROR_404" },
    'Error: 404 "method: GET url: https://github.com/owner/repo/releases.atom" Headers: secret'
  ])("explains an inaccessible update source without claiming there is no update: %p", (error) => {
    expect(getUpdateErrorMessage(error)).toBe("更新源不可访问（404），请联系发布者检查更新地址和访问权限。");
  });

  it("distinguishes missing release metadata from an inaccessible feed", () => {
    expect(
      getUpdateErrorMessage({
        code: "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND",
        message: "latest.yml: HttpError 404"
      })
    ).toBe("更新源缺少版本信息文件，请联系发布者补全更新文件。");
  });

  it.each(["ERR_UPDATER_NO_PUBLISHED_VERSIONS", "ERR_UPDATER_LATEST_VERSION_NOT_FOUND"])(
    "explains an unpublished release (%s)",
    (code) => {
      expect(getUpdateErrorMessage({ code })).toBe("更新源中尚未找到可用的正式版本，请稍后重试。");
    }
  );

  it.each([
    [{ statusCode: 403 }, "更新源拒绝访问（403），请稍后重试或联系发布者检查访问权限。"],
    [{ code: "HTTP_ERROR_429" }, "更新请求过于频繁，请稍后重试。"],
    [{ statusCode: 503 }, "更新服务器暂时不可用（503），请稍后重试。"],
    [{ code: "ETIMEDOUT" }, "无法连接更新服务器，请检查网络后重试。"],
    [new Error("net::ERR_NAME_NOT_RESOLVED"), "无法连接更新服务器，请检查网络后重试。"],
    [{ code: "ERR_CHECKSUM_MISMATCH" }, "更新包校验失败，请重新检查并下载更新。"],
    [{ code: "ERR_UPDATER_INVALID_UPDATE_INFO" }, "无法读取更新版本信息，请联系发布者检查更新文件。"]
  ])("provides an actionable message for %p", (error, expected) => {
    expect(getUpdateErrorMessage(error)).toBe(expected);
  });

  it.each([
    new Error("Unexpected response Headers: { Authorization: 'Bearer secret', 'set-cookie': 'session' }"),
    "https://user:secret@example.com/download?token=secret",
    null,
    undefined,
    { message: "Unrecognized response containing credentials" }
  ])("does not echo unrecognized error details: %p", (error) => {
    expect(getUpdateErrorMessage(error)).toBe("更新失败，请稍后重试。");
  });
});
