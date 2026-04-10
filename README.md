# WanderPet 🐾 - Seu Ecossistema de Aventuras

Bem-vindo ao **WanderPet**, um rastreador de expedições gamificado onde cada passo que você dá fortalece o seu pet e te conecta a uma comunidade de exploradores!

O projeto é construído com **React Native + Expo**, focado em performance e uma experiência visual vibrante (Dark/Light Mode).

---

## 🚀 Como Começar (Para novos Exploradores/Devs)

Se você caiu de paraquedas no projeto, siga estes passos para rodar o app localmente:

1. **Clonar e Instalar**:
   ```bash
   git clone https://github.com/gustavogarciacavalli-sudo/pet-map-app.git
   cd pet-map-app
   npm install
   ```

2. **Iniciar o Motor**:
   ```bash
   npx expo start
   ```
   *Escaneie o QR Code com o app **Expo Go** no seu celular para ver a mágica acontecer.*

---

## 🎮 Mecânicas Atuais (O que já temos)

### 🗺️ Diário de Expedição
- **Rastreamento em Tempo Real**: Captura sua localização e calcula distância percorrida.
- **Histórico Diário**: A Database separa trajetos em "baldes diários" (`YYYY-MM-DD`).
- **Interactive Replay**: No Perfil, clique nas barras do gráfico semanal para abrir o mapa e ver o rastro exato (Polyline) de onde você andou naquele dia.

### 🛡️ Sistema de Clãs (Social)
- **Fundação de Grupos**: Crie seu próprio clã e chame seus amigos.
- **Gestão Local**: Persistência via `AsyncStorage` com suporte a múltiplos membros.

### 🧙 Perfil Gamificado
- **Customização**: Troca de avatares (Pets) e suporte a fotos externas (PNG).
- **Progressão**: Ganho de moedas (PetCoins) e XP baseado na distância percorrida.
- **Wander-ID**: Sistema de identificação única para adicionar amigos.

---

## 🛠️ Tech Stack
- **Framework**: [Expo](https://expo.dev/) (SDK 54+)
- **Nativo**: React Native + Reanimated (Animações 60fps)
- **Maps**: React Native Maps (Google Maps / OSM)
- **Store**: AsyncStorage (Persistência Local leve)

---

## 🧭 Mural de Missões (O que vem por aí!)

Aqui estão as próximas tarefas para quem quiser contribuir:

- [ ] **Chat de Clã**: Sistema básico de mensagens rápidas entre membros do grupo.
- [ ] **Loja de Itens**: Comprar acessórios (chapéu, capas) usando PetCoins.
- [ ] **Missões Diárias**: Desafios como "Caminhe 2km hoje" para bônus de XP.
- [ ] **Notificações**: Alertas sobre conquistas de amigos e convites de clãs.
- [ ] **Exportação de Rota**: Salvar o trajeto do dia como uma imagem para compartilhar.

---

## 🧪 Notas de Dev (Modo de Teste)
Vá em **Perfil > Configurações** e use o botão **"🧪 DEV: Gerar Memórias Fake"** para popular o gráfico e testar o sistema de mapas sem precisar sair de casa.

---

*Desenvolvido com ❤️ pela equipe WanderPet.*
