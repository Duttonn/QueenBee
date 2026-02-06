export const parseDiff = (hunks: any[]) => {
  const leftLines: any[] = [];
  const rightLines: any[] = [];

  hunks.forEach(hunk => {
    let leftLineNum = hunk.oldStart;
    let rightLineNum = hunk.newStart;

    hunk.lines.forEach((line: string) => {
      const type = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : 'neutral';
      const content = line.substring(1);

      if (type === 'neutral') {
        leftLines.push({ type, content, line: leftLineNum });
        rightLines.push({ type, content, line: rightLineNum });
        leftLineNum++;
        rightLineNum++;
      } else if (type === 'del') {
        leftLines.push({ type, content, line: leftLineNum });
        rightLines.push({ type: 'neutral', content: '', line: undefined });
        leftLineNum++;
      } else if (type === 'add') {
        leftLines.push({ type: 'neutral', content: '', line: undefined });
        rightLines.push({ type, content, line: rightLineNum });
        rightLineNum++;
      }
    });
  });

  return { leftLines, rightLines };
};
