/** Keep server responses, headers and credentials out of the update dialog. */
export function getUpdateErrorMessage(error: unknown): string {
  const details = error != null && typeof error === "object" ? error : undefined;
  const code = details != undefined && "code" in details ? String(details.code) : "";
  const message =
    details != undefined && "message" in details
      ? String(details.message)
      : typeof error === "string"
        ? error
        : "";
  const status =
    details != undefined && "statusCode" in details && typeof details.statusCode === "number"
      ? details.statusCode
      : Number(
          /^HTTP_ERROR_(\d{3})$/.exec(code)?.[1] ?? /^\s*(?:Error:\s*)?([45]\d{2})\b/.exec(message)?.[1]
        );

  if (code === "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND") {
    return "更新源缺少版本信息文件，请联系发布者补全更新文件。";
  }
  if (status === 404) {
    return "更新源不可访问（404），请联系发布者检查更新地址和访问权限。";
  }
  if (status === 401 || status === 403) {
    return `更新源拒绝访问（${status}），请稍后重试或联系发布者检查访问权限。`;
  }
  if (status === 429) {
    return "更新请求过于频繁，请稍后重试。";
  }
  if (status >= 500 && status < 600) {
    return `更新服务器暂时不可用（${status}），请稍后重试。`;
  }
  if (code === "ERR_UPDATER_NO_PUBLISHED_VERSIONS" || code === "ERR_UPDATER_LATEST_VERSION_NOT_FOUND") {
    return "更新源中尚未找到可用的正式版本，请稍后重试。";
  }
  if (code === "ERR_UPDATER_INVALID_RELEASE_FEED" || code === "ERR_UPDATER_INVALID_UPDATE_INFO") {
    return "无法读取更新版本信息，请联系发布者检查更新文件。";
  }
  if (code === "ERR_CHECKSUM_MISMATCH" || /checksum mismatch/i.test(message)) {
    return "更新包校验失败，请重新检查并下载更新。";
  }
  if (
    /^(?:ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ERR_(?:NETWORK|INTERNET|CONNECTION|NAME|TIMED_OUT))/.test(
      code
    ) ||
    /net::ERR_|network offline/i.test(message)
  ) {
    return "无法连接更新服务器，请检查网络后重试。";
  }
  return "更新失败，请稍后重试。";
}
