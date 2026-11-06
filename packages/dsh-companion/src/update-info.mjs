// The signed release build is the existing ordering contract; version is its label.
export function updateInfo(release,installedBuild){
  const relation=release.build>installedBuild?'newer':release.build===installedBuild?'same':'older';
  return {version:release.version,available:relation==='newer',relation};
}
