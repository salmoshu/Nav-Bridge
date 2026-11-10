import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography
} from "@mui/material";
import type { AppUpdateState } from "../../shared/update";
import {
  compactDialogActionsSx,
  compactDialogButtonSx,
  compactDialogContentSx,
  compactDialogTitleSx
} from "../lib/compactUi";

export function UpdateDialog({
  open,
  state,
  onClose,
  onCheck,
  onInstall
}: {
  open: boolean;
  state: AppUpdateState;
  onClose: () => void;
  onCheck: () => void;
  onInstall: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={compactDialogTitleSx}>Nav-Bridge 更新</DialogTitle>
      <DialogContent sx={compactDialogContentSx}>
        <Stack spacing={1.5}>
          <Typography fontSize="0.8125rem">
            V{state.currentVersion}
            {state.availableVersion != undefined && ` -> V${state.availableVersion}`}
          </Typography>
          {state.phase === "checking" && (
            <>
              <Typography variant="body2">正在检查更新…</Typography>
              <LinearProgress />
            </>
          )}
          {state.phase === "not-available" && <Typography variant="body2">当前已是最新版本。</Typography>}
          {state.phase === "downloading" && (
            <>
              <Typography variant="body2">正在下载更新… {Math.floor(state.progress ?? 0)}%</Typography>
              <LinearProgress variant="determinate" value={state.progress ?? 0} />
              <Typography variant="caption" color="text.secondary">
                可以关闭此窗口，下载将在后台继续。
              </Typography>
            </>
          )}
          {state.phase === "downloaded" && (
            <Typography variant="body2">更新已下载完成，重启应用后即可安装。</Typography>
          )}
          {state.phase === "installing" && (
            <Typography variant="body2">正在停止数据转发并重启更新…</Typography>
          )}
          {state.error != undefined && (
            <Alert severity={state.phase === "unsupported" ? "info" : "error"}>{state.error}</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={compactDialogActionsSx}>
        {(state.phase === "error" || state.phase === "not-available") && (
          <Button size="small" onClick={onCheck} sx={compactDialogButtonSx}>
            重新检查
          </Button>
        )}
        <Button size="small" onClick={onClose} sx={compactDialogButtonSx}>
          关闭
        </Button>
        {state.phase === "downloaded" && (
          <Button size="small" variant="contained" onClick={onInstall} sx={compactDialogButtonSx}>
            更新
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
