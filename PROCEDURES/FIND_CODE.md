# Finding Code

Always use @tags to find code. Never search blindly.

1. Check PROJECT_INTENT.md — find the relevant @tag
2. Grep PROJECT_SPECIFICS.md for details:
   ```
   grep -A 20 "@tag-name" /Users/noahedery/Desktop/aiSketch/PROJECT_SPECIFICS.md
   ```
3. Grep the codebase for the tag:
   ```
   grep -A 50 "@tag-name" path/to/file.ext
   ```
