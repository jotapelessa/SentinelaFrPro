## STATE.md (Memória Persistente)

O arquivo `STATE.md` na raiz do projeto é a memória contínua e persistente entre sessões.

Regras:
- No início de qualquer sessão ou tarefa complexa, consulte `STATE.md` para entender a visão do projeto, o histórico recente e o estado das features.
- Ao concluir modificações significativas, novas especificações via `onp-spec` ou decisões arquiteturais, atualize o `STATE.md` refletindo o novo status do ecossistema.

## 🔒 Regras de Ouro Inegociáveis de Streaming & PiP (NUNCA QUEBRAR)
1. **Idempotência de Stream no PiP (`OverlayService.kt`)**: NUNCA chamar `loadUrl()` ou recarregar o WebView se o PiP já estiver ativo para a mesma câmera (`activePipCamera`). Apenas estenda o timer de auto-dismiss. Recarregar o stream em rajadas de eventos corrompe a conexão WebSocket e trava o decoder MediaCodec.
2. **Watchdog Suave de Live-Edge**: NUNCA usar `currentTime = end - 0.05` ou seeks forçados em streams ao vivo. Use SEMPRE aceleração dinâmica via `playbackRate` (1.08x a 1.15x).
3. **Padrão MSE sobre WebSocket**: NUNCA forçar WebRTC puro sem fallback. O modo padrão de streaming em todos os clientes Android é `mse` (TCP WebSocket), garantindo passagem fluida por proxies reversos e Tailscale.
4. **Zero-Cache em Documentos Web**: No Nginx e Next.js, as rotas raiz de HTML (`/`) NUNCA devem ter cache público ou ETags (`no-store, no-cache, must-revalidate, max-age=0` e `etag off;`).
5. **Desacoplamento Assíncrono de Cast**: Google Cast (porta 8009) NUNCA deve bloquear a API síncrona nem ser disparado se a TV já estiver conectada via WebSocket ao app Sentinela.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
