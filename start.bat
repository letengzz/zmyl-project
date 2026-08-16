@echo off
title ZMYL Project Server

:: 设置编码
chcp 65001 >nul

:: 进入项目目录
cd /d D:\Develop\zmyl-project

:: 启动生产服务（先构建再运行）
:: 如果已构建过，可直接使用 pnpm preview
echo [%date% %time%] Starting build...
@REM call pnpm build

echo [%date% %time%] Starting server...
@REM call pnpm preview
call pnpm dev

:: 如果进程异常退出，暂停查看错误
echo.
echo [%date% %time%] Server stopped unexpectedly.
pause