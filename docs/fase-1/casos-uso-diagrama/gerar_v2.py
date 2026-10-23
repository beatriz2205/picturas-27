"""Diagrama de casos de uso v2: acrescenta o UC-VID-006 (alterar a velocidade) ao diagrama aprovado.

Parte de diagrama_casos_uso_base.svg e não mexe no resto: tela e caixa do sistema 90 px mais altas,
nova elipse azul por baixo do UC-VID-005, associação ao Utilizador e nota de pré-condição até ao 006.
Uso: PYTHONPATH=<cairosvg> python3 gerar_v2.py → diagrama_casos_uso_v2.svg e .png
"""
from pathlib import Path

HERE = Path(__file__).parent
svg = (HERE / "diagrama_casos_uso_base.svg").read_text(encoding="utf-8")


def swap(old, new):
    global svg
    assert svg.count(old) == 1, old
    svg = svg.replace(old, new)


swap('width="1400" height="1000" viewBox="0 0 1400 1000"', 'width="1400" height="1090" viewBox="0 0 1400 1090"')
swap('<rect width="1400" height="1000" fill="white"/>', '<rect width="1400" height="1090" fill="white"/>')
swap('<rect x="465" y="20" width="620" height="960"', '<rect x="465" y="20" width="620" height="1050"')
swap(">UC-VID-002 a UC-VID-005</text>", ">UC-VID-002 a UC-VID-006</text>")

new = [
    '<ellipse cx="775" cy="1010" rx="205" ry="30" fill="#5BCDF8" stroke="#1A1A1A" stroke-width="1.1"/>',
    '<text x="775" y="1006.7" font-size="12" text-anchor="middle" fill="#1A1A1A" font-style="normal">UC-VID-006</text>',
    '<text x="775" y="1021.7" font-size="12" text-anchor="middle" fill="#1A1A1A" font-style="normal">Alterar a velocidade de um vídeo</text>',
    '<line x1="324" y1="453" x2="570" y2="1010" stroke="#1A1A1A" stroke-width="1.1"/>',
]
svg = svg.replace("</svg>", "\n".join(new) + "\n</svg>")

(HERE / "diagrama_casos_uso_v2.svg").write_text(svg, encoding="utf-8")
import cairosvg

cairosvg.svg2png(bytestring=svg.encode(), write_to=str(HERE / "diagrama_casos_uso_v2.png"), output_width=2139)
print("gerados: diagrama_casos_uso_v2.svg e .png")
