!macro customHeader
  !system "echo '' > ${BUILD_RESOURCES_DIR}/customHeader"
!macroend

!macro preInit
    ReadRegStr $R0 HKEY_CURRENT_USER "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Glip" "UninstallString"
    
    StrCpy $1 0
    loop:
    IntOp $1 $1 + 1
    StrCpy $2 $R0 1 $1
    StrCmp $2 '"' stop loop
    stop:
    StrCpy $2 $R0 $1

    StrCpy $3 $2 "" 1

    MessageBox MB_OK $1
    MessageBox MB_OK $3
    IfFileExists $3 +1 NotInstalled
    MessageBox MB_OK "you have Glip installed"
    MessageBox MB_YESNO "Uninstall it?" IDYES true IDNO false
    true:
    ExecWait $R0
    Goto Quit
    false:
    MessageBox MB_OK "you should uninstall Glip first before install."
    Goto Quit
    
    NotInstalled:
    MessageBox MB_OK "you don't have Glip installed"

    Quit:
!macroend

!macro customInit
  !system "echo '' > ${BUILD_RESOURCES_DIR}/customInit"
!macroend

!macro customInstall
      CreateShortCut "$SMSTARTUP\filename.lnk" "$INSTDIR\filename.exe"
!macroend

!macro customInstallMode
  # set $isForceMachineInstall or $isForceCurrentInstall 
  # to enforce one or the other modes.
!macroend