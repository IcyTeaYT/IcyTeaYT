# Cinematic scroll sites without video generation

A cinematic site is one where the visitor scrolls and a camera seems to travel through a real place while the story unfolds over it, then the page settles into a real website with one clear call to action. This playbook builds that from **still images** (made in ChatGPT or Nano Banana, or real photos) brought to life in code, with **procedural shader scenes** as the backup when there are no images. No paid video tools, no API keys, no particular host.

## Where the visuals come from (in this order)

1. **The user's own footage or photos.** Real always wins. Footage: `scripts/frames.sh` + `assets/scroll-sequence/`. Photos: the image path below.
2. **AI stills from ChatGPT or Nano Banana** (free tiers are enough). Write the prompts with `scripts/image-prompts.mjs`; the user generates and sends the files back.
3. **Procedural shader scene** (`assets/cinematic/cinema-shaders.js`: `clouds` (cloud sea at golden hour), `ocean` (sunset waves), `aurora` (night sky over a ridge), `liquid` (dark molten rock / metal), `silk` (smooth folds of light)) when there are no images yet, as a placeholder while images are made, or when an abstract world suits the brand (tech, finance, luxury).
4. Higgsfield video (`references/higgsfield.md`) only if the user asks for real generated motion and has an account.

## The image path

1. **Plan the page first, then the film.** Decide the sections, the story beats and where every headline lands (see "Plan" below). The images exist to carry those beats.
2. **Prompts:** `node <skill-dir>/scripts/image-prompts.mjs --subject ... --setting ... --light ... --shots N --journey "..." --text left --palette "#..,#.." [--layers true] [--sections "a,b"] --out IMAGE-PROMPTS.md`. Give the user the file and a short version in chat: which tool, which prompt first, what to send back.
3. **Check every image** before using it: melted or doubled details, stray text or logos (AI loves tiny signs), the text side calm, journey frames consistent. Ask for a regeneration of a bad frame; it costs the user nothing.
4. **Prepare the film assets in one step:** `node <skill-dir>/scripts/prepare-film.mjs <site>/film shot1.png shot2.png --phone shot1-9x16.png,- --focus "0.55,0.6;0.5,0.5"`. It writes full-resolution desktop and phone WebPs, high-quality depth maps for both (first run downloads a 100 MB model), a quality report and `film.json`. Look at each depth map: near = white, far = black. If the subject is not clearly separated, regenerate the image with stronger foreground/background separation rather than fighting it.
5. **Read the quality report** and fix every warning (see Quality floor).
6. **Build:** copy `assets/cinematic/cinema.js` and `cinema.css` into the site and write the `data-cine` config (documented at the top of `cinema.js`): one shot per image with its scroll range, focus point, start and end camera, plus atmosphere.
7. **Prove it:** the normal loop (compare, record + `video-ref.sh`, slop-check) plus the self-test below.

## Quality floor (every cinematic build, no exceptions)

- **Source resolution:** desktop images at least 2560 px wide, ideally 3840 (Nano Banana Pro can output 4K; pick the highest setting). Phone images 9:16 at least 1440x2560. ChatGPT tops out near 1536 px: upscale those first with a real AI upscaler (the free **Upscayl** desktop app, x2 or x4, model "Ultrasharp" or "Remacri"), never by plain resizing.
- **Always run `scripts/prepare-film.mjs`:** it keeps native resolution (WebP quality 92), makes the 9:16 phone version (supplied or cropped around the focus), creates high-quality depth maps, and prints a report. Fix every "!" line in the report before building.
- **Phone versions are mandatory** (`imageMobile` / `depthMobile` on every shot). A landscape image cropped to a phone shows only about a third of its pixels.
- **Render at native density:** the engine renders at the screen's devicePixelRatio (up to 3x) with mipmapped, anisotropically filtered photos and steps down only below about 30 fps. Do not lower it.
- **Effects never cost sharpness:** `sky` is 0 on shots without open sky (drift on detailed areas smears them); light rays and fog stay subtle (rays 0.2 to 0.4, fog 0.1 to 0.2); grain 0.015 or less.
- **Verify at real phone density:** screenshot the film with a 390x844 viewport at deviceScaleFactor 3 and look at 1:1 crops of each shot (subject edges, water, foliage, text). Soft or jagged crops fail; find the cause (source resolution, an effect, a camera move beyond the ranges) and fix it before showing anyone.

## The laws (for image scenes and shader scenes)

