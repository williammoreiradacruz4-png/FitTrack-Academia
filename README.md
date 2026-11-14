# FitTrack Academia (PWA)

Ficha de treino interativa para academia desenvolvida com React, TypeScript, Tailwind CSS e `vite-plugin-pwa`, com funcionamento offline, cronômetro de descanso, controle de carga (`kg`) e upload de imagens por exercício.

## Recursos

- **PWA Instalável**: Manifesto configurado (`standalone`), ícones otimizados (`192×192`, `512×512`, `maskable` e `apple-touch-icon`), registro automático de Service Worker e suporte offline.
- **Gestão de Treino**: Busca em tempo real, filtro por grupo muscular (`Peito`, `Costas`, `Pernas`, `Ombros`, `Bíceps`, `Tríceps`, `Abdômen`), marcação de exercícios concluídos e botão para zerar marcações com desfazer.
- **Controle de Cargas e Fotos**: Ajuste rápido de carga em `kg` (`-2.5` / `+2.5` ou digitação direta) e upload de foto por exercício com compressão local em `localStorage`.
- **Cronômetro de Descanso**: Temporizador integrado (`60s`, `90s`, `120s`) com alerta sonoro ao término.

## Desenvolvimento Local

```bash
npm install
npm run dev
```

Para gerar o build de produção e validar a tipagem:

```bash
npm run lint
npm run build
```

## Publicar no GitHub

```bash
git init
git add .
git commit -m "feat: FitTrack Academia PWA"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/fittrack-academia.git
git push -u origin main
```

## Deploy no Netlify

O repositório já inclui o arquivo `netlify.toml` configurado com:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node.js**: `20`
- **Headers PWA**: revalidação imediata de `/sw.js`, `/registerSW.js` e `/manifest.webmanifest`
- **Fallback SPA**: redirecionamento `/* -> /index.html` (`200`)

### Opção 1: Via GitHub + Painel do Netlify (Recomendado)

1. Acesse [app.netlify.com](https://app.netlify.com) e clique em **Add new site > Import an existing project**.
2. Conecte sua conta do **GitHub** e selecione o repositório.
3. Confirme as configurações detectadas automaticamente pelo `netlify.toml` (`npm run build` e pasta `dist`) e clique em **Deploy site**.

### Opção 2: Via Netlify CLI

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```
