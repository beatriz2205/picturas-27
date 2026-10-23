"""Modelo de domínio v4: acrescenta a Ferramenta de velocidade (UC-VID-006) ao v3 aprovado, a nota
da RNG-01 na associação "upload" e o nome "Ficheiro de multimédia".

Parte de modelo_dominio_v3_base.svg (cópia do ~/Downloads/modelo_dominio_v3.svg) e só acrescenta: a
caixa fica numa segunda fila, por baixo da Ferramenta de recorte, ligada à barra de generalização da
Ferramenta de vídeo (não há espaço na primeira fila: entre conversão e filtros passa o "usa" da Tarefa).
Uso: PYTHONPATH=<cairosvg> python3 gerar_v4.py → modelo_dominio_v4.svg e .png
"""
from pathlib import Path

HERE = Path(__file__).parent
INK, NEW = "#1A1A1A", "#5BCDF8"
svg = (HERE / "modelo_dominio_v3_base.svg").read_text(encoding="utf-8")

x, y, w = 780, 430, 190
parts = [
    f'<rect x="{x}" y="{y}" width="{w}" height="40" fill="{NEW}" stroke="{INK}" stroke-width="1"/>',
    f'<line x1="{x}" y1="{y + 24}" x2="{x + w}" y2="{y + 24}" stroke="{INK}" stroke-width="1"/>',
    f'<text x="{x + w / 2}" y="{y + 16}" font-size="11.5" text-anchor="middle" fill="{INK}" font-weight="bold">Ferramenta de velocidade</text>',
    # barra de generalização prolongada para a esquerda e descida até à nova caixa
    f'<polyline points="860.0,345.0 770.0,345.0 770.0,{y + 12} {x},{y + 12}" fill="none" stroke="{INK}" stroke-width="1"/>',
]
# Nota UML na associação "upload": o Anónimo herda-a do Utilizador, mas só carrega imagens (RNG-01)
nx, ny, nw, nh = 30, 396, 262, 44
parts += [
    f'<path d="M{nx},{ny} H{nx + nw - 12} L{nx + nw},{ny + 12} V{ny + nh} H{nx} Z" fill="{NEW}" stroke="{INK}" stroke-width="1"/>',
    f'<path d="M{nx + nw - 12},{ny} V{ny + 12} H{nx + nw}" fill="none" stroke="{INK}" stroke-width="1"/>',
    f'<text x="{nx + 8}" y="{ny + 17}" font-size="10.5" fill="{INK}">{{o Anónimo só carrega Imagem; o Vídeo</text>',
    f'<text x="{nx + 8}" y="{ny + 32}" font-size="10.5" fill="{INK}">exige Utilizador registado (RNG-01)}}</text>',
    f'<line x1="{nx + nw}" y1="{ny + 24}" x2="500" y2="{ny + 24}" stroke="{INK}" stroke-width="1" stroke-dasharray="5,4"/>',
]
svg = svg.replace("Ficheiro de média", "Ficheiro de multimédia")
svg = svg.replace("</svg>", "\n".join(parts) + "\n</svg>")
(HERE / "modelo_dominio_v4.svg").write_text(svg, encoding="utf-8")
import cairosvg

cairosvg.svg2png(bytestring=svg.encode(), write_to=str(HERE / "modelo_dominio_v4.png"), output_width=2567)
print("gerados: modelo_dominio_v4.svg e .png")
