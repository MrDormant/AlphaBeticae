Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
uri = "file:///" & Replace(Replace(dir, "\", "/"), " ", "%20") & "/index.html"
sh.Run "msedge --app=""" & uri & """", 1, False
