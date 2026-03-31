
lines = []
with open('nordic-app-builder/assets/js/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep 1-694 (indices 0-693)
part1 = lines[:694]

# Keep 1349-End (indices 1348-End)
# Note: Line 1349 is index 1348 (0-based)
part2 = lines[1348:]

new_content = "".join(part1 + part2)

with open('nordic-app-builder/assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("File spliced successfully.")
