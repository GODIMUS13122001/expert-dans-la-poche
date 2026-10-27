"""Application de bureau « L'expert dans la poche » : le serveur local + une fenêtre native macOS.

Lancée par « L'expert dans la poche.app ». L'interface tourne sur l'ordinateur (http://127.0.0.1:5173)
et s'affiche dans sa propre fenêtre, pas dans le navigateur. Si le serveur tourne déjà, la fenêtre s'y connecte.
"""
from __future__ import annotations

import atexit
import socket
import subprocess
import time
from pathlib import Path

import webview

MVP = Path(__file__).resolve().parent.parent
PORT = 5173
URL = f"http://127.0.0.1:{PORT}"
ICONE = MVP.parent / "Icône - L'expert dans la poche.png"
JOURNAL = Path.home() / "Library" / "Logs" / "L'expert dans la poche.log"


def port_occupe() -> bool:
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", PORT)) == 0


def demarrer_serveur():
    if not (MVP / "dist" / "index.html").exists():
        subprocess.run(["npx", "vite", "build"], cwd=MVP, stdout=JOURNAL.open("a"), stderr=subprocess.STDOUT)
    proc = subprocess.Popen(["node", "server/index.js"], cwd=MVP, stdout=JOURNAL.open("a"), stderr=subprocess.STDOUT)
    atexit.register(proc.terminate)  # le serveur s'arrête avec la fenêtre
    for _ in range(60):
        if port_occupe():
            return
        time.sleep(0.25)


def icone_dock():
    """Nom et icône de l'appli dans le Dock (sinon macOS affiche « Python »)."""
    try:
        from AppKit import NSApplication, NSImage
        from Foundation import NSBundle
        NSBundle.mainBundle().infoDictionary()["CFBundleName"] = "L'expert dans la poche"
        if ICONE.exists():
            NSApplication.sharedApplication().setApplicationIconImage_(NSImage.alloc().initWithContentsOfFile_(str(ICONE)))
    except Exception:
        pass


if __name__ == "__main__":
    if not port_occupe():
        demarrer_serveur()
    webview.create_window("L'expert dans la poche", URL, width=1280, height=880, min_size=(390, 700),
                          background_color="#FAF9F6", text_select=True)
    webview.start(icone_dock)
