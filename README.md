# WanderPet 🐾 - Social Pet Adventure

WanderPet é uma plataforma de aventura gamificada onde o mundo real se torna um tabuleiro. Explore, capture tesouros, entre em clãs e interaja com outros exploradores em tempo real.

---

## 🌟 Ideia Geral
O projeto nasceu para unir a exploração física (GPS) com mecânicas de RPG social. O foco atual é a **estabilidade extrema** e uma interface **Ultra Premium**, garantindo que o app rode suavemente tanto em dispositivos de ponta quanto em modelos de entrada via Expo Go.

> [!IMPORTANT]
> **ESTABILIDADE ALCANÇADA**: Esta versão foi totalmente refatorada para remover a biblioteca `react-native-reanimated`. Isso elimina qualquer crash de módulo nativo (`TurboModule`, `NullPointerException`) e garante 100% de compatibilidade com o **Expo Go (SDK 54)**.

---

## 🏗️ Arquitetura & Motores

### ☁️ Backend (Supabase)
Utilizamos o **Supabase** como nossa espinha dorsal para:
- **Autenticação**: Login seguro e verificação em duas etapas (2FA).
- **Realtime Database**: Sincronização de localização e mensagens instantâneas.
- **Storage**: Armazenamento de avatares e itens.
- **SQL Engine**: PostgreSQL para relacionamentos complexos entre usuários, clãs e conquistas.

### 🗺️ Motor de Mapa (MapLibre GL)
Diferente de soluções pesadas, usamos o **MapLibre** para garantir:
- Renderização de mapas vetoriais em 60 FPS.
- Câmera 3D imersiva com baixa latência.
- Markers customizados sem dependências nativas instáveis.

### 🎨 Design System
- **Vanilla CSS-in-JS**: Estilização performática e totalmente parametrizada.
- **Aesthetic**: Design moderno com cores vibrantes e micro-animações nativas.

---

## 🚀 Guia para Novos Desenvolvedores (Onboarding)

Caiu de paraquedas? Siga estes passos para começar em 5 minutos:

### 1. Setup Inicial
```bash
# Clone o repositório
git clone https://github.com/gustavogarciacavalli-sudo/pet-map-app.git
cd pet-map-app

# Instale as dependências
npm install
```

### 2. Configuração de Ambiente
1. Certifique-se de configurar as chaves do Supabase em `services/supabaseConfig.ts`.
2. Para o banco de dados, execute o script SQL contido na seção "Configuração SQL" abaixo no seu editor do Supabase.

### 3. Rodando o Projeto
```bash
# Para development build ou Expo Go (Recomendado)
npx expo start -c

# Para Android Nativo
npx react-native run-android

# Para iOS Nativo
npx react-native run-ios
```

---

## 🌿 Regras de Colaboração (Git Flow)

Para manter a sanidade do projeto, seguimos estas regras:

- **Branch Principal**: `develop` (Tudo o que está pronto para teste).
- **Novas Tarefas**: Crie branches a partir da `develop` com o padrão `feature/nome-da-tarefa`.
- **Commits**: Use mensagens semânticas (Ex: `feat: adiciona mapa`, `fix: corrige login`).

### Fluxo Diário:
1. `git checkout develop` -> `git pull origin develop`
2. `git checkout -b feature/minha-tarefa`
3. Codar e Commitar: `git add .` -> `git commit -m "sua mensagem"`
4. `git push origin feature/minha-tarefa`
5. Abrir Pull Request: Una sua branch com a `develop` no GitHub.

---

## 🛠️ Log de Atualizações (Recent Updates)

### [24/04/2026] - Refinamento de UX & Navegação Premium
- **Navegação Fluida**: Adição de botões "Voltar" (`arrow-back`) em todas as telas secundárias (**Loja**, **Missões**, **Social**), eliminando becos sem saída na navegação.
- **Mochila 2.0**:
    - Novo ícone de acesso (`bag-handle-outline`) no HUD.
    - Modal revitalizado com header informativo e botão de fechar dedicado.
    - Implementação de *Dismiss on Backdrop Tap* (fechar ao tocar fora).
- **Acessibilidade Mobile**:
    - Ajuste de área de toque (`SHEET_MIN`) no Bottom Sheet para compatibilidade total com gestos de iPhone.
    - Implementação de Scroll Horizontal nos botões de ação do mapa para evitar cortes de interface em telas pequenas.
- **Estabilidade Visual**:
    - Correção de mapeamento de ícones (Ionicons/MaterialCommunityIcons).
    - Otimização de cache do Expo para carregamento instantâneo de assets.

---

## 📋 Lista de Tarefas (Roadmap de Verificação)

- [ ] Verificar se foto de perfil continua no banco de dados
- [ ] Verificar integridade do Wander-ID
- [ ] Verificar rastreamento de local atual (GPS Throttling)
- [ ] Verificar banco de dados: Expedição da Semana
- [ ] Verificar permanência de moedas e EXP (Cloud Sync)
- [ ] Verificar evolução de medalhas e permanência de missões
- [x] Arrumar imagem do Modo Fantasma (Ícone 3D Premium)
- [ ] Verificar sistema de alterar senha e 2FA
- [ ] Implementar/Colocar bots para testar amigos
- [ ] Implementar Teia Wander (Social Graph)
- [ ] Implementar Inbox (Sistema de Mensagens Diretas)

---

## ⚙️ Configuração SQL (Supabase)

Execute este esquema no SQL Editor do Supabase:

```sql
-- Profiles, Groups, Messages e Locations
-- (Referência rápida, o script completo está em supabase_setup.sql)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  wander_id TEXT UNIQUE,
  avatar TEXT,
  species TEXT DEFAULT 'bunny',
  coins INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  two_factor_pin TEXT,
  security_question TEXT,
  security_answer TEXT,
  claimed_quests TEXT[] DEFAULT '{}'::TEXT[]
);
```

---
*Desenvolvido com ❤️ pela equipe WanderPet. Estabilidade em primeiro lugar.*
