## STATE.md (Memória Persistente)

O arquivo `STATE.md` na raiz do projeto é a memória contínua e persistente entre sessões.

Regras:
- No início de qualquer sessão ou tarefa complexa, consulte `STATE.md` para entender a visão do projeto, o histórico recente e o estado das features.
- Ao concluir modificações significativas, novas especificações via `onp-spec` ou decisões arquiteturais, atualize o `STATE.md` refletindo o novo status do ecossistema.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
