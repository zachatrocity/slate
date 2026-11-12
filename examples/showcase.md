---
slide_theme: slate
paginate: true
footer: 'Slate · Marp showcase'
---
<!-- _paginate: false -->
# Slate
## A Markdown slide showcase

Write in Obsidian. Publish a slideshow and PDF.

**Swipe or use the arrow keys to explore.**

---
# One note. Many slides.

Separate slides with three hyphens:

```markdown
# First slide
A short introduction.

---
# Second slide
The next idea.
```

The examples in this deck are editable Markdown.

---
# Typography

**Bold** for emphasis. *Italic* for nuance. ~~Strike through~~ old ideas.

Use `inline code` for commands and [links](https://marp.app/) for references.

> A slide should carry one idea—not the entire meeting.

Markdown handles headings, quotes, lists, and paragraphs.

---
# Lists & structure

1. Write the story
2. Add supporting visuals
3. Publish and present

- Markdown stays readable
  - Even before rendering
- Reuse the same deck link after edits

---
# Tables

| Feature | Markdown | Output |
| :--- | :---: | ---: |
| Headings | `# Title` | Clear hierarchy |
| Emphasis | `**bold**` | Strong text |
| Images | `![](file.png)` | Bundled assets |
| Math | `$E=mc^2$` | Typeset equations |

Table alignment works just like Markdown documents.

---
# Syntax-highlighted code

```javascript
const presentation = {
  title: "My next idea",
  theme: "slate",
  formats: ["slideshow", "pdf"],
};

function publish(deck) {
  return `Ready: ${deck.title}`;
}
```

Name the language after the opening code fence.

---
# Mathematics

Inline notation: $E = mc^2$ and $a^2 + b^2 = c^2$.

$$
\frac{1}{\sqrt{2\pi}}\int_{-\infty}^{\infty} e^{-x^2/2}\,dx = 1
$$

Use `$...$` inline and `$$...$$` for display equations.

---
# Image sizing

![width:330](assets/crystal.png)

`![width:330](assets/crystal.png)`

Local images travel with the presentation.

---
![bg right:45%](assets/crystal.png)
# Split layout

Keep text on one side and a visual on the other.

```markdown
![bg right:45%](assets/crystal.png)
```

Use `left` to reverse the arrangement.

---
![bg brightness:0.3](assets/crystal.png)
# Full-slide backgrounds

Use a background image and darken it for legibility.

```markdown
![bg brightness:0.3](assets/crystal.png)
```

Foreground text remains ordinary Markdown.

---
# Image filters

![width:260 grayscale](assets/crystal.png) ![width:260 sepia](assets/crystal.png)

```markdown
![width:260 grayscale](assets/crystal.png)
![width:260 sepia](assets/crystal.png)
```

Filters change the presentation, not the original image.

---
<!-- _backgroundImage: linear-gradient(135deg, #38245d, #141321) -->
# Per-slide styling

This slide uses a CSS gradient—no image file needed.

```markdown
<!-- _backgroundImage: linear-gradient(135deg, #38245d, #141321) -->
```

The underscore applies a directive to **this slide only**.

Without it, local directives continue onto following slides.

---
# Headers, footers & page numbers

This deck uses a footer and automatic pagination.

```yaml
paginate: true
footer: 'Slate · Marp showcase'
```

Hide numbering for one slide:

```markdown
<!-- _paginate: false -->
```

---
# Themes & slide sizes

Choose `slate`, `default`, `gaia`, `uncover`, or `graph_paper`.

```yaml
slide_theme: slate
size: 16:9
```

Use `size: 4:3` for a different canvas.

Custom Marp CSS themes can define their own layout classes.
A class only changes layout when the selected theme implements it.

---
# Speaker notes & export boundaries

Marp uses HTML comments for speaker notes:

```markdown
<!-- Remind the audience to try publishing from their phone. -->
```

Slate currently has **no presenter-notes view**.

Slate exports **HTML slideshows and PDF**. PowerPoint export,
transitions, and a presenter console belong to other Marp tooling.

<!-- Presenter reminder: this is an authoring example, not a Slate notes-view demo. -->

---
# Make this deck yours

1. Edit **Slate - First Presentation** in Obsidian
2. Run **Slate: Publish slides**
3. Open `slides_url` or `slides_pdf`

Republishing keeps the same links.

[Marp](https://marp.app/) · [Directives](https://marpit.marp.app/directives) · [Image syntax](https://marpit.marp.app/image-syntax)
