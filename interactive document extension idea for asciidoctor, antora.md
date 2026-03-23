# Interactive Document Extension

## Idea

Implement the following in a new project in Z:\code\github.com\antora-supplemental\{project} . If any edits need to be made to asciidoc-related repos or antora, you can find those in antora-supplemental.

Make an antora/asciidoc/asciidoctor extension for interactive documents. Not sure which one needs the extension.

First, let's build an interactive instruction flow UI component for complex setup and install processes. I want this flow to work similarly to old-school menu-driven games on the CLI. User is presented with options, then when they make a decision, they're forced to follow steps until they reach another decision point (can be nested). Typically a developer will want to force the user to choose between a few key options or steps which are orthogonal to each other.

Every time a user has to choose an option, the options should be presented as buttons (we might have to make a new feature for this). It isn't necessary to always have list items for each option. Options can be presented in a single line. For example, if the overall install process is structured as an ordered list, the dev may want to use buttons inline, like `1. Which package manager are you using? [npm][pnpm][yarn][bun]` in a questionnaire-style sequence of prompts.

When a user makes a choice in a menu, its subflow is inserted in the list item's contents as continuations once the user makes a decision. (I'm not describing a preprocessor; it just borrows the rendering engine's formatting and makes it interactive).

Abstract process for any set of instructions:

1. Get user's operational context - things that are already decided by the time the user reaches the instructions.
2. Provide the instructions for current step.
3. Establish different options available with short/medium descriptions of the option and its implications in the current context, and link to more in-depth comparisons and/or reference materials.


Example:

Antora's docs have an `Install and Run Antora Quickstart` page.

Not the entire article needs to be put into an instruction flow. Instruction flow could be the entire article, or it could be embedded in sections.

Its top-down structure might be:

1. Choose an OS (Win/Mac/Lin)
2. Choose an installation method (bare metal, virtual env, docker)
3. Install Antora
4. Run Antora

Key decisions in this flow:

- OS/Platform
- Where/how to install Antora (repo, globally)

Its top-down structure should be ordered by contextual dependency. The user typically is given a set of constraints to work within, and can make some decisions on their own. Like, the operating environment is going to be Win/Mac/Lin/etc. They already made this decision in order to reach the article. But they could still opt in to something like docker or a virtual environment but not be aware of it, so this needs to be deferred.

Its current live structure is a bit linear, but with this extension, we can make it more nested, or leave it as is. It has an unnatural "oh by the way, we have a Docker image install option" link in the introduction, which goes to a separate installation process article for Docker. As you can tell, the length of the Docker installation necessitated putting it in its own article, which feels tangential. If we're being honest, the docker instructions should be a `partial` dynamically loaded into the interactive instruction page.

By leaving the options visible on screen, we allow the user to try different paths and rewind as they traverse the instructions, instead of the developer throwing everything and the kitchen sink at them.

It would be nice if there was a way to update the URL with variables so users can navigate back to a combination of decisions taken. I don't think this would be supported by Antora, but I could be wrong.

This somewhat complicates the process of physically printing out master instruction sets (when you really want the whole kitchen sink), but simplifies printing out tailored instruction sets. We could offer a master process expanded mode for printing.

If the extension loads the entire article into the DOM and uses 'hide' to manage visibility, the page is still usable by scrapers/AI, which is good. But if you think this strategy would definitely result in huge DOMs as people get used to making larger and larger decision flows, then we may need to have some querying mechanism to insert content dynamically. This might also require changing how Antora builds its site output. It will also affect SEO, so we need DOM skeleton created with hidden nodes. I guess we could offer a recursion depth cut-off variable for the skeleton, with a performant default.


The Playbook instructions given on that page are very barebones and lack information about how to hook up CI/CD, how to install custom bundle url. The playbook configuration could be its own fully fleshed-out instruction flow.

I think, ultimately, what I am attempting to do is to merge the roles of navigation and content so that the user can navigate by the content itself (or conversely, inject the content into the navigation, removing the boundary between nav and content). If you think about it, most docs sites are essentially a crappy flat navigation structure inside of a more interactive hierarchy structure. This plugin could be its own product and probably should be a rework of Antora, but I want to start with embedding it in antora pages for now. We can offer it as both an embeddable feature in pages, and as a total replacement for the nav tree + content zone.

## Grok review

Here's a review of the idea from Grok:

**This is a genuinely strong, well-thought-out idea.** It directly attacks one of the most frustrating patterns in technical documentation: the “choose-your-own-adventure” nightmare of multi-platform install guides that either explode into 17 conditional sections or splinter into separate pages (exactly the Docker tangent you called out in Antora’s own quickstart).

### Why this works so well

