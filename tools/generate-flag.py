#!/usr/bin/env python3
"""
Generates a 20-frame seamless animated waving Flag of Nepal.
Uses pycairo, Rsvg, and numpy to model a cloth wave with
specular crest lighting, dynamic fold foreshortening, and a flagpole.
"""

import math
import os
import subprocess
import numpy as np
import cairo
import gi

gi.require_version('Rsvg', '2.0')
from gi.repository import Rsvg

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(ROOT_DIR, "assets")
TMP_FRAMES_DIR = "/tmp/patro_flag_frames"

# Official SVG geometry of the Flag of Nepal (Constitution Schedule 1)
OFFICIAL_SVG = """<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" version="1.1" width="726" height="885" viewBox="-17.582 -4.664 71.571 87.246">
<use xlink:href="#a" stroke="#003893" stroke-width="5.165"/>
<path id="a" d="M -15,37.5735931288 h 60 L -15,0 v 80 h 60 L -15,20 z" fill="#DC143C"/>
<g fill="#fff">
  <path d="M -11.9502769431,23.4834957055 A 12.8400974233,12.8400974233 0 0,0 11.9502769431,23.4834957055 A 11.9502769431 11.9502769431 0 0,1 -11.9502769431,23.4834957055"/>
  <g transform="translate(0 29.045) scale(5.56106)">
    <circle r="1"/>
    <g id="d"><g id="c"><path id="b" d="M 0.195090322016,-0.980785280403 L 0,-1.388784109750 L -0.195090322016,-0.980785280403" transform="rotate(11.25)"/><use xlink:href="#b" transform="rotate(22.5)"/><use xlink:href="#b" transform="rotate(45)"/></g><use xlink:href="#c" transform="rotate(67.5)"/></g><use xlink:href="#d" transform="scale(-1 1)"/>
  </g>
  <g transform="matrix(8.1434 0 0 8.1434 0 58.787)">
    <circle r="1"/>
    <g id="g"><g id="f"><path id="e" d="M 0.258819045103,0.965925826289 L 0,1.576749285537 L -0.258819045103,0.965925826289"/><use xlink:href="#e" transform="rotate(180)"/></g><use xlink:href="#f" transform="rotate(90)"/></g><use xlink:href="#g" transform="rotate(30)"/><use xlink:href="#g" transform="rotate(60)"/>
  </g>
</g>
</svg>"""

