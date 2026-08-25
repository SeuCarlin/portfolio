# HENRIQUE MARQUES ART

Portfólio estático baseado no rascunho original publicado no Canva.

## Visualizar

Abra `index.html` diretamente no navegador ou use a extensão Live Server do VS Code.

## Conteúdo

- `assets/art`: fotos, ilustrações, textura e elementos visuais do portfólio original.
- `assets/gallery`: 140 imagens otimizadas e organizadas por categoria.
- O fundo animado é gerado proceduralmente por Canvas, sem vídeo ou serviço externo.
- `assets/mansalva.woff`: fonte manuscrita usada no rascunho.
- `index.html`: textos e ordem dos trabalhos.
- `gallery-data.js`: catálogo gerado com categorias, projetos e títulos.
- `styles.css`: composição, responsividade e animações.
- `script.js`: entrada dos elementos e visualização ampliada das artes.

## Atualizar a galeria

Depois de alterar `D:\NECESSARIOS\ARTES`, execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\import-gallery.ps1
```