1. **Scroll down should feel like going forward or down.** Push in, descend, approach, open up. A camera that retreats while the visitor scrolls forward feels wrong.
2. **One continuous journey.** One camera path through one world. Between images, the next frame must look like the same place from further along, or the dissolve reads as a cut.
3. **The path is locked, the world is alive.** Camera moves are smooth and scroll-bound; the scene keeps moving on its own: sky drift, fog, light, particles, flowing water (`flow` on a shot). A frozen world on a smooth path looks dead.
4. **Plan the resting frame first.** The last shot's end camera is where the page settles; it must be a composed, satisfying view with room for the settle line.
5. **Choose forgiving subjects.** Landscapes, architecture, water, sky, light, fabric, objects at a distance. Close faces and hands break first, both in generation and in depth parallax.
6. **Compose for the words.** Every frame keeps a calm region where text will sit (the prompts ask for it). Captions live there; the subject's lane stays clear.
7. **Moves stay inside what the image knows.** A depth map can only reveal a little of what is behind a foreground object. Good ranges: `dolly` up to about 0.6, `x`/`y` up to about 0.05, `zoom` up to about 1.15, `rot` up to about 0.02. Bigger moves need layers or another frame.
8. **Text over a moving image earns its legibility.** Each caption gets the built-in local scrim and shadow; check it against the worst frame of its band, not the average. If it fails, move it to a calmer region or strengthen `--scrim`.
9. **Pace captions in scroll distance.** Each beat holds fully visible for most of its band with short ramps (`data-ramp`, default 0.035), so a reader flicking the wheel never misses a line. Test by flick-scrolling like a visitor, not slow dragging.
10. **No text, logos or real brands in generated images.** Logos go on the page, not in the picture.

## Plan (write it before prompting, keep it short)

One file, `PLAN.md` in the scratch folder:

- **Premise:** what the site sells or says, for whom, the one call to action.
- **Customer language:** if web search is available, read a handful of real reviews or forum threads in the niche and note the exact phrases buyers use for their pain, the outcome they want and their hesitations. Otherwise ask the user to paste a few reviews or name common objections. Write the copy in those words.
- **Beat map:** for the scroll film, each caption with its scroll band (`0.00–0.20 "..."`), and which shot is on screen.
- **Below the film:** section list in order, each with its job (proof, how it works, answers to real objections, pricing if any, the final call to action). Every section earns the next scroll toward the one call to action.
- **Look:** palette pulled from the images (3 to 5 colours), a display face, a body face, optionally a mono for small labels. Not Inter or Roboto as the display face.

Copy rules: short, plain, in the brand's own voice, one idea per caption, sized for one scroll flick. Before showing anything, search the page for em dashes and the words leverage, seamless, empower, unlock, robust, actionable, elevate, delve, testament, landscape, solutions, and rewrite every hit. Also cut "it's not just X, it's Y" and vague "experts say" lines.

## Below the film

The film is the opening, not the site. Under it goes a real website: navigation, sections built from the brand's own motifs, the resting frame reused as an image, proof, how it works, answers to objections, pricing if relevant, one final call to action, footer (disclose generated imagery or a fictional brand when that applies). One small living detail per section at most (a line drawing itself, a slow parallax image, a subtle hover); everything eases, nothing snaps.

**Forms on a static site:** say honestly where submissions go: a thank-you state only (demos), a `mailto:` link, a free form service the user signs up for (Formspree, Basin, Netlify Forms), or a link to an existing checkout.

## Self-test before showing anyone

- Screenshot top, middle and end of the film; flick-scroll the whole beat map; every caption readable on its worst frame.
- Phones (390 wide): the crop keeps the subject (set each shot's `focus`), no horizontal scroll, captions fit.
- `prefers-reduced-motion`: the film is replaced by the still and the captions read as normal blocks.
- No WebGL or an image fails to load: the first still shows, nothing is blank.
- Console clean; every button and the form work; `slop-check.mjs` has no HIGH (the film canvas is marked `data-media`).
- Copy search above returns nothing.
- Weight: phones load only the phone versions (about 1 to 2 MB for a two-shot film); desktops load the full-resolution set. Quality wins over size, but lazy-load anything below the film.
- The quality floor checks above pass, including the 1:1 crops at deviceScaleFactor 3.

## Publishing (any static host, all free to start)

The site is one folder of static files, so it runs anywhere:
- **Netlify Drop** (drag the folder onto app.netlify.com/drop), **Cloudflare Pages**, **Vercel**, or **GitHub Pages** (push the folder, enable Pages).
- Locally: `npx http-server <folder>` (opening the HTML file directly may block image loading for WebGL in some browsers).
After publishing, open the live URL on a phone and a laptop and recheck the film and the form.