def main():
    os.makedirs(ASSETS_DIR, exist_ok=True)
    os.makedirs(TMP_FRAMES_DIR, exist_ok=True)

    # 1. Render base flag at high resolution
    base_w, base_h = 512, 624
    base_surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, base_w, base_h)
    ctx = cairo.Context(base_surface)

    handle = Rsvg.Handle.new_from_data(OFFICIAL_SVG.encode("utf-8"))
    ctx.scale(base_w / 726.0, base_h / 885.0)
    handle.render_cairo(ctx)

    base_buf = np.frombuffer(base_surface.get_data(), dtype=np.uint8).reshape((base_h, base_w, 4)).copy()

    # Dimensions for frame supersampling (128x128)
    super_w, super_h = 128, 128

    pole_x = 16.0
    pole_w = 4.0
    flag_x = 20.0
    flag_w = 88.0
    flag_y = 16.0
    flag_h = 98.0

    num_frames = 20

    for frame_idx in range(num_frames):
        t = frame_idx / float(num_frames)
        out_surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, super_w, super_h)
        out_ctx = cairo.Context(out_surf)

        frame_img = np.zeros((super_h, super_w, 4), dtype=np.uint8)

        for oy in range(super_h):
            for ox in range(int(flag_x), super_w):
                u = (ox - flag_x) / flag_w
                if u < 0.0 or u > 1.15:
                    continue

                # Primary wave traveling along u
                phase = 2.0 * math.pi * (1.6 * u - t)

                # Vertical displacement
                amp_y = 7.5 * (u ** 1.25)
                dy = amp_y * math.sin(phase)

                # Secondary harmonic for flutter
                phase2 = 2.0 * math.pi * (2.6 * u - t * 1.3)
                dy += 2.2 * (u ** 2.0) * math.sin(phase2)

                # Horizontal fold compression
                comp_x = 3.5 * (u ** 1.4) * (0.5 - 0.5 * math.cos(phase))

                fx = (ox - flag_x + comp_x) / flag_w
                fy = (oy - flag_y - dy) / flag_h

                if 0.0 <= fx <= 1.0 and 0.0 <= fy <= 1.0:
                    bx = fx * (base_w - 1)
                    by = fy * (base_h - 1)

                    x0, y0 = int(bx), int(by)
                    x1, y1 = min(x0 + 1, base_w - 1), min(y0 + 1, base_h - 1)
                    wx, wy = bx - x0, by - y0

                    c00 = base_buf[y0, x0].astype(float)
                    c10 = base_buf[y0, x1].astype(float)
                    c01 = base_buf[y1, x0].astype(float)
                    c11 = base_buf[y1, x1].astype(float)

                    c0 = c00 * (1 - wx) + c10 * wx
                    c1 = c01 * (1 - wx) + c11 * wx
                    pixel = c0 * (1 - wy) + c1 * wy

                    if pixel[3] > 1.0:
                        # Lighting
                        slope = math.cos(phase)
                        light = 1.0 + 0.24 * (u ** 0.75) * slope
                        crest = max(0.0, math.sin(phase - 0.2)) ** 4
                        spec = 28.0 * (u ** 0.9) * crest

                        b = np.clip(pixel[0] * light + spec, 0, 255)
                        g = np.clip(pixel[1] * light + spec, 0, 255)
                        r = np.clip(pixel[2] * light + spec, 0, 255)

                        alpha = pixel[3] / 255.0
                        frame_img[oy, ox, 0] = int(b * alpha)
                        frame_img[oy, ox, 1] = int(g * alpha)
                        frame_img[oy, ox, 2] = int(r * alpha)
                        frame_img[oy, ox, 3] = int(pixel[3])

        raw_data = out_surf.get_data()
        raw_arr = np.frombuffer(raw_data, dtype=np.uint8).reshape((super_h, super_w, 4))
        np.copyto(raw_arr, frame_img)
        out_surf.mark_dirty()

        # Flagpole
        pole_pattern = cairo.LinearGradient(pole_x - pole_w/2, 0, pole_x + pole_w/2, 0)
        pole_pattern.add_color_stop_rgba(0.0, 0.40, 0.42, 0.46, 1.0)
        pole_pattern.add_color_stop_rgba(0.35, 0.88, 0.90, 0.94, 1.0)
        pole_pattern.add_color_stop_rgba(1.0, 0.32, 0.34, 0.38, 1.0)

        out_ctx.set_source(pole_pattern)
        out_ctx.rectangle(pole_x - pole_w/2, flag_y - 4, pole_w, flag_h + 16)
        out_ctx.fill()

        # Finial
        finial_y = flag_y - 6.0
        finial_rad = 6.0
        finial_pat = cairo.RadialGradient(pole_x - 1.8, finial_y - 1.8, 1.0, pole_x, finial_y, finial_rad)
        finial_pat.add_color_stop_rgba(0.0, 1.0, 0.96, 0.65, 1.0)
        finial_pat.add_color_stop_rgba(0.5, 0.92, 0.72, 0.15, 1.0)
        finial_pat.add_color_stop_rgba(1.0, 0.60, 0.42, 0.05, 1.0)
        out_ctx.set_source(finial_pat)
        out_ctx.arc(pole_x, finial_y, finial_rad, 0, 2 * math.pi)
        out_ctx.fill()

        # Attachment rings
        out_ctx.set_source_rgba(0.85, 0.88, 0.92, 0.9)
        out_ctx.set_line_width(1.8)
        out_ctx.arc(pole_x, flag_y + 3.0, 2.2, 0, 2 * math.pi)
        out_ctx.stroke()
        out_ctx.arc(pole_x, flag_y + flag_h - 2.0, 2.2, 0, 2 * math.pi)
        out_ctx.stroke()

        out_surf.write_to_png(os.path.join(TMP_FRAMES_DIR, f"super_{frame_idx:02d}.png"))

    webp_dest = os.path.join(ASSETS_DIR, "nepal_flag_waving.webp")
    gif_dest = os.path.join(ASSETS_DIR, "nepal_flag_waving.gif")

    subprocess.run([
        "ffmpeg", "-y", "-framerate", "20",
        "-i", os.path.join(TMP_FRAMES_DIR, "super_%02d.png"),
        "-vcodec", "libwebp", "-lossless", "1", "-loop", "0",
        webp_dest
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    subprocess.run([
        "ffmpeg", "-y", "-framerate", "20",
        "-i", os.path.join(TMP_FRAMES_DIR, "super_%02d.png"),
        "-vf", "split[s0][s1];[s0]palettegen=reserve_transparent=on[p];[s1][p]paletteuse=alpha_threshold=128",
        "-loop", "0",
        gif_dest
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    print("Generated:", webp_dest)
    print("Generated:", gif_dest)

if __name__ == "__main__":
    main()
