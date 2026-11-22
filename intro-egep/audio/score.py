# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Indicatif JT spécial « États généraux de l'Élevage et de la Pêche » : 20 s, 120 BPM, ré mineur.

Kora (Karplus-Strong, pentatonique de ré mineur) + djembé (basse / tonique / claqué) + nappe de cordes,
basse, puis montée et coup final sur le logo (b32). Tout est synthétisé : aucun échantillon tiers.

    MOTION_REEL_SKILL=<skill> uv run intro-egep/audio/score.py

Écrit audio/music.wav et beats.json (grille mesurée sur les percussions + kora).
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal


def _skill_dir():
    if os.environ.get("MOTION_REEL_SKILL"):
        return Path(os.environ["MOTION_REEL_SKILL"])
    user = Path.home() / ".claude/skills/motion-reel"
    if (user / "scripts/dsp.py").exists():
        return user
    found = sorted((Path.home() / ".claude/plugins").glob("**/skills/motion-reel/scripts/dsp.py"))
    if found:
        return found[-1].parent.parent
    sys.exit("motion-reel introuvable : définir MOTION_REEL_SKILL")


SKILL = _skill_dir()
sys.path.insert(0, str(SKILL / "scripts"))
from dsp import *  # noqa: E402,F403

HERE = Path(__file__).resolve().parent
FILM = HERE.parent
BPM = 120
BEAT = 60 / BPM
DUR = 20.0
N = int(SR * DUR)
seed(20261123)


def T(b):
    return b * BEAT


# ---------------------------------------------------------------- instruments

def kora(note, length=1.1, bright=0.72):
    """Harpe-luth mandingue : corde pincée claire, très peu de buzz, attaque du pouce."""
    x = ks_pluck(hz(note), length, bright=bright, buzz=0.06)
    x = peq(x, 2600, 3.0, 0.9)
    return x * 0.9


def djembe(kind="tone", gain=1.0):
    n = int(0.5 * SR)
    t = tvec(n)
    if kind == "bass":
        f = 72 + 40 * np.exp(-t / 0.03)
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
        x += filt(rng.standard_normal(n) * np.exp(-t / 0.004), "lowpass", 600) * 0.5
    elif kind == "tone":
        f = 330 * (1 + 0.04 * np.exp(-t / 0.01))
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
        x += 0.45 * np.sin(2 * np.pi * np.cumsum(f * 1.59) / SR) * np.exp(-t / 0.05)
        x += filt(rng.standard_normal(n) * np.exp(-t / 0.005), "bandpass", [500, 3000]) * 0.35
    else:  # slap : claqué sec et brillant
        x = filt(rng.standard_normal(n), "bandpass", [900, 6000]) * np.exp(-t / 0.035)
        x += 0.5 * np.sin(2 * np.pi * 620 * t) * np.exp(-t / 0.03)
    return np.tanh(1.5 * x) * gain * (1 - np.exp(-t / 0.0006))


def shaker(gain=1.0):
    n = int(0.09 * SR)
    t = tvec(n)
    x = filt(rng.standard_normal(n), "bandpass", [4500, 11000]) * (t / 0.012) ** 1.2 * np.exp(-t / 0.02)
    return x * gain


def boom(length=2.4):
    """Coup de grosse caisse de cinéma : kick + sub + corps grave."""
    k = kick()
    s = sub_drop(length, 80, 32)
    n = max(len(k), len(s))
    out = np.zeros(n)
    out[: len(k)] += k
    out[: len(s)] += s * 0.9
    return out


# ---------------------------------------------------------------- harmonie

CHORDS = [  # (beat de départ, accord de nappe, basse)
    (0, ["D3", "A3", "F4"], "D2"),
    (8, ["D3", "A3", "F4"], "D2"),
    (12, ["Bb2", "F3", "D4"], "Bb1"),
    (16, ["D3", "A3", "F4"], "D2"),
    (20, ["C3", "G3", "E4"], "C2"),
    (22, ["Bb2", "F3", "D4"], "Bb1"),
    (26, ["C3", "G3", "E4"], "C2"),
    (28, ["A2", "E3", "C#4"], "A1"),
    (32, ["D3", "A3", "F4", "D5"], "D2"),
]


