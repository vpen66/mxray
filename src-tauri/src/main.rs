// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 特权助手模式：由 launchd 以 MXRAY_HELPER_MODE=1 启动时，
    // 主程序以守护进程方式运行，不启动 GUI。
    #[cfg(unix)]
    if std::env::var_os("MXRAY_HELPER_MODE").is_some() {
        mxray::helper::run();
        return;
    }

    mxray::run();
}
