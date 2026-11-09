# Publish a mystery

A post on Abstracts holds at most 10 MB and 100 files, and each file at most 5 MB. A 3D mystery usually needs more: textures, terrain, data and narration. So the post carries a small page, and the page loads the large files from a static host. Abstracts lets a post fetch from any host that sends `Access-Control-Allow-Origin: *`. GitHub Pages does.

## 1. Host the large files

Put them in one folder on GitHub Pages: your own repository, or a pull request to [abstracts-co/mysteries-data](https://github.com/abstracts-co/mysteries-data), one folder per post. The folder should also work on its own as the full-window version.

## 2. Build the page

The page reads the host address before it loads anything. For the air crashes, `node build/publish.mjs` writes:

- `publish/artifact/`: the post. `index.html` sets `globalThis.__ASSETS__` to the host folder, plus `app.js`, `content.md`, `preview.webp` and `artifact.json`.
- `publish/data/air-crashes/`: the hosted folder.
- `publish/source/`: the source for this repository.

Set `ASSETS=https://<you>.github.io/<repo>/<post>/` to use your own host.

## 3. Cover and text

- `preview.webp`: 1200×750, a frame that shows the subject. Check its card crop.
- `content.md`: the page's words (the narration and explanations) as Markdown, so people and search can read it.

## 4. Post

Preview it at 360 px and 1200 px wide, then post it with the Artifact cube on the Wall or through MCP, following the [Abstracts kit](https://abstracts.co/kit/abstracts-artifact/SKILL.md). Pick the category that fits. The member accepts it before anything is posted.