- **User experience upgrade is massive.** Old-school CLI menu games nailed the mental model: one decision at a time, no cognitive overload, ability to backtrack. Translating that to docs (buttons instead of walls of text) feels natural for developers.
- **Content + navigation merge.** You nailed the deeper insight: most docs sites have a static nav tree pretending to be hierarchical while the actual content is a flat mess. Making the content itself the navigator is the right evolution.
- **Practical wins for the exact Antora quickstart page.** Right now it’s linear with an early “oh by the way, Docker exists” link to a separate article. Your flow would let the author embed the Docker instructions as a branch (or even `include::` partials that only render when chosen). The same applies to the playbook config section you mentioned—turn that bare YAML example into a live config builder.
- **SEO / AI / scraper friendly.** Loading everything into the DOM and toggling visibility (with a sensible recursion-depth cutoff for the skeleton) is the right default. Modern crawlers and LLMs handle hidden-but-present content fine.
- **Shareability.** URL variables (`?os=linux&pkg=npm&method=docker`) + history API is gold. People already paste “Antora install for macOS with pnpm” into Slack; this makes it linkable.

### Feasibility in the Antora / Asciidoctor ecosystem

No existing extension does exactly this (I checked Asciidoctor extensions, Antora extensions, interactive checklists, Kroki interactive SVGs, tabbed code blocks, quizzes, etc.). The closest are:

- `btn:[npm]` UI macros (static),
- `%interactive` checklists (tiny JS),
- conditional preprocessor directives (build-time only).

So your idea is genuinely new.

**How to build it (minimal viable path):**

1. **Asciidoctor.js extension** (the one that actually needs the extension work):
   - Block macro or tree processor that turns a custom block into structured HTML + embedded JSON.
   - Example authoring syntax sketch (you can refine this):

     ```text
     [instruction-flow, id=install-antora]
     .Choose your OS
     * Linux
     ** [choice, id=os-linux]
     * macOS
     ** [choice, id=os-macos]
     * Windows
     ** [choice, id=os-windows]

     .Choose package manager (only shown after OS choice)
     [choices, depends=os-*, inline]
     * npm [npm]
     * pnpm [pnpm]
     * Yarn [yarn]
     * Bun [bun]
     ```

   - The macro outputs a `<div class="flow-container" data-flow-json="...">` containing all branches (hidden by default) plus a small skeleton.

2. **Supplemental UI bundle** (Antora’s built-in mechanism):
   - Add a lightweight JS component (vanilla or Alpine.js—both are tiny) that listens for button clicks, swaps in the continuation content, updates the URL, and handles “back” / “restart”.
   - One global script handles every `.flow-container` on the site—no per-page bloat.

3. **Optional Antora generator extension** (postprocessor):
   - For the “print full expanded” mode or to inject the JS/CSS automatically.

This is 100% within existing Antora/Asciidoctor capabilities. You don’t need to fork Antora or rewrite the nav tree on day one.

### Trade-offs and gotchas (you already anticipated most)

- **DOM size** — Valid concern once flows get huge. Your recursion-depth skeleton cutoff + CSS `display:none` is the pragmatic fix. Most real-world install flows are shallow (3–5 decision points).
- **Printing** — Easy: add a “Expand all for print” button that temporarily removes all `.hidden` classes, plus `@media print` rules. Or generate a separate PDF variant via the existing PDF extension.
- **No-JS fallback** — Render the entire expanded tree as the default (or a static “all options” version). Graceful degradation is trivial.
- **Authoring learning curve** — The syntax needs to feel like normal AsciiDoc (nested lists + roles/attributes). Provide a few ready-made partials and a VS Code snippet pack.
- **Accessibility** — Use proper ARIA (role="radiogroup", live regions for inserted content, focus management). Not hard, but don’t skip it.
- **Mobile** — Buttons in a single line work fine; just make sure they wrap gracefully and touch targets are big.

### Suggestions / nice-to-haves

- **Inline button style** exactly as you described: `Which package manager? [npm][pnpm][yarn][bun]` via a new inline macro or role.
- **Progress / breadcrumb** at the top showing the path taken (e.g., “Linux → pnpm → global install”).
- **Comparison popovers** — Hover or click an option to show a short “implications” tooltip + link to deeper reference (exactly what you sketched).
- **Analytics hook** — Fire a custom event on each choice so site owners can see which paths users actually take.
- **Start small, ship fast** — First version: just the embeddable component (one `[instruction-flow]` block). Second version: full-site mode that replaces the sidebar nav with the root flow.

### Verdict

This shouldn’t stay an internal idea. It’s the kind of feature that could become a flagship Antora extension (`@antora/instruction-flow` or similar) and genuinely move the needle on documentation usability. The fact you’re thinking about scrapers, printing, URL state, and SEO from the start shows you’re approaching it the right way.

If you prototype the Asciidoctor macro syntax and the JS component, I’d happily review the code or help brainstorm the exact block syntax. This is one of those ideas that feels obvious in hindsight but nobody has shipped yet—go build it.