def chord_at(b):
    cur = CHORDS[0]
    for c in CHORDS:
        if b >= c[0]:
            cur = c
    return cur


# Kora : motif de 8 croches sur la pentatonique (ré fa sol la do), transposé suivant l'accord
KORA_FIG = {
    "D": ["D4", "A4", "D5", "F5", "A5", "F5", "D5", "A4"],
    "Bb": ["D4", "F4", "Bb4", "D5", "F5", "D5", "Bb4", "F4"],
    "C": ["C4", "G4", "C5", "E5", "G5", "E5", "C5", "G4"],
    "A": ["A3", "E4", "A4", "C#5", "E5", "C#5", "A4", "E4"],
}


def main():
    drums, perc, music, bass, fx = (Bus(DUR, BPM) for _ in range(5))

    # ---- nappe de cordes, un accord par section, filtre qui s'ouvre
    for i, (b, notes, _) in enumerate(CHORDS):
        b1 = CHORDS[i + 1][0] if i + 1 < len(CHORDS) else 40
        length = T(b1 - b) + 0.4
        cut = (350, 1600) if b == 0 else ((1400, 4200) if b == 28 else (1800, 2400))
        if b == 32:
            length, cut = T(8.5), (3800, 900)
        music.add(pad_chord(notes, length, cut, attack=0.9 if b == 0 else 0.05, release=0.4), b,
                  0.55 if b in (0, 32) else 0.38)

    # ---- kora : croches dès le début, plus dense au groove
    for e in range(0, 64):          # croches b0..b32
        b = e / 2
        name = chord_at(b)[1][0][:-1]
        fig = KORA_FIG.get(name[:2] if name.startswith("Bb") else name[0], KORA_FIG["D"])
        nt = fig[e % 8]
        vel = 0.5 + 0.25 * (e % 2 == 0) + (0.15 if b >= 8 else 0)
        if b < 2 and e % 2:         # entrée plus clairsemée
            continue
        music.add(kora(nt, 0.9), b, 0.32 * vel, pan=0.28 * np.sin(e * 0.7))
    # descente de kora sur le logo
    for i, nt in enumerate(["D6", "A5", "F5", "D5", "A4", "F4", "D4"]):
        music.add(kora(nt, 1.6, 0.8), 32 + i * 0.25, 0.42 - i * 0.03, pan=0.3 - i * 0.1)
    music.add(kora("D3", 2.5, 0.5), 32, 0.5)

    # ---- basse
    for b2 in range(16, 64):        # croches b8..b32
        b = b2 / 2
        root = chord_at(b)[2]
        if b2 % 4 == 3:
            continue
        nt = root if b2 % 2 == 0 else root[:-1] + str(int(root[-1]) + 1)
        bass.add(bass_note(nt, BEAT / 2 * 0.8, 800 if b < 28 else 1400), b, 0.55 if b2 % 2 == 0 else 0.38)
    bass.add(bass_note("D1", T(6), 500), 32, 0.75)

    # ---- percussions
    # intro : toniques douces sur les temps forts, shaker qui s'installe
    for b in (0, 2, 4, 6):
        perc.add(djembe("bass", 0.8), b, 0.6)
    for b in np.arange(4, 8, 0.25):
        drums.add(shaker(), b, 0.10 + 0.06 * (b - 4) / 4, pan=0.25)
    # appel de djembé vers le groove (b6.5 -> b8)
    for b in (6.5, 6.75, 7.0, 7.25, 7.5, 7.75):
        perc.add(djembe("slap"), b, 0.35 + 0.08 * (b - 6.5), pan=-0.15)
    # groove b8..b28 : grosse caisse sur 1 et 3, djembé (basse-tonique-claqué), shaker en doubles
    pattern = {0: "bass", 0.5: "tone", 0.75: "tone", 1.5: "slap", 2: "bass", 2.75: "slap", 3: "tone", 3.5: "slap"}
    for bar in range(8, 28, 4):
        for off, kind in pattern.items():
            b = bar + off
            if b >= 28:
                continue
            perc.add(djembe(kind), b, {"bass": 0.7, "tone": 0.45, "slap": 0.4}[kind], pan=-0.2 if kind == "slap" else 0.1)
        for k in (0, 2):
            drums.add(kick(), bar + k, 0.75)
        for s in np.arange(0, 4, 0.25):
            drums.add(shaker(), bar + s, 0.09 if (s * 4) % 2 else 0.13, pan=0.3)
    # montée b28..b32 : claqués en doubles croches qui accélèrent, grosse caisse en croches
    for i, b in enumerate(np.arange(28, 32, 0.25)):
        perc.add(djembe("slap"), b, 0.25 + 0.3 * i / 16, pan=(-1) ** i * 0.2)
    for b in np.arange(30, 32, 0.125):
        perc.add(djembe("tone"), b, 0.15 + 0.2 * (b - 30) / 2)
    for b in np.arange(28, 32, 0.5):
        drums.add(kick(), b, 0.55 + 0.1 * (b - 28) / 4)
    fx.add(riser(T(4)), 28, 0.35)
    # coups de presse (b16, b22) et le grand coup final (b32) : le cœur de la grammaire JT
    for b, g in ((16, 0.65), (22, 0.6)):
        drums.add(boom(1.4), b, g)
        drums.add(crash(1.8), b, 0.16)
    drums.add(boom(3.0), 32, 0.95)
    drums.add(crash(3.2), 32, 0.25)
    perc.add(djembe("bass"), 36, 0.6)

    # ---- bus, réverbe, écrasement du pad par la grosse caisse
    kick_t = [T(b) for b in list(range(8, 28, 2)) + list(np.arange(28, 32, 0.5))]
    pump = sidechain(kick_t, bass.x.shape[1], 0.35, 0.12)
    ir = reverb_ir(2.2, 0.55)
    wet_src = music.x * 0.5 + perc.x * 0.15 + drums.x * 0.06
    wet = np.stack([signal.fftconvolve(wet_src[c], ir[c])[: wet_src.shape[1]] for c in range(2)])
    bed = drums.x * 0.9 + perc.x * 0.85 + bass.x * pump * 0.75 + music.x * pump * 0.8 + fx.x * 0.6 + wet * 0.35
    bed = np.stack([filt(ch, "highpass", 26) for ch in bed])[:, :N]
    bed /= np.abs(bed).max() + 1e-9
    bed *= 0.5
    fade = int(1.2 * SR)
    bed[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
    sf.write(HERE / "music.wav", bed.T, SR, subtype="PCM_24")

    grid_src = (drums.x + perc.x + music.x * 0.4)[:, :N].mean(axis=0)
    grid = measure_beats(grid_src, SR, BPM, n_beats=41)
    grid.update({"designed_bpm": BPM, "downbeats": grid["beats"][::4],
                 "sections": {"aube": [0, 6], "epervier": [6, 11], "zebus": [11, 16], "president": [16, 22],
                              "ministre": [22, 28], "montee": [28, 32], "logo": [32, 40]},
                 "source": "intro-egep/audio/score.py, percussions + kora, librosa + ajustement linéaire"})
    (FILM / "beats.json").write_text(json.dumps(grid, indent=1))
    print(f"beats: {grid['bpm']} bpm, offset {grid['offset'] * 1000:.1f} ms, "
          f"{grid['fit_inliers']}/{len(grid['detected'])} inliers, fit rms {grid['fit_residual_ms']} ms")


if __name__ == "__main__":
    main()
