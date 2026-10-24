#!/usr/bin/env python3
"""Stamp the pinned GSAP script tag (with its integrity hash) into every scene that has the <!--GSAP--> marker.
Not needed to run the scenes; only used while authoring them."""
import glob, re, sys
SRI = "sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt"  # gsap 3.12.5 on cdnjs
TAG = f'<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" integrity="{SRI}" crossorigin="anonymous"></script>'
for f in sorted(glob.glob("[0-9][0-9]-*.html")):
    s = open(f).read()
    if "<!--GSAP-->" in s:
        open(f, "w").write(s.replace("<!--GSAP-->", TAG)); print("stamped", f)
