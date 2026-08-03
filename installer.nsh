!macro preInit
  StrCpy $INSTDIR "$PROFILE\programs\vinyl"
!macroend

!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Créer un raccourci sur le Bureau"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION $0

!macro customInit
  GetFunctionAddress $0 CreateDesktopShortcutFunc
!macroend

!macro customUnInit
  GetFunctionAddress $0 un.CreateDesktopShortcutFunc
!macroend

Function CreateDesktopShortcutFunc
  CreateShortCut "$DESKTOP\Vinyle.lnk" "$INSTDIR\Vinyle.exe"
FunctionEnd

Function un.CreateDesktopShortcutFunc
  # Do nothing
FunctionEnd
