# QuickBox 图标优化稿 v1

- 生成方式：内置 image_gen 工具，基于用户提供的 `quickbox-app-icon-concept-b.png` 编辑。
- 输出：[quickbox-app-icon-refined-v1.png](quickbox-app-icon-refined-v1.png)，1254 × 1254，RGBA PNG。
- 设计目标：保留黑金配色、等距盒子 / Q 和鼠标指针的融合构思；统一几何关系、减少泛光、收紧指针比例、移除白色外边框。
- 用途：用户已确认采用的应用图标母版；正式源文件为 `src-tauri/app-icon.png`，各平台与网页资源由此生成。

## 实际生成提示词

```text
Use case: precise-object-edit, logo-brand refinement.
Asset: one refined desktop application icon for QuickBox, square high-resolution PNG.
Image 1 is the edit target and brand identity to preserve. Refine this exact design, not an unrelated redesign: a warm gold ribbon outlines an isometric open box and the letter Q, with a northwest-pointing mouse cursor integrated into the lower-right tail, on a dark charcoal rounded-square tile.
Keep the core silhouette, black-and-gold palette, isometric viewpoint, open diamond-shaped top, and integrated box/Q/cursor idea.
Improve the design with precise, consistent geometry: coherent parallel isometric edges, nearly uniform perceived ribbon thickness, controlled corner radii, smooth intentional joins, clean negative space. Reduce the lower-right cursor by about 15 percent, simplify its cuts to a clearly recognizable cursor arrow and short stem, and integrate it gracefully with the Q tail so it does not resemble lightning. Optically center the complete silhouette, accounting for the cursor's weight. Keep comfortable padding between the symbol and tile edges.
Use restrained satin warm gold from #FFE477 through #F0B43C to a little #E9A32A; no white-hot highlights. Replace the broad bloom with very subtle, narrow ambient warmth at most; prioritize crisp edges and bold contrast. Simplify the interior charcoal planes so they suggest the box without muddy dark facets or unnecessary fine seams. The rounded-square tile should be a quiet near-black #191B1F with barely perceptible depth, no grain, no decorative texture, no heavy bevel.
Make this feel like a polished, professional developer utility icon. Favor a clean vector-like finish and a simple enough silhouette for Windows taskbar use at 24–32 pixels, while retaining subtle dimensionality in the gold ribbon at large size.
Composition: ONLY one centered complete icon, straight-on graphic presentation, square canvas. Remove the original white perimeter: the charcoal rounded-square tile reaches the canvas bounds along its straight sides, and only its exterior rounded corners are genuinely transparent alpha. Gold mark remains inside tile. No white background or border, no drop shadow outside the tile, no text or letters added, no labels, no presentation board, no mockup, no extra icons, no watermarks.
```
