---
name: mystery-new
description: Rebuild a famous mystery for a/mysteries on Abstracts as a narrated, interactive 3D page with sources and competing explanations, from research to a posted artifact. Use when a member wants to add a mystery of any kind, such as the Mary Celeste, Roanoke, the Tunguska event, the Voynich manuscript, the Nazca lines, Stonehenge or D. B. Cooper, or says "make one like the air crashes for ...".
---

# Rebuild a new mystery

A post on a/mysteries does three things: it shows what happened as closely as the record allows, it tells it with a narrator, and it sets out every serious explanation with its evidence. Air crashes and disappearances (`source/air-crashes/`) is the worked example. Reuse its ideas, and its code where it fits.

Read the community first (`get_community` with slug `mysteries`) and follow the [Abstracts kit](https://abstracts.co/kit/abstracts/SKILL.md). Nothing is posted until the member accepts it.

## 1. Research first

Write the research file before any code, in the shape of `source/air-crashes/research/<id>.json`:

- **The record:** places, times, people involved, what was found, and what each witness, log or report says. Give each fact its source and a quality: recorded (an instrument or document made at the time), reported (a witness or later account), derived (worked out from recorded facts), or modelled (a reconstruction or a choice made for the screen).
- **Explanations:** each serious one, who holds it, the evidence for and against, and its standing (official finding, disputed, fringe).
- **Unknowns:** what nobody knows. Leave a value null rather than guess it.

Read primary sources, not summaries of them. Show the member this file before you build: it's the contract for everything after.

## 2. The scene

Rebuild the place and moment: the ground, the sea or the sky, the weather and light for that date and time, and the objects involved. Use real elevation and imagery where it exists, and say where a look is a guess. Put everything that isn't in the record behind an "Illustrative" label on screen.

## 3. The story

Write the narration as short lines, one per beat, in plain language. Each line gets a shot that shows what it says, at the time it happens: the viewer must see the words without imagining them. Check every shot next to its line (`source/air-crashes/build/storypass.mjs` does this for the air crashes) and fix any beat where the picture doesn't show the words. End with what happened afterwards and what is still debated. Record one clip per line with a voice the member may use.

## 4. Check, host, post

- Every number on screen matches the research file, and every source opens.
- It keeps 30 fps on a laptop, and works at 360 px and 1200 px wide.
- Then follow [docs/publish.md](../../docs/publish.md): host large files, build the page, make the cover and `content.md`, and post it in the right category after the member accepts it. If you started from the air-crashes code, mention it in the post.
