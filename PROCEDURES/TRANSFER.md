# Transfer (/transfer)

When ending a session:

1. Update BACKLOG.md with new/completed items
2. Update PROJECT_SPECIFICS.md with any new @tags
3. Git commit and push:
   ```
   git add -A && git commit -m "Session XXX: [summary]" && git push
   ```
4. Output the transfer prompt:

```
You are Session [XXX]. Sessions since last audit: [N].

Read these files:
- /Users/noahedery/Desktop/aiSketch/BRAIN.md
- /Users/noahedery/Desktop/aiSketch/PROJECT_INTENT.md
- /Users/noahedery/Desktop/aiSketch/BACKLOG.md

When you need implementation details, grep PROJECT_SPECIFICS.md:
  grep -A 20 "@tag-name" /Users/noahedery/Desktop/aiSketch/PROJECT_SPECIFICS.md

Check what last session did:
  git -C /Users/noahedery/Desktop/aiSketch log -5 --oneline

Current task: [FILL IN]
```
