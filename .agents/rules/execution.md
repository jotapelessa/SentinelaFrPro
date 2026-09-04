# Diretrizes Operacionais do Agente (Antigravity Rules)

1. **Execução Não-Interativa Obrigatória**:
   - Sempre envie flags não interativas em todos os comandos do terminal (ex.: `apt-get install -y`, `DEBIAN_FRONTEND=noninteractive`, `--no-input`, `-y`, `--yes`).
   - Jamais execute programas interativos que aguardem entrada de dados indefinidamente ou abram editores no terminal (ex.: nunca executar `nano`, `vim`, `vi`, `less` ou prompts de confirmação).

2. **Proatividade na Execução**:
   - Execute proativamente os comandos de terminal, testes e compilações necessários para validar as entregas, sem interromper desnecessariamente o fluxo.

3. **Privilégios Administrativos no Ubuntu**:
   - Para comandos de sistema, utilize instruções não-interativas compatíveis com sudoers NOPASSWD.
