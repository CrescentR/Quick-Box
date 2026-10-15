# 构建与发布指南

[返回首页](../README.md) · [文档中心](README.md) · [开发指南](development.md) · [安装与使用](usage.md)

`.github/workflows/release.yml` 会检查、打包并自动发布 GitHub Release。安装包包含 Windows x64 的 NSIS `.exe`、MSI `.msi`，以及 Linux x64 的 `.AppImage`、`.deb`，同时提供 `SHA256SUMS.txt` 校验文件。

| 触发方式 | 结果 |
| --- | --- |
| Pull Request | Check 工作流执行验证，不创建发行版 |
| 推送 `main` / `master` | 检查与打包通过后，发布带提交标识的预览版 |
| 推送 `vX.Y.Z` 标签 | 版本校验通过后，发布正式版 |
| 手动运行 Release | 按所选分支或正式标签执行对应发布流程 |

## 推送代码自动发布预览版

将代码推送到 `main` 或 `master` 即可触发，无需创建标签或手动发布草稿。全部平台通过检查和构建后，工作流会发布一个 Pre-release，例如：

```text
v1.0.0-build.42.1.a1b2c3d
```

标签包含应用版本、Actions 运行编号、重试次数和提交短 SHA。连续推送或重新运行工作流会使用不同标签，不会覆盖之前的安装包。预览版不会替代正式版的 Latest 标记。

也可以在 GitHub 的 **Actions → Release → Run workflow** 手动运行。选择分支会生成预览版；选择正式版本标签则执行正式发布。

## 发布正式版

先同步以下三处版本，格式为 `X.Y.Z`：

- `package.json` 的 `version`
- `src-tauri/Cargo.toml` 的 `[package].version`
- `src-tauri/tauri.conf.json` 的 `version`

提交后推送同版本的标签，例如：

```bash
git tag v1.0.0
git push origin v1.0.0
```

工作流会校验标签与三处版本完全一致；`v1.0.1` 标签不能构建版本仍为 `1.0.0` 的代码。正式版本发布后不要移动同名标签或覆盖资产，需要修复时提升版本再发布。

## 检查与发布方式

工作流使用 Node.js 24、pnpm 9.15.4 和 Rust stable。Windows、Linux 都会执行前端类型检查、前端测试和 Rust 单元测试，再打包安装程序。任一检查、构建或资产完整性校验失败，均不会发布该次 Release。

两个平台的安装包先保存在 Actions artifacts 中，最后由一个发布任务统一检查四种安装包、生成校验文件，再上传至临时草稿。只有全部上传成功后才自动发布，下载区不会出现只有部分平台安装包的版本。上传失败时可能保留未发布草稿；正式版本重试前需在 GitHub Releases 中删除该次未发布草稿。已发布版本不会被自动覆盖。

仓库需要启用 GitHub Actions，并允许工作流使用 `GITHUB_TOKEN` 的 `contents: write` 权限；只有最终发布任务申请写权限，不需要额外 PAT。若仓库或组织规则禁止 Actions 创建标签或 Release，需要调整对应规则。可在 Actions 的 Release 工作流查看构建日志和安装包，在 Releases 中下载发布结果。

## 当前平台范围

目前自动构建 Windows x64 和 Linux x64。macOS 构建配置保留在项目中，GitHub 工作流暂未启用 macOS；后续可以在具备签名和公证配置后加入。

## 配置参考

- [GitHub Actions 工作流语法](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Tauri 官方构建 Action](https://github.com/tauri-apps/tauri-action)
- [GitHub CLI 创建 Release](https://cli.github.com/manual/gh_release_create)
- [GitHub CLI 发布草稿](https://cli.github.com/manual/gh_release_edit)
