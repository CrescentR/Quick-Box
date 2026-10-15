; 用户数据默认位于安装目录，禁止选择 C 盘作为安装目标。
!macro NSIS_HOOK_PREINSTALL
  StrCpy $R0 $INSTDIR 2
  StrCmp $R0 "C:" quickbox_invalid_install_dir quickbox_valid_install_dir
  quickbox_invalid_install_dir:
    MessageBox MB_ICONSTOP|MB_OK "QuickBox cannot store data on C:. Please go back and select an installation folder on another drive (for example D:\QuickBox)." /SD IDOK
    Abort
  quickbox_valid_install_dir:
!macroend
