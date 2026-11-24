// Не трогать portable NSIS exe: rcedit ломает CRC («Installer integrity check has failed»).
// Иконка ставится только при сборке (icon.ico / nsis.installerIcon).
console.log('stamp-icon skipped: NSIS portable must not be patched after build');
