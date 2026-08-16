# Windows 开机自启动运行方案

## 项目信息

| 项目 | 说明 |
|------|------|
| 项目路径 | `D:\Develop\zmyl-project` |
| 包管理器 | pnpm 10.30.0 |
| Node.js | >= 18 |
| 启动命令 | `pnpm dev`（开发）或 `pnpm build && pnpm preview`（生产） |
| 访问地址 | http://localhost:3000 |
| 数据库 | MySQL（localhost:3306，数据库：zhongmei） |

---

## 方案一：启动脚本 + 任务计划程序（推荐）

### 第 1 步：创建启动脚本

在项目根目录 `D:\Develop\zmyl-project` 下创建文件 `start.bat`：

```bat
@echo off
title ZMYL Project Server

:: 设置编码
chcp 65001 >nul

:: 进入项目目录
cd /d D:\Develop\zmyl-project

:: 启动生产服务（先构建再运行）
:: 如果已构建过，可直接使用 pnpm preview
echo [%date% %time%] Starting build...
call pnpm build

echo [%date% %time%] Starting server...
call pnpm preview

:: 如果进程异常退出，暂停查看错误
echo.
echo [%date% %time%] Server stopped unexpectedly.
pause
```

> **提示**：如果每次都要重新构建太慢，且代码没有变动，可以将 `call pnpm build` 注释掉，只保留 `call pnpm preview`。

### 第 2 步：创建后台静默启动脚本（可选）

如果不想弹出黑色命令行窗口，创建 `start-silent.vbs`：

```vbs
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c D:\Develop\zmyl-project\start.bat", 0, False
Set WshShell = Nothing
```

### 第 3 步：配置 Windows 任务计划程序

1. 按 `Win + R`，输入 `taskschd.msc`，回车打开任务计划程序
2. 右侧点击 **"创建基本任务"**
3. 填写名称：`ZMYL Project Auto Start`，点击下一步
4. 触发器选择 **"当用户登录时"**，点击下一步
5. 操作选择 **"启动程序"**，点击下一步
6. 程序或脚本填写：
   - 如果需要看到窗口：`D:\Develop\zmyl-project\start.bat`
   - 如果需要静默运行：`wscript.exe`
   - 添加参数（静默模式时填写）：`"D:\Develop\zmyl-project\start-silent.vbs"`
7. 起始位置填写：`D:\Develop\zmyl-project`
8. 点击完成

### 第 4 步：高级设置（可选）

双击已创建的任务，在 **"条件"** 选项卡中：
- 取消勾选 **"只有在计算机使用交流电源时才启动"**（笔记本适用）

在 **"设置"** 选项卡中：
- 勾选 **"如果任务运行时间超过以下时间则停止"** → 取消勾选（让服务一直运行）
- 取消勾选 **"如果请求后任务还在运行，强行将其停止"**

---

## 方案二：启动文件夹快捷方式（简单）

1. 按 `Win + R`，输入 `shell:startup`，回车打开启动文件夹
2. 将 `start-silent.vbs` 的快捷方式放入该文件夹
3. 下次开机登录后自动运行

---

## 方案三：注册为 Windows 服务（适合服务器环境）

### 使用 NSSM（Non-Sucking Service Manager）

1. 下载 NSSM：https://nssm.cc/download ，解压后将 `nssm.exe` 放入 PATH 目录

2. 以管理员身份打开 PowerShell，执行：

```powershell
# 安装服务
nssm install zmyl-project "C:\Program Files\nodejs\node.exe" "D:\Develop\zmyl-project\node_modules\.bin\nuxt.mjs preview"

# 设置工作目录
nssm set zmyl-project AppDirectory "D:\Develop\zmyl-project"

# 设置日志输出
nssm set zmyl-project AppStdout "D:\Develop\zmyl-project\logs\stdout.log"
nssm set zmyl-project AppStderr "D:\Develop\zmyl-project\logs\stderr.log"

# 设置服务描述
nssm set zmyl-project Description "ZMYL管理系统 - Nuxt 4 Production Server"

# 启动服务
nssm start zmyl-project
```

3. 管理命令：

```powershell
# 停止服务
nssm stop zmyl-project

# 重启服务
nssm restart zmyl-project

# 删除服务
nssm remove zmyl-project confirm

# 编辑服务（图形界面）
nssm edit zmyl-project
```

---

## 前置条件检查

### 确保 MySQL 服务已启动

项目依赖 MySQL 数据库，开机后需确保 MySQL 先于本项目启动。

检查方式：

```powershell
# 查看 MySQL 服务状态
Get-Service -Name "MySQL*"

# 如果未运行，手动启动
Start-Service -Name "MySQL80"   # 服务名根据实际修改
```

如果 MySQL 也是 Windows 服务，可在任务计划中设置 **延迟启动**（如延迟 30 秒），确保 MySQL 先就绪。

### 确保 pnpm 在 PATH 中

打开 PowerShell 验证：

```powershell
pnpm --version
node --version
```

如果提示找不到命令，需要检查 Node.js 和 pnpm 的安装及环境变量配置。

---

## 停止服务

| 方式 | 操作 |
|------|------|
| 任务计划启动的 | 在任务计划程序中右键 → **结束**；或在任务管理器中结束 `node.exe` 进程 |
| 启动脚本启动的 | 关闭命令行窗口；或在任务管理器中结束 `node.exe` 进程 |
| Windows 服务方式 | `nssm stop zmyl-project` 或 `net stop zmyl-project` |

---

## 常见问题

**Q: 开机后访问 localhost:3000 无响应？**
- 检查 MySQL 服务是否已启动
- 检查 `.env` 中数据库配置是否正确
- 查看任务计划中的任务是否成功运行（上次运行结果）

**Q: 端口 3000 被占用？**
- 在 PowerShell 中执行 `netstat -ano | findstr :3000` 查看占用进程
- 结束对应进程，或修改 Nuxt 配置使用其他端口

**Q: pnpm build 失败？**
- 确认已执行过 `pnpm install`
- 确认 Node.js 版本 >= 18

**Q: 如何修改启动端口？**
- 在项目根目录 `.env` 中添加 `NITRO_PORT=3001`，或在 `nuxt.config.ts` 中配置 `nitro.devServer.port`
