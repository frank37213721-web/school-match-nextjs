import { Toast } from "@base-ui/react/toast";

export const toastManager = Toast.createToastManager();

export const toast = {
  success(description: string, title = "成功") {
    toastManager.add({ type: "success", title, description });
  },
  error(description: string, title = "發生錯誤") {
    toastManager.add({ type: "error", title, description, timeout: 8000 });
  },
  warning(description: string, title = "請注意") {
    toastManager.add({ type: "warning", title, description, timeout: 6000 });
  },
  info(description: string, title?: string) {
    toastManager.add({ type: "info", title, description });
  },
};
