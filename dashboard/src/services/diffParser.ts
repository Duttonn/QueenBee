export const parseDiff = (hunks: any[]) => {
  const leftLines: any[] = [];
  const rightLines: any[] = [];

  hunks.forEach(hunk => {
    let leftLineNum = hunk.oldStart;
    let rightLineNum = hunk.newStart;

    const hunkLines = hunk.lines;
    let i = 0;

    while (i < hunkLines.length) {
      const line = hunkLines[i];

      if (line.startsWith(' ')) {
        // Neutral line
        const content = line.substring(1);
        leftLines.push({ type: 'neutral', content, line: leftLineNum });
        rightLines.push({ type: 'neutral', content, line: rightLineNum });
        leftLineNum++;
        rightLineNum++;
        i++;
      } else if (line.startsWith('-') || line.startsWith('+')) {
        // Change block
        const deletions: string[] = [];
        const additions: string[] = [];

        // Collect all consecutive deletions and additions
        while (i < hunkLines.length && (hunkLines[i].startsWith('-') || hunkLines[i].startsWith('+') || hunkLines[i].startsWith('\\'))) {
          const l = hunkLines[i];
          if (l.startsWith('-')) {
            deletions.push(l.substring(1));
          } else if (l.startsWith('+')) {
            additions.push(l.substring(1));
          } else if (l.startsWith('\\')) {
            // Meta line - append to the last deletion or addition
            if (additions.length > 0) {
              additions[additions.length - 1] += '\n' + l;
            } else if (deletions.length > 0) {
              deletions[deletions.length - 1] += '\n' + l;
            }
          }
          i++;
        }

        const maxLines = Math.max(deletions.length, additions.length);
        for (let j = 0; j < maxLines; j++) {
          if (j < deletions.length) {
            leftLines.push({ type: 'del', content: deletions[j], line: leftLineNum });
            leftLineNum++;
          } else {
            leftLines.push({ type: 'empty', content: '', line: undefined });
          }

          if (j < additions.length) {
            rightLines.push({ type: 'add', content: additions[j], line: rightLineNum });
            rightLineNum++;
          } else {
            rightLines.push({ type: 'empty', content: '', line: undefined });
          }
        }
      } else {
        // Should not happen with valid diff
        i++;
      }
    }
  });

  return { leftLines, rightLines };
};
